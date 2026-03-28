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
    """Check if user has exceeded rate limit (3 OTP in 15 min)"""
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
    except Exception as e:
        print(f"Error checking rate limit: {e}")
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
    """Send OTP via Amazon SNS"""
    try:
        message = f"Your Bharat Tax Mitra OTP is: {otp}. Valid for 5 minutes. Do not share with anyone."
        
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
                }
            }
        )
        return True
    except ClientError as e:
        print(f"Error sending SMS: {e}")
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
        
        # Validate mobile number
        if not mobile_number or len(mobile_number) != 10:
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
        
    except Exception as e:
        print(f"Error in send_otp: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }
