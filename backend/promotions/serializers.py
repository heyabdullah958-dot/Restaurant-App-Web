from rest_framework import serializers
from .models import Coupon, FlashDeal

class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    restaurant_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        code = data.get('code')
        try:
            coupon = Coupon.objects.get(code__iexact=code)
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code.")
            
        if not coupon.is_valid():
            raise serializers.ValidationError("Coupon is expired or inactive.")
            
        if data.get('subtotal') < coupon.min_subtotal:
            raise serializers.ValidationError(f"Minimum subtotal of Rs. {coupon.min_subtotal} required.")
            
        if coupon.restaurant_id and coupon.restaurant_id != data.get('restaurant_id'):
            raise serializers.ValidationError("Coupon is not valid for this restaurant.")
            
        return data

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class FlashDealSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashDeal
        fields = '__all__'
