import os
from django.http import JsonResponse
from django.utils import timezone
from django.db import connection
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.views.decorators.http import require_POST

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

@staff_member_required
def db_debug(request):
    """
    Database diagnostics endpoint.
    RESTRICTED: Only accessible by staff/admin users.
    """
    try:
        engine = settings.DATABASES['default']['ENGINE']
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
            'engine': settings.DATABASES['default']['ENGINE'],
            'connection_test': 'FAILED',
            'error': str(e),
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


def init_db(request):
    """
    Emergency database initializer.
    GET request secured by a simple query key.
    """
    if request.GET.get('key') != 'foodsphere123':
        return JsonResponse({
            'success': False,
            'message': 'Unauthorized. Key required.'
        }, status=403)
        
    from django.core.management import call_command
    try:
        # Run migrations
        call_command('migrate', interactive=False)
        # Create superuser
        call_command('create_admin')
        # Create restaurant managers
        call_command('create_restaurant_managers')
        # Seed restaurants
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
