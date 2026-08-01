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

class CouponListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CouponSerializer

    def get_queryset(self):
        qs = Coupon.objects.all().order_by('-created_at')
        restaurant_id = self.request.query_params.get('restaurant_id')
        branch_id = self.request.query_params.get('branch_id')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

class CouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer

class ActiveCouponsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CouponSerializer
    
    def get_queryset(self):
        now = timezone.now()
        qs = Coupon.objects.filter(is_active=True, valid_from__lte=now, valid_to__gte=now)
        restaurant_id = self.request.query_params.get('restaurant_id')
        branch_id = self.request.query_params.get('branch_id')
        if restaurant_id:
            from django.db.models import Q
            qs = qs.filter(Q(restaurant_id=restaurant_id) | Q(restaurant__isnull=True))
        if branch_id:
            from django.db.models import Q
            qs = qs.filter(Q(branch_id=branch_id) | Q(branch__isnull=True))
        return qs

class FlashDealListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = FlashDealSerializer

    def get_queryset(self):
        qs = FlashDeal.objects.all().order_by('-created_at')
        restaurant_id = self.request.query_params.get('restaurant_id')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        return qs

class ActiveFlashDealsView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = FlashDealSerializer
    
    def get_queryset(self):
        now = timezone.now()
        qs = FlashDeal.objects.filter(is_active=True, start_time__lte=now, end_time__gte=now)
        is_dine_in_only = self.request.query_params.get('is_dine_in_only')
        if is_dine_in_only is not None:
            if is_dine_in_only.lower() in ['true', '1']:
                qs = qs.filter(is_dine_in_only=True)
            elif is_dine_in_only.lower() in ['false', '0']:
                qs = qs.filter(is_dine_in_only=False)
        return qs

class FlashDealDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = FlashDeal.objects.all()
    serializer_class = FlashDealSerializer

