from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import LoyaltyTransaction

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'name', 'email', 'phone', 'profile_photo', 'loyalty_points', 'is_guest')
        read_only_fields = ('id', 'loyalty_points', 'is_guest')

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

import re

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'phone')

    def validate_username(self, value):
        cleaned = (value or '').strip()
        if not cleaned:
            raise serializers.ValidationError("Username cannot be empty.")
        if User.objects.filter(username__iexact=cleaned).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return cleaned

    def validate_email(self, value):
        if not value:
            return ''
        cleaned = value.strip().lower()
        if not cleaned:
            return ''
        if User.objects.filter(email__iexact=cleaned).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return cleaned

    def validate_phone(self, value):
        if not value:
            return ''
        # Strip all formatting spaces, dashes, parentheses
        cleaned = re.sub(r'[\s\-\(\)]+', '', str(value).strip())
        return cleaned

    def create(self, validated_data):
        raw_username = validated_data['username'].strip()
        raw_email = (validated_data.get('email') or '').strip().lower()
        raw_phone = re.sub(r'[\s\-\(\)]+', '', (validated_data.get('phone') or '').strip())
        user = User.objects.create_user(
            username=raw_username,
            email=raw_email,
            password=validated_data['password'],
            phone=raw_phone,
            is_guest=False,
            is_active=True
        )
        return user

class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ('id', 'order', 'points', 'transaction_type', 'description', 'created_at')


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        raw_identifier = attrs.get(self.username_field)
        if raw_identifier:
            clean_identifier = raw_identifier.strip()
            # 1. First try exact or case-insensitive username lookup
            user = User.objects.filter(username__iexact=clean_identifier).first()

            # 2. Try email lookup if not found (only if identifier appears to be an email address)
            if not user and '@' in clean_identifier:
                email_matches = list(User.objects.filter(email__iexact=clean_identifier)[:2])
                if len(email_matches) == 1:
                    user = email_matches[0]

            # 3. Try phone lookup if not found (only if identifier appears to be a phone number)
            if not user:
                clean_phone = re.sub(r'[\s\-\(\)]+', '', clean_identifier)
                if len(clean_phone) >= 7 and (clean_phone.isdigit() or (clean_phone.startswith('+') and clean_phone[1:].isdigit())):
                    phone_matches = list(User.objects.filter(phone=clean_phone)[:2])
                    if not phone_matches and clean_phone.startswith('0'):
                        phone_matches = list(User.objects.filter(phone='+92' + clean_phone[1:])[:2])
                    elif not phone_matches and clean_phone.startswith('+92'):
                        phone_matches = list(User.objects.filter(phone='0' + clean_phone[3:])[:2])
                    
                    if len(phone_matches) == 1:
                        user = phone_matches[0]

            if user:
                attrs[self.username_field] = user.username

        data = super().validate(attrs)
        # Include serialized user info in the token payload response for instant frontend hydration
        data['user'] = UserSerializer(self.user).data
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Inject custom claims expected by the React Admin Panel
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        token['must_change_password'] = getattr(user, 'must_change_password', False)
        
        # Inject the managed restaurant ID and branch ID for manager context mapping
        from config.admin_utils import get_managed_restaurant, get_managed_branch
        managed = get_managed_restaurant(user)
        token['restaurant_id'] = managed.id if managed else None
        
        managed_br = get_managed_branch(user)
        token['branch_id'] = managed_br.id if managed_br else None
        
        return token


