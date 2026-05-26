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

def create_admin(request):
    """
    Temporary endpoint to create a superuser on platforms where shell access is restricted.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    username = "admin"
    email = "admin@foodsphere.com"
    password = "FoodSphereAdmin2026!"  # Temporary secure password
    
    try:
        # Delete existing user to ensure a fresh, working password
        if User.objects.filter(username=username).exists():
            User.objects.filter(username=username).delete()
            
        User.objects.create_superuser(username=username, email=email, password=password)
        return JsonResponse({
            'success': True,
            'message': f"Superuser '{username}' recreated successfully. Password is '{password}'. Please change it immediately in the admin panel!"
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
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

