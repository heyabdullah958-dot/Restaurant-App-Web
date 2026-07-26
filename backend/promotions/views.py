from rest_framework import views, generics, permissions
from rest_framework.response import Response
from django.utils import timezone
from .models import Coupon, FlashDeal
from .serializers import CouponValidateSerializer, CouponSerializer, FlashDealSerializer

class CouponValidateView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = CouponValidateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        subtotal = serializer.validated_data['subtotal']
        coupon = Coupon.objects.get(code__iexact=code)
        
        discount = 0
        if coupon.discount_type == 'percentage':
            discount = subtotal * (coupon.discount_value / 100)
            if coupon.max_discount:
                discount = min(discount, coupon.max_discount)
        else:
            discount = coupon.discount_value
            
        discount = min(discount, subtotal)
        
        return Response({
            'valid': True,
            'code': coupon.code,
            'discount': discount,
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
        })

class ActiveCouponsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CouponSerializer
    
    def get_queryset(self):
        now = timezone.now()
        return Coupon.objects.filter(is_active=True, valid_from__lte=now, valid_to__gte=now)

class ActiveFlashDealsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = FlashDealSerializer
    
    def get_queryset(self):
        now = timezone.now()
        return FlashDeal.objects.filter(is_active=True, start_time__lte=now, end_time__gte=now)

class FlashDealDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = FlashDeal.objects.all()
    serializer_class = FlashDealSerializer
