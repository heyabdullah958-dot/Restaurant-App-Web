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

