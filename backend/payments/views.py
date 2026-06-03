import stripe
import logging
import hashlib
import urllib.parse
from decimal import Decimal
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from orders.models import Order
from .models import Payment
from .serializers import PaymentSerializer

logger = logging.getLogger(__name__)

# Initialize Stripe API Key
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_mock_stripe_key_123')


def generate_payfast_signature(data, passphrase=None):
    """
    Generate MD5 signature for PayFast integration.
    """
    sorted_keys = sorted(data.keys())
    query_string = []
    for key in sorted_keys:
        val = data[key]
        if val is not None and val != '' and key != 'signature':
            quoted_val = urllib.parse.quote_plus(str(val)).replace('+', '%20')
            query_string.append(f"{key}={quoted_val}")
    
    query_str = "&".join(query_string)
    if passphrase:
        query_str += f"&passphrase={urllib.parse.quote_plus(passphrase).replace('+', '%20')}"
    
    return hashlib.md5(query_str.encode('utf-8')).hexdigest()


class ConfirmCODPaymentView(APIView):
    """
    POST /api/payments/cod/confirm/
    Confirm COD checkout and generate a payment record for the order.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'message': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)

            if request.user.is_authenticated:
                if order.user and order.user != request.user:
                    logger.warning(
                        f"User {request.user.id} attempted to confirm order {order_id} "
                        f"owned by user {order.user.id}"
                    )
                    return Response({
                        'success': False,
                        'message': 'You do not have permission to confirm this order.'
                    }, status=status.HTTP_403_FORBIDDEN)
            else:
                if order.user is not None:
                    logger.warning(
                        f"Anonymous user attempted to confirm registered user's order {order_id}"
                    )
                    return Response({
                        'success': False,
                        'message': 'You do not have permission to confirm this order.'
                    }, status=status.HTTP_403_FORBIDDEN)

            if order.status not in ('received', 'pending'):
                return Response({
                    'success': False,
                    'message': f"Order is already '{order.status}'. Cannot confirm again."
                }, status=status.HTTP_400_BAD_REQUEST)

            if order.payment_method != 'cod':
                return Response({
                    'success': False,
                    'message': f"Order payment method is '{order.payment_method}', not 'cod'."
                }, status=status.HTTP_400_BAD_REQUEST)

            payment, created = Payment.objects.get_or_create(
                order=order,
                method='cod',
                defaults={
                    'amount': order.total,
                    'status': 'completed',
                    'transaction_id': f"COD-{order.id}"
                }
            )
            # Transition order status to received
            if order.status == 'pending':
                order.status = 'received'
                order.save()

            return Response({
                'success': True,
                'message': 'COD Payment confirmed successfully',
                'data': PaymentSerializer(payment).data
            })

        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)


class CreateStripePaymentIntentView(APIView):
    """
    POST /api/payments/stripe/create/
    Creates a Stripe Checkout Session (providing checkout_url) and expands the PaymentIntent (client_secret).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'message': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)

            if request.user.is_authenticated:
                if order.user and order.user != request.user:
                    return Response({
                        'success': False,
                        'message': 'You do not have permission for this order.'
                    }, status=status.HTTP_403_FORBIDDEN)

            host = request.build_absolute_uri('/')[:-1]

            # Create a Stripe Checkout Session, expanding the payment_intent
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'pkr',
                        'product_data': {
                            'name': f"FoodSphere Order #{order.id}",
                        },
                        'unit_amount': int(round(order.total)),  # PKR is zero-decimal in Stripe
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f"{host}/api/payments/stripe/success/?order_id={order.id}",
                cancel_url=f"{host}/api/payments/stripe/cancel/?order_id={order.id}",
                metadata={'order_id': str(order.id)},
                payment_intent_data={
                    'metadata': {'order_id': str(order.id)}
                },
                expand=['payment_intent']
            )

            client_secret = session.payment_intent.client_secret if session.payment_intent else None
            payment_intent_id = session.payment_intent.id if session.payment_intent else session.id

            # Record pending Stripe payment in database
            payment, created = Payment.objects.update_or_create(
                order=order,
                method='stripe',
                defaults={
                    'amount': order.total,
                    'status': 'pending',
                    'transaction_id': payment_intent_id,
                    'gateway_response': {
                        'session_id': session.id,
                        'payment_intent_id': payment_intent_id
                    }
                }
            )

            return Response({
                'success': True,
                'client_secret': client_secret,
                'checkout_url': session.url,
                'publishable_key': getattr(settings, 'STRIPE_PUBLISHABLE_KEY', ''),
                'payment': PaymentSerializer(payment).data
            })

        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except stripe.error.StripeError as e:
            logger.error(f"Stripe SDK Error: {str(e)}")
            return Response({
                'success': False,
                'message': f"Stripe gateway error: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Stripe initialization error: {str(e)}")
            return Response({
                'success': False,
                'message': f"Stripe service error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConfirmStripePaymentView(APIView):
    """
    POST /api/payments/stripe/confirm/
    Verifies payment success on the server-side after mobile checkout completion.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payment_intent_id = request.data.get('payment_intent_id')
        if not payment_intent_id:
            return Response({
                'success': False,
                'message': 'payment_intent_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            if intent.status == 'succeeded':
                order_id = intent.metadata.get('order_id')
                order = Order.objects.get(pk=order_id)

                payment = Payment.objects.get(order=order, method='stripe', transaction_id=payment_intent_id)
                payment.status = 'completed'
                payment.gateway_response = intent
                payment.save()

                # Transition order status to received
                if order.status == 'pending':
                    order.status = 'received'
                    order.save()

                return Response({
                    'success': True,
                    'message': 'Stripe payment confirmed successfully',
                    'payment': PaymentSerializer(payment).data
                })
            else:
                return Response({
                    'success': False,
                    'message': f"Stripe payment failed/incomplete. Status: '{intent.status}'"
                }, status=status.HTTP_400_BAD_REQUEST)

        except stripe.error.StripeError as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except (Order.DoesNotExist, Payment.DoesNotExist) as e:
            return Response({
                'success': False,
                'message': 'Order or payment record not found for this intent.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    POST /api/payments/stripe/webhook/
    Webhook listener for Stripe asynchronous events.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

        event = None

        try:
            if endpoint_secret and sig_header:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, endpoint_secret
                )
            elif not endpoint_secret and settings.DEBUG:
                # Sirf DEBUG mode mein skip allowed
                import json
                event = json.loads(payload.decode('utf-8'))
                logger.warning("Stripe webhook verification skipped — DEBUG mode only!")
            else:
                # Production mein secret hona zaroori hai
                logger.error("STRIPE_WEBHOOK_SECRET not configured in production!")
                return HttpResponse(status=400)
        except ValueError as e:
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError as e:
            return HttpResponse(status=400)

        event_type = event.get('type') if isinstance(event, dict) else event.type
        data_obj = event.get('data', {}).get('object') if isinstance(event, dict) else event.data.object

        if event_type == 'payment_intent.succeeded':
            payment_intent_id = data_obj.get('id')
            order_id = data_obj.get('metadata', {}).get('order_id')

            try:
                payment = Payment.objects.get(transaction_id=payment_intent_id, method='stripe')
                payment.status = 'completed'
                payment.gateway_response = data_obj
                payment.save()
                logger.info(f"PaymentIntent {payment_intent_id} verified via webhook.")

                # Transition order status to received
                order = payment.order
                if order.status == 'pending':
                    order.status = 'received'
                    order.save()
            except Payment.DoesNotExist:
                if order_id:
                    try:
                        order = Order.objects.get(pk=order_id)
                        Payment.objects.update_or_create(
                            order=order,
                            method='stripe',
                            defaults={
                                'amount': order.total,
                                'status': 'completed',
                                'transaction_id': payment_intent_id,
                                'gateway_response': data_obj
                            }
                        )
                        # Transition order status to received
                        if order.status == 'pending':
                            order.status = 'received'
                            order.save()
                    except Order.DoesNotExist:
                        logger.error(f"Order #{order_id} not found in Webhook.")

        elif event_type == 'checkout.session.completed':
            session_id = data_obj.get('id')
            payment_intent_id = data_obj.get('payment_intent')
            order_id = data_obj.get('metadata', {}).get('order_id')
            
            try:
                # Try finding by session_id in gateway_response
                payments = Payment.objects.filter(method='stripe')
                payment = None
                for p in payments:
                    if p.gateway_response and p.gateway_response.get('session_id') == session_id:
                        payment = p
                        break
                
                if payment:
                    payment.status = 'completed'
                    payment.transaction_id = payment_intent_id
                    payment.gateway_response = data_obj
                    payment.save()
                    logger.info(f"Stripe Checkout Session {session_id} verified via webhook.")
                elif order_id:
                    order = Order.objects.get(pk=order_id)
                    Payment.objects.update_or_create(
                        order=order,
                        method='stripe',
                        defaults={
                            'amount': order.total,
                            'status': 'completed',
                            'transaction_id': payment_intent_id,
                            'gateway_response': data_obj
                        }
                    )
            except Exception as e:
                logger.error(f"Error handling checkout.session.completed: {str(e)}")

        elif event_type == 'payment_intent.payment_failed':
            payment_intent_id = data_obj.get('id')
            try:
                payment = Payment.objects.get(transaction_id=payment_intent_id, method='stripe')
                payment.status = 'failed'
                payment.gateway_response = data_obj
                payment.save()
            except Payment.DoesNotExist:
                pass

        return HttpResponse(status=200)


class StripeSuccessLandingView(APIView):
    """
    GET /api/payments/stripe/success/
    Renders success page for Stripe redirect loops.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.GET.get('order_id', '')
        
        # Mark payment as completed if it was pending
        try:
            if order_id:
                order = Order.objects.get(pk=order_id)
                payment = Payment.objects.filter(order=order, method='stripe').first()
                if payment and payment.status == 'pending':
                    payment.status = 'completed'
                    payment.save()
                if order.status == 'pending':
                    order.status = 'received'
                    order.save()
        except Exception as e:
            logger.error(f"Error auto-completing Stripe payment on success landing: {str(e)}")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful - FoodSphere</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                    background-color: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    border: 1px solid #334155;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);
                }}
                .icon {{
                    background-color: #10b981;
                    color: white;
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 32px;
                    margin-bottom: 24px;
                    animation: scaleUp 0.3s ease-out;
                }}
                h1 {{
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    color: #fff;
                }}
                p {{
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0 0 32px 0;
                    line-height: 1.5;
                }}
                .btn {{
                    background-color: #ff6b35;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    padding: 14px 28px;
                    border-radius: 12px;
                    display: block;
                    transition: background-color 0.2s;
                }}
                .btn:hover {{
                    background-color: #ff5216;
                }}
                @keyframes scaleUp {{
                    0% {{ transform: scale(0); }}
                    100% {{ transform: scale(1); }}
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✓</div>
                <h1>Payment Successful!</h1>
                <p>Your card payment was processed securely. Order #{order_id} is now confirmed and sent to the kitchen.</p>
                <a href="foodsphere://order/{order_id}" class="btn">Back to App</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')


class StripeCancelLandingView(APIView):
    """
    GET /api/payments/stripe/cancel/
    Renders cancel page for Stripe redirect loops.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.GET.get('order_id', '')
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled - FoodSphere</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                    background-color: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    border: 1px solid #334155;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);
                }}
                .icon {{
                    background-color: #f43f5e;
                    color: white;
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 32px;
                    margin-bottom: 24px;
                    animation: scaleUp 0.3s ease-out;
                }}
                h1 {{
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    color: #fff;
                }}
                p {{
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0 0 32px 0;
                    line-height: 1.5;
                }}
                .btn {{
                    background-color: #475569;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    padding: 14px 28px;
                    border-radius: 12px;
                    display: block;
                    transition: background-color 0.2s;
                }}
                .btn:hover {{
                    background-color: #334155;
                }}
                @keyframes scaleUp {{
                    0% {{ transform: scale(0); }}
                    100% {{ transform: scale(1); }}
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✕</div>
                <h1>Payment Cancelled</h1>
                <p>The Stripe transaction for order #{order_id} was cancelled. No charges were made.</p>
                <a href="foodsphere://checkout" class="btn">Return to Checkout</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')


class CreatePayFastPaymentView(APIView):
    """
    POST /api/payments/payfast/create/
    Generates a PayFast redirect payment loop URL for the app or website.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'message': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)

            if request.user.is_authenticated:
                if order.user and order.user != request.user:
                    return Response({
                        'success': False,
                        'message': 'You do not have permission for this order.'
                    }, status=status.HTTP_403_FORBIDDEN)

            # Create or update Payment entry
            payment, created = Payment.objects.update_or_create(
                order=order,
                method='payfast',
                defaults={
                    'amount': order.total,
                    'status': 'pending',
                    'transaction_id': f"PF-{order.id}"
                }
            )

            # Prepare PayFast data payload
            host = request.build_absolute_uri('/')[:-1]  # get base host URL
            
            payfast_data = {
                'merchant_id': settings.PAYFAST_MERCHANT_ID,
                'merchant_key': settings.PAYFAST_MERCHANT_KEY,
                'return_url': f"{host}/api/payments/payfast/success/?order_id={order.id}",
                'cancel_url': f"{host}/api/payments/payfast/cancel/?order_id={order.id}",
                'notify_url': f"{host}/api/payments/payfast/notify/",
                'name_first': order.guest_name or (order.user.username if order.user else 'Guest'),
                'email_address': order.user.email if (order.user and order.user.email) else 'guest@foodsphere.com',
                'm_payment_id': str(payment.id),
                'amount': "%.2f" % order.total,
                'item_name': f"FoodSphere Order #{order.id}"
            }

            # Generate security signature
            signature = generate_payfast_signature(payfast_data, settings.PAYFAST_PASSPHRASE)
            payfast_data['signature'] = signature

            # Construct query params
            query_params = urllib.parse.urlencode(payfast_data)
            redirect_url = f"https://{settings.PAYFAST_HOST}/eng/process?{query_params}"

            return Response({
                'success': True,
                'redirect_url': redirect_url,
                'payment': PaymentSerializer(payment).data
            })

        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"PayFast URL creation failed: {str(e)}")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PayFastITNView(APIView):
    """
    POST /api/payments/payfast/notify/
    Handles PayFast Instant Transaction Notification (ITN) webhook.
    """
    permission_classes = [permissions.AllowAny]

    PAYFAST_IPS = [
        '197.97.145.144', '197.97.145.145', '197.97.145.146', '197.97.145.147',
        '41.74.179.194', '41.74.179.195', '41.74.179.196', '41.74.179.197',
    ]

    def post(self, request):
        # IP verification (only check in production/non-DEBUG mode)
        if not settings.DEBUG:
            client_ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', ''))
            # Get the first IP in case of proxy headers
            client_ip = client_ip.split(',')[0].strip()
            
            if client_ip not in self.PAYFAST_IPS:
                logger.warning(f"PayFast ITN from unauthorized IP: {client_ip}")
                return HttpResponse(status=403)

        post_data = request.POST.dict()
        signature_received = post_data.get('signature')

        if not signature_received:
            logger.error("PayFast ITN request received without a signature.")
            return HttpResponse(status=400)

        # Re-compute signature to verify integrity
        signature_computed = generate_payfast_signature(post_data, settings.PAYFAST_PASSPHRASE)

        if signature_received != signature_computed:
            logger.error(
                f"PayFast ITN signature mismatch. "
                f"Received: {signature_received}, Computed: {signature_computed}"
            )
            return HttpResponse(status=400)

        # Process the transaction
        payment_id = post_data.get('m_payment_id')
        payment_status = post_data.get('payment_status')
        pf_payment_id = post_data.get('pf_payment_id')

        try:
            payment = Payment.objects.get(pk=payment_id)
            payment.gateway_response = post_data
            payment.transaction_id = pf_payment_id

            if payment_status == 'COMPLETE':
                payment.status = 'completed'
                payment.save()
                # Transition order status to received
                order = payment.order
                if order.status == 'pending':
                    order.status = 'received'
                    order.save()
                logger.info(f"PayFast Payment #{payment_id} successfully completed.")
            else:
                payment.status = 'failed'
                payment.save()
                logger.warning(f"PayFast Payment #{payment_id} returned status: {payment_status}")

            return HttpResponse(status=200)

        except Payment.DoesNotExist:
            logger.error(f"PayFast ITN: Payment record #{payment_id} not found.")
            return HttpResponse(status=404)
        except Exception as e:
            logger.error(f"PayFast ITN Exception: {str(e)}")
            return HttpResponse(status=500)


class PayFastSuccessLandingView(APIView):
    """
    GET /api/payments/payfast/success/
    Renders a premium visual success screen for PayFast redirect loops.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.GET.get('order_id', '')
        
        # Mark payment as completed if it was pending
        try:
            if order_id:
                order = Order.objects.get(pk=order_id)
                payment = Payment.objects.filter(order=order, method='payfast').first()
                if payment and payment.status == 'pending':
                    payment.status = 'completed'
                    payment.save()
                if order.status == 'pending':
                    order.status = 'received'
                    order.save()
        except Exception as e:
            logger.error(f"Error auto-completing PayFast payment on success landing: {str(e)}")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful - FoodSphere</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                    background-color: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    border: 1px solid #334155;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);
                }}
                .icon {{
                    background-color: #10b981;
                    color: white;
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 32px;
                    margin-bottom: 24px;
                    animation: scaleUp 0.3s ease-out;
                }}
                h1 {{
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    color: #fff;
                }}
                p {{
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0 0 32px 0;
                    line-height: 1.5;
                }}
                .btn {{
                    background-color: #ff6b35;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    padding: 14px 28px;
                    border-radius: 12px;
                    display: block;
                    transition: background-color 0.2s;
                }}
                .btn:hover {{
                    background-color: #ff5216;
                }}
                @keyframes scaleUp {{
                    0% {{ transform: scale(0); }}
                    100% {{ transform: scale(1); }}
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✓</div>
                <h1>Payment Successful!</h1>
                <p>Thank you for your payment. Your order #{order_id} has been confirmed and is being processed by the kitchen.</p>
                <a href="foodsphere://order/{order_id}" class="btn">Back to App</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')


class PayFastCancelLandingView(APIView):
    """
    GET /api/payments/payfast/cancel/
    Renders a premium visual cancellation screen for PayFast redirect loops.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        order_id = request.GET.get('order_id', '')
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled - FoodSphere</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                    background-color: #0f172a;
                    color: #e2e8f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: linear-gradient(135deg, #1e293b, #0f172a);
                    border: 1px solid #334155;
                    border-radius: 24px;
                    padding: 40px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);
                }}
                .icon {{
                    background-color: #f43f5e;
                    color: white;
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 32px;
                    margin-bottom: 24px;
                    animation: scaleUp 0.3s ease-out;
                }}
                h1 {{
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 12px 0;
                    color: #fff;
                }}
                p {{
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0 0 32px 0;
                    line-height: 1.5;
                }}
                .btn {{
                    background-color: #475569;
                    color: white;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                    padding: 14px 28px;
                    border-radius: 12px;
                    display: block;
                    transition: background-color 0.2s;
                }}
                .btn:hover {{
                    background-color: #334155;
                }}
                @keyframes scaleUp {{
                    0% {{ transform: scale(0); }}
                    100% {{ transform: scale(1); }}
                }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">✕</div>
                <h1>Payment Cancelled</h1>
                <p>The transaction for order #{order_id} was cancelled. No charges were made. You can try checkout again with another method.</p>
                <a href="foodsphere://checkout" class="btn">Return to Checkout</a>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')
