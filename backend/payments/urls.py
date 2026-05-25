from django.urls import path
from .views import ConfirmCODPaymentView, CreateStripePaymentIntentView

urlpatterns = [
    path('payments/cod/confirm/', ConfirmCODPaymentView.as_view(), name='payment_cod_confirm'),
    path('payments/stripe/create/', CreateStripePaymentIntentView.as_view(), name='payment_stripe_create'),
]
