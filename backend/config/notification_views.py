"""
Notification API View — FoodSphere
Sends Firebase Cloud Messaging (FCM) push notifications to all users or
users of a specific restaurant.

Requires FCM_SERVER_KEY in environment variables.
"""
import json
import os
import urllib.request
import urllib.error
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.conf import settings


FCM_URL = 'https://fcm.googleapis.com/fcm/send'


def get_fcm_server_key():
    """Get FCM server key from environment — never hardcode."""
    return os.environ.get('FCM_SERVER_KEY', getattr(settings, 'FCM_SERVER_KEY', ''))


class SendNotificationView(APIView):
    """
    POST /api/admin/notifications/send/

    Body:
        {
            "title": "Eid Special!",
            "body": "Get 20% off today only.",
            "target": "all"  // or a restaurant ID as int
        }

    Note: FCM_SERVER_KEY must be set in environment variables.
    If not set, the endpoint returns a 501 with guidance.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        server_key = get_fcm_server_key()
        if not server_key:
            return Response({
                'error': 'FCM_SERVER_KEY not configured.',
                'hint': 'Add FCM_SERVER_KEY to your Render environment variables to enable push notifications.',
                'status': 'not_configured'
            }, status=501)

        title = request.data.get('title', '')
        body = request.data.get('body', '')
        target = request.data.get('target', 'all')

        if not title or not body:
            return Response({'error': 'title and body are required'}, status=400)

        # Build the FCM payload
        # target='all' → send to topic '/topics/all_users'
        # target=<restaurant_id> → send to topic '/topics/restaurant_<id>'
        if target == 'all':
            topic = '/topics/all_users'
        else:
            try:
                restaurant_id = int(target)
                topic = f'/topics/restaurant_{restaurant_id}'
            except (ValueError, TypeError):
                return Response({'error': 'target must be "all" or a restaurant ID integer'}, status=400)

        payload = json.dumps({
            'to': topic,
            'notification': {
                'title': title,
                'body': body,
                'sound': 'default',
                'badge': '1',
            },
            'data': {
                'click_action': 'FLUTTER_NOTIFICATION_CLICK',
                'sent_by': request.user.username,
                'target': str(target),
            }
        }).encode('utf-8')

        req = urllib.request.Request(
            FCM_URL,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'key={server_key}',
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                fcm_response = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            return Response({
                'error': f'FCM returned HTTP {e.code}',
                'details': error_body
            }, status=502)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({
            'success': True,
            'topic': topic,
            'title': title,
            'fcm_response': fcm_response,
        })


class NotificationHistoryView(APIView):
    """
    GET /api/admin/notifications/history/
    Returns the last N notification sends stored in the audit log.
    Simple implementation using AdminAuditLog model.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from config.models import AdminAuditLog
        logs = AdminAuditLog.objects.filter(
            action='create',
            model_name='Notification'
        ).order_by('-timestamp')[:50]

        return Response([{
            'timestamp': log.timestamp,
            'user': str(log.user),
            'changes': log.changes,
        } for log in logs])
