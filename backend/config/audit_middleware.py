"""
APIAuditMiddleware — FoodSphere
Middleware to capture and record staff API mutations (POST, PUT, PATCH, DELETE)
and login events directly in AdminAuditLog.
"""
from config.models import AdminAuditLog
import json
import logging

logger = logging.getLogger(__name__)

class APIAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log mutations by authenticated staff users on /api/ endpoints
        if (
            request.path.startswith('/api/') and
            request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and
            request.user and
            request.user.is_authenticated and
            request.user.is_staff and
            200 <= response.status_code < 300
        ):
            try:
                # Sanitize payload
                payload = {}
                if request.body:
                    try:
                        data = json.loads(request.body.decode('utf-8'))
                        if isinstance(data, dict):
                            payload = {
                                k: (v if k not in ['password', 'token', 'secret'] else '***REDACTED***')
                                for k, v in data.items()
                            }
                    except Exception:
                        payload = {'raw_body': 'binary_or_unparseable'}

                action_map = {
                    'POST': 'create',
                    'PUT': 'update',
                    'PATCH': 'update',
                    'DELETE': 'delete'
                }

                # Extract model / resource name from request path
                path_parts = [p for p in request.path.strip('/').split('/') if p]
                model_name = path_parts[1].capitalize() if len(path_parts) > 1 else 'API'
                object_id = path_parts[-1] if path_parts[-1].isdigit() else None

                ip_address = (
                    request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or
                    request.META.get('REMOTE_ADDR')
                )

                AdminAuditLog.objects.create(
                    user=request.user,
                    action=action_map.get(request.method, 'update'),
                    model_name=model_name,
                    object_id=object_id,
                    object_repr=f"{request.method} {request.path}",
                    changes=payload,
                    ip_address=ip_address,
                )
            except Exception as e:
                logger.error(f"Failed to record API audit log: {e}")

        return response
