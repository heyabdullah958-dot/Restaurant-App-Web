from rest_framework import serializers
from .models import Coupon, FlashDeal

class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    restaurant_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        code = data.get('code')
        try:
            coupon = Coupon.objects.get(code__iexact=code.strip())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code.")
            
        if not coupon.is_valid():
            raise serializers.ValidationError("Coupon is expired or inactive.")
            
        if coupon.usage_limit > 0 and coupon.times_used >= coupon.usage_limit:
            raise serializers.ValidationError("Coupon usage limit has been reached.")

        if data.get('subtotal') < coupon.min_subtotal:
            raise serializers.ValidationError(f"Minimum subtotal of Rs. {coupon.min_subtotal:.0f} required.")
            
        if coupon.restaurant_id and coupon.restaurant_id != data.get('restaurant_id'):
            raise serializers.ValidationError("Coupon is not valid for this restaurant.")

        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            from .models import CouponUsage
            user_count = CouponUsage.objects.filter(coupon=coupon, user=request.user).count()
            if user_count >= coupon.per_user_limit:
                raise serializers.ValidationError("You have already used this coupon the maximum allowed times.")
            
        return data

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class FlashDealSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashDeal
        fields = '__all__'
