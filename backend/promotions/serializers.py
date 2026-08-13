import logging
from rest_framework import serializers
from .models import Coupon, FlashDeal

logger = logging.getLogger(__name__)

class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    restaurant_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    branch_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    guest_phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    def validate(self, data):
        code = data.get('code')
        try:
            coupon = Coupon.objects.get(code__iexact=str(code).strip())
        except Coupon.DoesNotExist:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{code}' NOT FOUND in DB.")
            raise serializers.ValidationError("Invalid promo code.")
            
        from django.utils import timezone
        now = timezone.now()
        if not coupon.is_active:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' (ID #{coupon.id}) is INACTIVE.")
            raise serializers.ValidationError(f"Promo code '{coupon.code}' is currently inactive.")
            
        if coupon.valid_from and now < coupon.valid_from:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' is NOT YET ACTIVE (Valid from: {coupon.valid_from}, Now: {now}).")
            raise serializers.ValidationError(f"Promo code '{coupon.code}' is not active yet.")
            
        if coupon.valid_to and now > coupon.valid_to:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' is EXPIRED (Valid until: {coupon.valid_to}, Now: {now}).")
            raise serializers.ValidationError(f"Promo code '{coupon.code}' has expired.")
            
        if coupon.usage_limit > 0 and coupon.times_used >= coupon.usage_limit:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' USAGE LIMIT REACHED ({coupon.times_used}/{coupon.usage_limit}).")
            raise serializers.ValidationError(f"Promo code '{coupon.code}' usage limit has been reached.")

        subtotal = data.get('subtotal') or 0
        min_sub = coupon.min_subtotal or 0
        if subtotal < min_sub:
            logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' MIN ORDER NOT MET (Subtotal Rs.{subtotal} < Min Rs.{min_sub}).")
            raise serializers.ValidationError(f"Minimum subtotal of Rs. {min_sub:.0f} required to use promo code '{coupon.code}'.")

        # Resolve restaurant_id scope flexible matching (int ID vs slug vs brand name string)
        raw_rest = data.get('restaurant_id')
        req_rest_id = None
        if raw_rest is not None and str(raw_rest).strip():
            rest_str = str(raw_rest).strip()
            if rest_str.isdigit():
                req_rest_id = int(rest_str)
            else:
                from restaurants.models import Restaurant
                rest_obj = Restaurant.objects.filter(slug__iexact=rest_str).first()
                if not rest_obj:
                    rest_obj = Restaurant.objects.filter(name__iexact=rest_str).first()
                if rest_obj:
                    req_rest_id = rest_obj.id

        if coupon.restaurant_id:
            if req_rest_id is None or coupon.restaurant_id != req_rest_id:
                restaurant_name = coupon.restaurant.name if coupon.restaurant else "another brand"
                logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' SCOPE MISMATCH (Coupon Rest ID #{coupon.restaurant_id} vs Request Rest ID #{req_rest_id}).")
                raise serializers.ValidationError(f"Promo code '{coupon.code}' is only valid for {restaurant_name}.")

        # Resolve branch_id scope flexible matching
        raw_branch = data.get('branch_id')
        req_branch_id = None
        if raw_branch is not None and str(raw_branch).strip():
            branch_str = str(raw_branch).strip()
            if branch_str.isdigit():
                req_branch_id = int(branch_str)
            else:
                from restaurants.models import Branch
                branch_obj = Branch.objects.filter(name__iexact=branch_str).first()
                if branch_obj:
                    req_branch_id = branch_obj.id

        if coupon.branch_id:
            if req_branch_id is None or coupon.branch_id != req_branch_id:
                branch_name = coupon.branch.name if coupon.branch else "another branch"
                logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' BRANCH MISMATCH (Coupon Branch ID #{coupon.branch_id} vs Request Branch ID #{req_branch_id}).")
                raise serializers.ValidationError(f"Promo code '{coupon.code}' is only valid for branch '{branch_name}'.")

        request = self.context.get('request')
        from .models import CouponUsage
        if request and request.user and request.user.is_authenticated:
            user_count = CouponUsage.objects.filter(coupon=coupon, user=request.user).count()
            if user_count >= coupon.per_user_limit:
                logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' PER-USER LIMIT REACHED for user #{request.user.id}.")
                raise serializers.ValidationError(f"You have already used promo code '{coupon.code}' the maximum allowed times.")
        elif data.get('guest_phone'):
            phone = str(data.get('guest_phone')).strip()
            phone_count = CouponUsage.objects.filter(coupon=coupon, order__guest_phone=phone).count()
            if phone_count >= coupon.per_user_limit:
                logger.warning(f"[PROMO VALIDATION FAILED] Code '{coupon.code}' PER-PHONE LIMIT REACHED for guest phone '{phone}'.")
                raise serializers.ValidationError(f"This phone number has already used promo code '{coupon.code}' the maximum allowed times.")
            
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
