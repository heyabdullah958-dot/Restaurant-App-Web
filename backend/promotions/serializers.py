from rest_framework import serializers
from .models import Coupon, FlashDeal

class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    restaurant_id = serializers.IntegerField(required=False, allow_null=True)
    branch_id = serializers.IntegerField(required=False, allow_null=True)
    guest_phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def validate(self, data):
        code = data.get('code')
        try:
            coupon = Coupon.objects.get(code__iexact=str(code).strip())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code.")
            
        if not coupon.is_valid():
            raise serializers.ValidationError("Coupon is expired or inactive.")
            
        if coupon.usage_limit > 0 and coupon.times_used >= coupon.usage_limit:
            raise serializers.ValidationError("Coupon usage limit has been reached.")

        if data.get('subtotal') < coupon.min_subtotal:
            raise serializers.ValidationError(f"Minimum subtotal of Rs. {coupon.min_subtotal:.0f} required.")
            
        if coupon.restaurant_id and coupon.restaurant_id != data.get('restaurant_id'):
            restaurant_name = coupon.restaurant.name if coupon.restaurant else "another restaurant"
            raise serializers.ValidationError(f"Coupon is only valid for {restaurant_name}.")

        if coupon.branch_id and coupon.branch_id != data.get('branch_id'):
            branch_name = coupon.branch.name if coupon.branch else "another branch"
            raise serializers.ValidationError(f"Coupon is only valid for {branch_name}.")

        request = self.context.get('request')
        from .models import CouponUsage
        if request and request.user and request.user.is_authenticated:
            user_count = CouponUsage.objects.filter(coupon=coupon, user=request.user).count()
            if user_count >= coupon.per_user_limit:
                raise serializers.ValidationError("You have already used this coupon the maximum allowed times.")
        elif data.get('guest_phone'):
            phone = str(data.get('guest_phone')).strip()
            phone_count = CouponUsage.objects.filter(coupon=coupon, order__guest_phone=phone).count()
            if phone_count >= coupon.per_user_limit:
                raise serializers.ValidationError("This phone number has already used this coupon the maximum allowed times.")
            
        return data

class CouponSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'id', 'code', 'discount_type', 'discount_value', 'min_subtotal', 'max_discount',
            'restaurant', 'restaurant_name', 'branch', 'branch_name', 'is_dine_in_only',
            'valid_from', 'valid_to', 'usage_limit', 'times_used', 'per_user_limit',
            'is_active', 'created_at'
        ]

class FlashDealSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashDeal
        fields = '__all__'
