import os
from django.http import JsonResponse
from django.utils import timezone
from django.db import connection
from django.conf import settings

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

def db_debug(request):
    """
    Diagnostic endpoint to verify database engine and connectivity.
    """
    try:
        engine = settings.DATABASES['default']['ENGINE']
        db_url = os.environ.get('DATABASE_URL')
        
        # Test connection by executing a simple query
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
            
        return JsonResponse({
            'success': True,
            'engine': engine,
            'connection_test': 'SUCCESS' if row else 'FAILED',
            'database_url_configured': bool(db_url)
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'engine': settings.DATABASES['default']['ENGINE'],
            'connection_test': 'FAILED',
            'error': str(e),
            'database_url_configured': bool(os.environ.get('DATABASE_URL'))
        })


def root_view(request):
    """
    Root API endpoint welcome message.
    """
    return JsonResponse({
        'name': 'FoodSphere REST API Backend',
        'status': 'Online',
        'health_check': '/health/',
        'admin_panel': '/admin/',
        'api_root': '/api/',
        'message': 'Welcome to the FoodSphere API. Use the above endpoints to interact with the backend.'
    })


def trigger_seed(request):
    """
    Temporary endpoint to seed the live database programmatically.
    """
    from django.core.management import call_command
    try:
        call_command('seed_restaurants')
        return JsonResponse({
            'success': True,
            'message': 'Database seeded successfully with 7 restaurant brands!'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

