class MethodOverrideMiddleware:
    """
    Middleware to allow PUT/PATCH method overrides on POST requests.
    Crucial for Django REST Framework to parse multipart/form-data uploads on PATCH.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'POST':
            ALLOWED_OVERRIDE_METHODS = {'PUT', 'PATCH', 'DELETE'}
            
            # Check for header
            method_override = request.META.get('HTTP_X_HTTP_METHOD_OVERRIDE')
            if method_override:
                override_upper = method_override.upper()
                if override_upper in ALLOWED_OVERRIDE_METHODS:
                    request.method = override_upper
            # Check for query param or post body field
            elif '_method' in request.POST:
                override_upper = request.POST['_method'].upper()
                if override_upper in ALLOWED_OVERRIDE_METHODS:
                    request.method = override_upper
            elif '_method' in request.GET:
                override_upper = request.GET['_method'].upper()
                if override_upper in ALLOWED_OVERRIDE_METHODS:
                    request.method = override_upper

        return self.get_response(request)
