"""
Verify OTP Lambda Function
Validates OTP and generates JWT tokens.

Design decisions:
- Composite PK (mobileNumber + timestamp) — query pattern for most-recent OTP (BLOCKER-5 fix)
- JWT_SECRET loaded from environment — no hardcoded fallback (BLOCKER-2 fix)
- JWT payload contains only userId — no phone number fragment (LOW-5 fix)
"""
import json
import os
import time
from typing import Dict, Any, Optional
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError
import jwt
import hashlib

# AWS clients
dynamodb = boto3.resource('dynamodb')
kms = boto3.client('kms')

# Environment variables — fail loudly if missing (BLOCKER-2: no fallback allowed)
OTP_TABLE_NAME = os.environ.get('OTP_TABLE_NAME', 'bharat-tax-mitra-otps')
USERS_TABLE_NAME = os.environ.get('USERS_TABLE_NAME', 'bharat-tax-mitra-users')
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise EnvironmentError(
        "JWT_SECRET environment variable is required. "
        "Check SSM Parameter Store and CDK auth stack configuration."
    )

JWT_EXPIRY = 24 * 60 * 60          # 24 hours
REFRESH_EXPIRY = 30 * 24 * 60 * 60  # 30 days
MAX_VERIFY_ATTEMPTS = 3
LOCKOUT_DURATION = 15 * 60          # 15 minutes


def get_otp_record(mobile_number: str, table) -> Optional[Dict[str, Any]]:
    """
    Retrieve the most recent OTP record for a mobile number.

    Uses query (ScanIndexForward=False, Limit=1) because the table has
    composite key: mobileNumber (PK) + timestamp (SK). (BLOCKER-5 / task 0.8.1)
    """
    try:
        response = table.query(
            KeyConditionExpression=Key('mobileNumber').eq(mobile_number),
            ScanIndexForward=False,  # Most recent first
            Limit=1
        )
        items = response.get('Items', [])
        return items[0] if items else None
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceNotFoundException':
            # Infrastructure not provisioned — fail loudly, do not silently bypass
            raise RuntimeError(
                f"OTP table '{OTP_TABLE_NAME}' not found. "
                "Ensure the CDK database stack has been deployed."
            ) from e
        # Transient errors (throttle, etc.) — log and return None
        print(f"Transient error retrieving OTP: {error_code} — {e}")
        return None


def verify_otp_record(mobile_number: str, otp: str, table) -> tuple:
    """
    Verify OTP and check expiry / attempt count.
    Returns (is_valid: bool, message: str).
    """
    record = get_otp_record(mobile_number, table)

    if not record:
        return False, 'OTP not found or expired'

    current_time = int(time.time())

    # Check if OTP expired
    if current_time > record.get('expiresAt', 0):
        return False, 'OTP expired. Please request a new one.'

    # Check if already verified (prevent replay attacks)
    if record.get('verified', False):
        return False, 'OTP already used'

    # Check lockout
    if record.get('lockedUntil', 0) > current_time:
        return False, 'Account locked due to too many failed attempts. Please wait 15 minutes.'

    attempts = record.get('attempts', 0)
    if attempts >= MAX_VERIFY_ATTEMPTS:
        # Lock the account
        table.update_item(
            Key={'mobileNumber': mobile_number, 'timestamp': record['timestamp']},
            UpdateExpression='SET lockedUntil = :lockout',
            ExpressionAttributeValues={':lockout': current_time + LOCKOUT_DURATION}
        )
        return False, 'Too many failed attempts. Account locked for 15 minutes.'

    # Verify OTP value
    if record.get('otp') != otp:
        new_attempts = attempts + 1
        if new_attempts >= MAX_VERIFY_ATTEMPTS:
            # This attempt exhausts the limit — lock immediately
            table.update_item(
                Key={'mobileNumber': mobile_number, 'timestamp': record['timestamp']},
                UpdateExpression='SET attempts = attempts + :inc, lockedUntil = :lockout',
                ExpressionAttributeValues={
                    ':inc': 1,
                    ':lockout': current_time + LOCKOUT_DURATION,
                }
            )
            return False, 'Too many failed attempts. Account locked for 15 minutes.'
        table.update_item(
            Key={'mobileNumber': mobile_number, 'timestamp': record['timestamp']},
            UpdateExpression='SET attempts = attempts + :inc',
            ExpressionAttributeValues={':inc': 1}
        )
        remaining = MAX_VERIFY_ATTEMPTS - new_attempts
        return False, f'Invalid OTP. {remaining} attempt(s) remaining.'

    # Mark as verified to prevent replay
    table.update_item(
        Key={'mobileNumber': mobile_number, 'timestamp': record['timestamp']},
        UpdateExpression='SET verified = :verified',
        ExpressionAttributeValues={':verified': True}
    )
    return True, 'OTP verified successfully'


