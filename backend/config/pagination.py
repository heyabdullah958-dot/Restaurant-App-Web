from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    """
    Default pagination: 20 items per page, with client-configurable page_size query parameter.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
