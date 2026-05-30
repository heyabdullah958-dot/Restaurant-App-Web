from django.urls import path
from .views import (
    ConfirmCODPaymentView,
    CreateStripePaymentIntentView,
    ConfirmStripePaymentView,
    StripeWebhookView,
    StripeSuccessLandingView,
    StripeCancelLandingView,
    CreatePayFastPaymentView,
    PayFastITNView,
    PayFastSuccessLandingView,
    PayFastCancelLandingView,
)

urlpatterns = [
    path('payments/cod/confirm/', ConfirmCODPaymentView.as_view(), name='payment_cod_confirm'),
    path('payments/stripe/create/', CreateStripePaymentIntentView.as_view(), name='payment_stripe_create'),
    path('payments/stripe/confirm/', ConfirmStripePaymentView.as_view(), name='payment_stripe_confirm'),
    path('payments/stripe/webhook/', StripeWebhookView.as_view(), name='payment_stripe_webhook'),
    path('payments/stripe/success/', StripeSuccessLandingView.as_view(), name='payment_stripe_success'),
    path('payments/stripe/cancel/', StripeCancelLandingView.as_view(), name='payment_stripe_cancel'),
    path('payments/payfast/create/', CreatePayFastPaymentView.as_view(), name='payment_payfast_create'),
    path('payments/payfast/notify/', PayFastITNView.as_view(), name='payment_payfast_notify'),
    path('payments/payfast/success/', PayFastSuccessLandingView.as_view(), name='payment_payfast_success'),
    path('payments/payfast/cancel/', PayFastCancelLandingView.as_view(), name='payment_payfast_cancel'),
]
