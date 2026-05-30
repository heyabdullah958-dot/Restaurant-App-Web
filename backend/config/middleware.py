class MethodOverrideMiddleware:
    """
    Middleware to allow PUT/PATCH method overrides on POST requests.
    Crucial for Django REST Framework to parse multipart/form-data uploads on PATCH.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == 'POST':
            # Check for header
            method_override = request.META.get('HTTP_X_HTTP_METHOD_OVERRIDE')
            if method_override:
                request.method = method_override.upper()
            # Check for query param or post body field
            elif '_method' in request.POST:
                request.method = request.POST['_method'].upper()
            elif '_method' in request.GET:
                request.method = request.GET['_method'].upper()

        return self.get_response(request)
