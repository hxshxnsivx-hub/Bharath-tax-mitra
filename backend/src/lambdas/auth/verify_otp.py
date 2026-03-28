"""
Verify OTP Lambda Function
Validates OTP and generates JWT tokens
"""
import json
import os
import time
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError
import jwt
import hashlib

# AWS clients
dynamodb = boto3.resource('dynamodb')
kms = boto3.client('kms')

# Environment variables
OTP_TABLE_NAME = os.environ.get('OTP_TABLE_NAME', 'bharat-tax-mitra-otps')
USERS_TABLE_NAME = os.environ.get('USERS_TABLE_NAME', 'bharat-tax-mitra-users')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-key')
JWT_EXPIRY = 24 * 60 * 60  # 24 hours
MAX_VERIFY_ATTEMPTS = 3
LOCKOUT_DURATION = 15 * 60  # 15 minutes

def get_otp_record(mobile_number: str, table) -> Optional[Dict[str, Any]]:
    """Retrieve OTP record from DynamoDB"""
    try:
        response = table.get_item(
            Key={'mobileNumber': mobile_number}
        )
        return response.get('Item')
    except Exception as e:
        print(f"Error retrieving OTP: {e}")
        return None

def verify_otp(mobile_number: str, otp: str, table) -> tuple[bool, str]:
    """Verify OTP and check expiry/attempts"""
    record = get_otp_record(mobile_number, table)
    
    if not record:
        return False, 'OTP not found or expired'
    
    current_time = int(time.time())
    
    # Check if OTP expired
    if current_time > record['expiresAt']:
        return False, 'OTP expired. Please request a new one.'
    
    # Check if already verified
    if record.get('verified', False):
        return False, 'OTP already used'
    
    # Check lockout
    if record.get('lockedUntil', 0) > current_time:
        return False, 'Account locked due to too many failed attempts'

    # Check attempts
    attempts = record.get('attempts', 0)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        # Lock account
        table.update_item(
            Key={'mobileNumber': mobile_number},
            UpdateExpression='SET lockedUntil = :lockout',
            ExpressionAttributeValues={
                ':lockout': current_time + LOCKOUT_DURATION
            }
        )
        return False, 'Too many failed attempts. Account locked for 15 minutes.'
    
    # Verify OTP
    if record['otp'] != otp:
        # Increment attempts
        table.update_item(
            Key={'mobileNumber': mobile_number},
            UpdateExpression='SET attempts = attempts + :inc',
            ExpressionAttributeValues={':inc': 1}
        )
        remaining = MAX_VERIFY_ATTEMPTS - attempts - 1
        return False, f'Invalid OTP. {remaining} attempts remaining.'
    
    # Mark as verified
    table.update_item(
        Key={'mobileNumber': mobile_number},
        UpdateExpression='SET verified = :verified',
        ExpressionAttributeValues={':verified': True}
    )
    
    return True, 'OTP verified successfully'

def encrypt_mobile(mobile_number: str) -> str:
    """Encrypt mobile number using KMS"""
    try:
        response = kms.encrypt(
            KeyId=os.environ.get('KMS_KEY_ID'),
            Plaintext=mobile_number.encode()
        )
        return response['CiphertextBlob'].hex()
    except Exception as e:
        print(f"Error encrypting mobile: {e}")
        # Fallback: hash for dev environment
        return hashlib.sha256(mobile_number.encode()).hexdigest()

def create_or_update_user(mobile_number: str, users_table) -> str:
    """Create or update user profile"""
    user_id = hashlib.sha256(mobile_number.encode()).hexdigest()[:16]
    encrypted_mobile = encrypt_mobile(mobile_number)
    current_time = int(time.time())

    try:
        users_table.put_item(
            Item={
                'userId': user_id,
                'mobileNumber': encrypted_mobile,
                'lastLoginAt': current_time,
                'createdAt': current_time,
                'updatedAt': current_time
            }
        )
    except Exception as e:
        print(f"Error creating user: {e}")
    
    return user_id

def generate_jwt_token(user_id: str, mobile_number: str) -> Dict[str, str]:
    """Generate JWT access and refresh tokens"""
    current_time = int(time.time())
    
    # Access token (24 hours)
    access_token = jwt.encode(
        {
            'userId': user_id,
            'mobile': mobile_number[-4:],  # Last 4 digits only
            'iat': current_time,
            'exp': current_time + JWT_EXPIRY
        },
        JWT_SECRET,
        algorithm='HS256'
    )
    
    # Refresh token (30 days)
    refresh_token = jwt.encode(
        {
            'userId': user_id,
            'type': 'refresh',
            'iat': current_time,
            'exp': current_time + (30 * 24 * 60 * 60)
        },
        JWT_SECRET,
        algorithm='HS256'
    )
    
    return {
        'accessToken': access_token,
        'refreshToken': refresh_token
    }

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for verifying OTP
    
    Request body:
    {
        "mobileNumber": "9876543210",
        "otp": "123456"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        mobile_number = body.get('mobileNumber', '').strip()
        otp = body.get('otp', '').strip()
        
        # Validate inputs
        if not mobile_number or len(mobile_number) != 10:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid mobile number'})
            }
        
        if not otp or len(otp) != 6:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid OTP'})
            }
        
        # Get tables
        otp_table = dynamodb.Table(OTP_TABLE_NAME)
        users_table = dynamodb.Table(USERS_TABLE_NAME)
        
        # Verify OTP
        is_valid, message = verify_otp(mobile_number, otp, otp_table)
        
        if not is_valid:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': message})
            }
        
        # Create or update user
        user_id = create_or_update_user(mobile_number, users_table)
        
        # Generate JWT tokens
        tokens = generate_jwt_token(user_id, mobile_number)
        
        # Log successful authentication (audit trail)
        print(f"User authenticated: {user_id}, mobile: {mobile_number[-4:].rjust(10, '*')}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Authentication successful',
                'userId': user_id,
                'accessToken': tokens['accessToken'],
                'refreshToken': tokens['refreshToken'],
                'expiresIn': JWT_EXPIRY
            })
        }
        
    except Exception as e:
        print(f"Error in verify_otp: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
