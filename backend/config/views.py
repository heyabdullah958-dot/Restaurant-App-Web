import os
from django.http import JsonResponse
from django.utils import timezone
from django.db import connection
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_POST

def health_check(request):
    """
    Enhanced health check — checks DB connectivity.
    Returns 200 if healthy, 503 if unhealthy.
    """
    import time
    start = time.time()
    
    db_status = 'unknown'
    db_error = None
    
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
        db_status = 'ok'
    except Exception as e:
        db_status = 'error'
        db_error = str(e)
    
    elapsed = round((time.time() - start) * 1000, 2)
    
    is_healthy = db_status == 'ok'
    
    response_data = {
        'success': is_healthy,
        'data': {
            'status': 'OK' if is_healthy else 'DEGRADED',
            'timestamp': timezone.now().isoformat(),
            'database': db_status,
            'response_time_ms': elapsed,
        }
    }
    
    if db_error and request.user.is_authenticated and request.user.is_superuser:
        response_data['data']['db_error'] = db_error
    
    http_status = 200 if is_healthy else 503
    return JsonResponse(response_data, status=http_status)

@staff_member_required
def db_debug(request):
    """
    Database diagnostics endpoint.
    RESTRICTED: Only accessible by superuser.
    """
    if not request.user.is_superuser:
        return JsonResponse({'error': 'Superuser required'}, status=403)
    try:
        engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()
        return JsonResponse({
            'success': True,
            'engine': engine,
            'connection_test': 'SUCCESS' if row else 'FAILED',
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'connection_test': 'FAILED',
            'error': 'Database connection failed',
        })


def root_view(request):
    """
    Root API endpoint welcome message.
    """
    return JsonResponse({
        'name': 'FoodSphere REST API Backend',
        'status': 'Online',
        'health_check': '/health/',
        'version': '1.0.0',
    })


@require_POST
@staff_member_required
def trigger_seed(request):
    """
    Emergency database seeding endpoint.
    RESTRICTED: Only accessible by superuser staff via POST.
    """
    if not request.user.is_superuser:
        return JsonResponse({
            'success': False,
            'message': 'Superuser access required.'
        }, status=403)
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


from django.views.decorators.http import require_http_methods

@require_http_methods(["POST"])
def init_db(request):
    """
    Emergency database initializer.
    POST request only. Key request body mein honi chahiye (not URL).
    """
    import secrets
    import json
    expected_key = os.environ.get('INIT_DB_SECRET_KEY', '')
    
    # POST body or POST parameters se key lo
    try:
        body = json.loads(request.body.decode('utf-8'))
        provided_key = body.get('key', '')
    except (json.JSONDecodeError, UnicodeDecodeError):
        provided_key = request.POST.get('key', '')
    
    if not expected_key:
        return JsonResponse({
            'success': False, 
            'message': 'INIT_DB_SECRET_KEY environment variable not configured.'
        }, status=503)
    
    if not secrets.compare_digest(provided_key, expected_key):
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=403)
    
    if not request.user.is_authenticated or not request.user.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superuser login required.'}, status=403)
        
    from django.core.management import call_command
    try:
        call_command('migrate', interactive=False)
        call_command('create_admin')
        call_command('create_restaurant_managers')
        call_command('seed_restaurants')
        return JsonResponse({
            'success': True,
            'message': 'Database initialized, admin and managers created, and restaurants seeded successfully!'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
