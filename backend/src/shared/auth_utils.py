"""
Authentication utilities shared across Lambda functions.
"""
import os
from typing import Dict, Any, Optional
from functools import wraps
import jwt

# SECURITY: No fallback. If JWT_SECRET is not set, fail loudly at import time.
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise EnvironmentError(
        "JWT_SECRET environment variable is required. "
        "Check SSM Parameter Store and CDK auth stack configuration."
    )


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT access token. Returns payload or None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(func):
    """
    Decorator for Lambda functions that require a valid JWT Bearer token.
    Adds `event['user']` with the decoded JWT payload on success.
    """
    @wraps(func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization', '') or headers.get('authorization', '')

        if not auth_header or not auth_header.startswith('Bearer '):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': '{"error": "Missing or invalid Authorization header"}'
            }

        token = auth_header[len('Bearer '):]
        payload = verify_jwt_token(token)

        if not payload:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': '{"error": "Invalid or expired token"}'
            }

        event['user'] = payload
        return func(event, context)

    return wrapper
