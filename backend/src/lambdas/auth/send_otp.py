"""
Send OTP Lambda Function
Generates and sends 6-digit OTP via Amazon SNS
"""
import json
import os
import random
import time
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError

# AWS clients
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

# Environment variables
OTP_TABLE_NAME = os.environ.get('OTP_TABLE_NAME', 'bharat-tax-mitra-otps')
RATE_LIMIT_WINDOW = 15 * 60  # 15 minutes in seconds
MAX_OTP_ATTEMPTS = 3

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def check_rate_limit(mobile_number: str, table) -> bool:
    """
    Check if user has exceeded rate limit (3 OTPs in 15 min).
    Uses GSI 'mobile-timestamp-index' on the OTP table.
    Raises RuntimeError if the GSI is not provisioned (infrastructure error).
    Returns True if rate limit exceeded, False if within limit.
    """
    try:
        current_time = int(time.time())
        window_start = current_time - RATE_LIMIT_WINDOW

        response = table.query(
            IndexName='mobile-timestamp-index',
            KeyConditionExpression='mobileNumber = :mobile AND #ts > :window_start',
            ExpressionAttributeNames={'#ts': 'timestamp'},
            ExpressionAttributeValues={
                ':mobile': mobile_number,
                ':window_start': window_start
            }
        )

        return len(response.get('Items', [])) >= MAX_OTP_ATTEMPTS

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code in ('ResourceNotFoundException', 'ValidationException'):
            # GSI or table not provisioned — fail loudly, do not silently bypass
            raise RuntimeError(
                f"OTP rate-limit GSI 'mobile-timestamp-index' not found on table '{OTP_TABLE_NAME}'. "
                "Ensure the CDK database stack has been deployed with the GSI."
            ) from e
        # Transient throttle errors — log and allow (conservative)
        print(f"Transient error checking rate limit ({error_code}): {e}")
        return False

def store_otp(mobile_number: str, otp: str, table) -> None:
    """Store OTP in DynamoDB with 5-minute TTL"""
    current_time = int(time.time())
    expires_at = current_time + (5 * 60)  # 5 minutes
    
    table.put_item(
        Item={
            'mobileNumber': mobile_number,
            'timestamp': current_time,
            'otp': otp,
            'expiresAt': expires_at,
            'attempts': 0,
            'verified': False
        }
    )

def send_sms(mobile_number: str, otp: str) -> bool:
    """
    Send OTP via Amazon SNS.
    SMS_MODE=mock: logs OTP to CloudWatch instead of calling SNS (for dev/staging).
    SMS_MODE=production: requires DLT_ENTITY_ID + DLT_TEMPLATE_ID env vars (TRAI mandate).
    """
    sms_mode = os.environ.get('SMS_MODE', 'mock')

    if sms_mode == 'mock':
        # Dev/staging: log OTP to CloudWatch, skip SNS
        print(f"[MOCK SMS] OTP for {mobile_number[-4:].rjust(10, '*')}: {otp}")
        return True

    # Production: requires DLT registration credentials
    dlt_entity_id = os.environ.get('DLT_ENTITY_ID')
    dlt_template_id = os.environ.get('DLT_TEMPLATE_ID')

    if not dlt_entity_id or not dlt_template_id:
        print("ERROR: DLT_ENTITY_ID and DLT_TEMPLATE_ID required in SMS_MODE=production")
        return False

    try:
        message = (
            f"Your Bharat Tax Mitra OTP is: {otp}. "
            "Valid for 5 minutes. Do not share with anyone."
        )

        sns.publish(
            PhoneNumber=f"+91{mobile_number}",
            Message=message,
            MessageAttributes={
                'AWS.SNS.SMS.SenderID': {
                    'DataType': 'String',
                    'StringValue': 'BTAXMTR'
                },
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                },
                'AWS.MM.SMS.OriginationNumber': {
                    'DataType': 'String',
                    'StringValue': 'BTAXMTR'
                },
                'AWS.SNS.SMS.EntityId': {
                    'DataType': 'String',
                    'StringValue': dlt_entity_id
                },
                'AWS.SNS.SMS.TemplateId': {
                    'DataType': 'String',
                    'StringValue': dlt_template_id
                }
            }
        )
        return True
    except ClientError as e:
        print(f"Error sending SMS via SNS: {e}")
        return False

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for sending OTP
    
    Request body:
    {
        "mobileNumber": "9876543210"
    }
    """
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        mobile_number = body.get('mobileNumber', '').strip()
        
        # Validate mobile number — must be exactly 10 digits
        if not mobile_number or len(mobile_number) != 10 or not mobile_number.isdigit():
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Invalid mobile number. Must be 10 digits.'
                })
            }

        # Get DynamoDB table
        table = dynamodb.Table(OTP_TABLE_NAME)
        
        # Check rate limit
        if check_rate_limit(mobile_number, table):
            return {
                'statusCode': 429,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Too many OTP requests. Please try again after 15 minutes.'
                })
            }
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP in DynamoDB
        store_otp(mobile_number, otp, table)
        
        # Send OTP via SNS
        sms_sent = send_sms(mobile_number, otp)
        
        if not sms_sent:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Failed to send OTP. Please try again.'
                })
            }
        
        # Log to CloudWatch (audit trail)
        print(f"OTP sent to mobile: {mobile_number[-4:].rjust(10, '*')}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'OTP sent successfully',
                'expiresIn': 300  # 5 minutes
            })
        }
        
    except RuntimeError as e:
        # Infrastructure errors (missing table/GSI) — propagate as 503
        print(f"Infrastructure error in send_otp: {e}")
        return {
            'statusCode': 503,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Service configuration error. Contact support.'})
        }
    except Exception as e:
        print(f"Error in send_otp: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
