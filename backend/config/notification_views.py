"""
Notification API View — FoodSphere
Sends Firebase Cloud Messaging (FCM) push notifications to all users or
users of a specific restaurant.

Requires FCM_SERVER_KEY in environment variables.
"""
import json
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
import logging

logger = logging.getLogger(__name__)

def get_firebase_app():
    """Firebase Admin SDK initialize karein."""
    try:
        import firebase_admin
        from firebase_admin import credentials
        
        service_account_json = os.environ.get('FCM_SERVICE_ACCOUNT_JSON', '')
        if not service_account_json:
            return None
        
        # Agar already initialized hai toh wahi return karein
        try:
            return firebase_admin.get_app()
        except ValueError:
            pass
        
        cred_dict = json.loads(service_account_json)
        cred = credentials.Certificate(cred_dict)
        return firebase_admin.initialize_app(cred)
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        return None


class SendNotificationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        from firebase_admin import messaging
        
        app = get_firebase_app()
        if not app:
            return Response({
                'error': 'FCM_SERVICE_ACCOUNT_JSON not configured.',
                'hint': 'Add Firebase service account JSON to Render environment variables.',
                'status': 'not_configured'
            }, status=501)

        title = request.data.get('title', '')
        body = request.data.get('body', '')
        target = request.data.get('target', 'all')

        if not title or not body:
            return Response({'error': 'title and body are required'}, status=400)

        if target == 'all':
            topic = 'all_users'
        else:
            try:
                restaurant_id = int(target)
                topic = f'restaurant_{restaurant_id}'
            except (ValueError, TypeError):
                return Response({'error': 'target must be "all" or a restaurant ID integer'}, status=400)

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={
                'click_action': 'FLUTTER_NOTIFICATION_CLICK',
                'sent_by': str(request.user.username),
                'target': str(target),
            },
            topic=topic,
        )

        try:
            response = messaging.send(message)
            
            # Log notification to audit log so history page shows it
            try:
                from config.models import AdminAuditLog
                AdminAuditLog.objects.create(
                    user=request.user,
                    action='create',
                    model_name='Notification',
                    object_id=0,
                    object_repr=f"Notification: {title}",
                    changes={'title': title, 'body': body, 'target': str(target), 'message_id': response},
                    ip_address=request.META.get('REMOTE_ADDR'),
                )
            except Exception as audit_err:
                logger.error(f"Failed to log notification creation: {audit_err}")

            return Response({
                'success': True,
                'topic': topic,
                'title': title,
                'message_id': response,
            })
        except Exception as e:
            logger.error(f"FCM send failed: {e}")
            return Response({'error': str(e)}, status=500)


class NotificationHistoryView(APIView):
    """
    GET /api/admin/notifications/history/
    Returns the last N notification sends stored in the audit log.
    Simple implementation using AdminAuditLog model.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from config.models import AdminAuditLog
        limit = min(int(request.query_params.get('limit', 50)), 200)
        offset = int(request.query_params.get('offset', 0))
        
        logs_qs = AdminAuditLog.objects.filter(
            action='create',
            model_name='Notification'
        ).select_related('user').order_by('-timestamp')
        
        total = logs_qs.count()
        logs = logs_qs[offset:offset + limit]

        return Response({
            'total': total,
            'limit': limit,
            'offset': offset,
            'results': [{
                'id': log.id,
                'timestamp': log.timestamp,
                'user': str(log.user) if log.user else 'Unknown',
                'title': log.changes.get('title', ''),
                'body': log.changes.get('body', ''),
                'target': log.changes.get('target', ''),
                'message_id': log.changes.get('message_id', ''),
            } for log in logs]
        })
