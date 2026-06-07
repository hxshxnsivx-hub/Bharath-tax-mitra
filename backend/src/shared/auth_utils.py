"""
Authentication utilities shared across Lambda functions
"""
import os
import jwt
from typing import Dict, Any, Optional
from functools import wraps

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key')

def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(func):
    """Decorator to require authentication for Lambda functions"""
    @wraps(func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        # Extract token from Authorization header
        headers = event.get('headers', {})
        auth_header = headers.get('Authorization', '') or headers.get('authorization', '')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': '{"error": "Missing or invalid authorization header"}'
            }
        
        token = auth_header.replace('Bearer ', '')
        payload = verify_jwt_token(token)
        
        if not payload:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': '{"error": "Invalid or expired token"}'
            }
        
        # Add user info to event
        event['user'] = payload
        
        return func(event, context)
    
    return wrapper