def encrypt_mobile(mobile_number: str) -> str:
    """
    Encrypt mobile number using KMS.
    Falls back to SHA-256 hash in dev/staging if KMS_KEY_ID not set.
    """
    kms_key_id = os.environ.get('KMS_KEY_ID')
    if not kms_key_id:
        # Dev/staging only — not reversible, not suitable for production
        print("WARNING: KMS_KEY_ID not set. Using SHA-256 hash. Not suitable for production.")
        return hashlib.sha256(mobile_number.encode()).hexdigest()
    try:
        response = kms.encrypt(
            KeyId=kms_key_id,
            Plaintext=mobile_number.encode()
        )
        return response['CiphertextBlob'].hex()
    except ClientError as e:
        print(f"KMS encryption failed: {e}. Falling back to hash.")
        return hashlib.sha256(mobile_number.encode()).hexdigest()


def create_or_update_user(mobile_number: str, users_table) -> str:
    """Create or update user profile in DynamoDB."""
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
    except ClientError as e:
        print(f"Error creating/updating user {user_id}: {e}")
        # Do not raise — user creation failure should not block auth

    return user_id


def generate_jwt_token(user_id: str) -> Dict[str, str]:
    """
    Generate JWT access and refresh tokens.
    LOW-5 fix: payload contains only userId — no phone number fragment.
    """
    current_time = int(time.time())

    access_token = jwt.encode(
        {
            'userId': user_id,
            'iat': current_time,
            'exp': current_time + JWT_EXPIRY
        },
        JWT_SECRET,
        algorithm='HS256'
    )

    refresh_token = jwt.encode(
        {
            'userId': user_id,
            'type': 'refresh',
            'iat': current_time,
            'exp': current_time + REFRESH_EXPIRY
        },
        JWT_SECRET,
        algorithm='HS256'
    )

    return {'accessToken': access_token, 'refreshToken': refresh_token}


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for verifying OTP.

    Request body: { "mobileNumber": "9876543210", "otp": "123456" }
    """
    try:
        body = json.loads(event.get('body', '{}'))
        mobile_number = body.get('mobileNumber', '').strip()
        otp = body.get('otp', '').strip()

        if not mobile_number or len(mobile_number) != 10 or not mobile_number.isdigit():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid mobile number — must be 10 digits'})
            }

        if not otp or len(otp) != 6 or not otp.isdigit():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid OTP — must be 6 digits'})
            }

        otp_table = dynamodb.Table(OTP_TABLE_NAME)
        users_table = dynamodb.Table(USERS_TABLE_NAME)

        is_valid, message = verify_otp_record(mobile_number, otp, otp_table)

        if not is_valid:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': message})
            }

        user_id = create_or_update_user(mobile_number, users_table)
        tokens = generate_jwt_token(user_id)

        print(f"User authenticated: userId={user_id}")

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

    except RuntimeError as e:
        # Infrastructure errors (missing table, etc.) — propagate as 503
        print(f"Infrastructure error in verify_otp: {e}")
        return {
            'statusCode': 503,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Service configuration error. Contact support.'})
        }
    except Exception as e:
        print(f"Unexpected error in verify_otp: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Internal server error'})
        }
