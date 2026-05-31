from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Standardizes DRF error responses to always return:
    {
        "success": False,
        "message": "Error details/concatenated messages"
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        message = ""
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = response.data['detail']
            else:
                # Format validation errors: "field_name: error message"
                errs = []
                for field, value in response.data.items():
                    if isinstance(value, list):
                        errs.append(f"{field}: {', '.join(map(str, value))}")
                    elif isinstance(value, dict):
                        errs.append(f"{field}: {str(value)}")
                    else:
                        errs.append(f"{field}: {str(value)}")
                message = "; ".join(errs)
        elif isinstance(response.data, list):
            message = ", ".join(map(str, response.data))
        else:
            message = str(response.data)

        response.data = {
            'success': False,
            'message': message or 'An error occurred'
        }
    else:
        # Handles 500 internal server errors (non-DRF exceptions)
        import traceback
        tb_str = traceback.format_exc()
        logger.error(f"Unhandled server error: {str(exc)}\n{tb_str}", exc_info=True)
        
        message = f"Server Error: {str(exc)}\n{tb_str}"

        response = Response(
            {
                'success': False,
                'message': message
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
