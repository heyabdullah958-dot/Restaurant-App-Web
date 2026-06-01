import uuid
import secrets
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import UserSerializer, UserRegisterSerializer, LoyaltyTransactionSerializer, CustomTokenObtainPairSerializer
from .models import LoyaltyTransaction
from config.throttles import GuestAuthThrottle
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    # Inject custom claims
    refresh['username'] = user.username
    refresh['is_staff'] = user.is_staff
    refresh['is_superuser'] = user.is_superuser
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'data': {
                    'user': UserSerializer(user).data,
                    'tokens': tokens
                }
            }, status=status.HTTP_201_CREATED)
        # Exception handler will format this into { "success": False, "message": "..." }
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GuestAuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [GuestAuthThrottle]

    def post(self, request):
        # Create a unique guest user
        guest_uuid = uuid.uuid4().hex[:12]
        username = f"guest_{guest_uuid}"
        user = User.objects.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            is_guest=True
        )

        tokens = get_tokens_for_user(user)
        return Response({
            'success': True,
            'message': 'Guest access generated',
            'data': {
                'user': UserSerializer(user).data,
                'tokens': tokens
            }
        }, status=status.HTTP_201_CREATED)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoyaltyHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = LoyaltyTransaction.objects.filter(user=request.user).order_by('-created_at')
        serializer = LoyaltyTransactionSerializer(transactions, many=True)
        return Response({
            'success': True,
            'data': {
                'loyalty_points': request.user.loyalty_points,
                'transactions': serializer.data
            }
        })

from rest_framework_simplejwt.exceptions import TokenError

class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({
                    'success': False,
                    'message': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)
                
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                'success': True,
                'message': 'Successfully logged out'
            }, status=status.HTTP_200_OK)
        except TokenError:
            # Token is already invalid, expired, or blacklisted.
            # Return success anyway to ensure logout idempotency.
            return Response({
                'success': True,
                'message': 'Token is already invalid or blacklisted, logged out successfully'
            }, status=status.HTTP_200_OK)


class ChangeOwnPasswordView(APIView):
    """
    POST /api/users/change-password/
    Change password for the currently logged in user.
    Requires authentication (IsAuthenticated).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        new_password = request.data.get('password')
        if not new_password or len(new_password.strip()) < 6:
            return Response({'error': 'Password must be at least 6 characters long'}, status=400)

        user = request.user
        if user.is_staff and not user.is_superuser:
            return Response({'error': 'Managers are not allowed to change their own passwords.'}, status=403)

        user.set_password(new_password.strip())
        user.save()

        return Response({
            'success': True,
            'message': 'Your password has been changed successfully!'
        })


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email address is required.'}, status=400)
            
        User = get_user_model()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({
                'success': True,
                'message': 'If this email is registered, a password reset link has been sent to it!'
            })
            
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_link = f"https://foodsphere-admin.pages.dev/reset-password?uid={uid}&token={token}"
        
        subject = "Reset Your FoodSphere Password"
        message = f"""Hi {user.username},

We received a request to reset the password for your FoodSphere account.
Please click the link below to set a new password:

{reset_link}

If you did not request this, you can safely ignore this email.

Best regards,
The FoodSphere Team
"""
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL or 'foodsphere.support@gmail.com',
                [email],
                fail_silently=False,
            )
            email_sent = True
        except Exception as e:
            print(f"SMTP Failed, could not send email to {email}: {e}")
            email_sent = False

        return Response({
            'success': True,
            'message': 'Password reset link has been successfully dispatched to your email!',
            'email_sent': email_sent,
            'debug_reset_link': reset_link if not email_sent else None
        })


class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')
        
        if not uidb64 or not token or not new_password:
            return Response({'error': 'All fields (uid, token, password) are required.'}, status=400)
            
        if len(new_password.strip()) < 6:
            return Response({'error': 'Password must be at least 6 characters long.'}, status=400)
            
        User = get_user_model()
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'error': 'Invalid reset link or user does not exist.'}, status=400)
            
        if not default_token_generator.check_token(user, token):
            return Response({'error': 'The reset link is invalid or has expired.'}, status=400)
            
        user.set_password(new_password.strip())
        user.save()
        
        return Response({
            'success': True,
            'message': 'Your password has been reset successfully! You can now log in.'
        })


