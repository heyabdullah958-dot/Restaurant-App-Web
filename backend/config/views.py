from django.http import JsonResponse
from django.utils import timezone

def health_check(request):
    """
    Standard health check endpoint returning success, status, and server timestamp.
    """
    return JsonResponse({
        'success': True,
        'data': {
            'status': 'OK',
            'timestamp': timezone.now().isoformat()
        }
    })
