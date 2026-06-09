"""
Pytest fixtures for Bharat Tax Mitra backend tests.
Uses moto to mock AWS services (DynamoDB, SNS, KMS) without real AWS calls.
"""
import os
import time
import pytest
import boto3
from moto import mock_aws

# Set required env vars before importing any Lambda code
os.environ.setdefault('OTP_TABLE_NAME', 'bharat-tax-mitra-otps-test')
os.environ.setdefault('USERS_TABLE_NAME', 'bharat-tax-mitra-users-test')
os.environ.setdefault('JWT_SECRET', 'test-secret-key-for-pytest-only')
os.environ.setdefault('SMS_MODE', 'mock')  # No real SNS calls in tests
os.environ.setdefault('AWS_DEFAULT_REGION', 'ap-south-1')
os.environ.setdefault('AWS_ACCESS_KEY_ID', 'test')
os.environ.setdefault('AWS_SECRET_ACCESS_KEY', 'test')


@pytest.fixture(scope='function')
def aws_mock():
    """Start moto AWS mock for each test function."""
    with mock_aws():
        yield


@pytest.fixture(scope='function')
def otp_table(aws_mock):
    """Create a mock OTP DynamoDB table with composite key + GSI."""
    dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
    table = dynamodb.create_table(
        TableName='bharat-tax-mitra-otps-test',
        KeySchema=[
            {'AttributeName': 'mobileNumber', 'KeyType': 'HASH'},
            {'AttributeName': 'timestamp', 'KeyType': 'RANGE'},
        ],
        AttributeDefinitions=[
            {'AttributeName': 'mobileNumber', 'AttributeType': 'S'},
            {'AttributeName': 'timestamp', 'AttributeType': 'N'},
        ],
        GlobalSecondaryIndexes=[
            {
                'IndexName': 'mobile-timestamp-index',
                'KeySchema': [
                    {'AttributeName': 'mobileNumber', 'KeyType': 'HASH'},
                    {'AttributeName': 'timestamp', 'KeyType': 'RANGE'},
                ],
                'Projection': {'ProjectionType': 'ALL'},
            }
        ],
        BillingMode='PAY_PER_REQUEST',
    )
    table.meta.client.get_waiter('table_exists').wait(
        TableName='bharat-tax-mitra-otps-test'
    )
    return table


@pytest.fixture(scope='function')
def users_table(aws_mock):
    """Create a mock Users DynamoDB table."""
    dynamodb = boto3.resource('dynamodb', region_name='ap-south-1')
    table = dynamodb.create_table(
        TableName='bharat-tax-mitra-users-test',
        KeySchema=[
            {'AttributeName': 'userId', 'KeyType': 'HASH'},
        ],
        AttributeDefinitions=[
            {'AttributeName': 'userId', 'AttributeType': 'S'},
        ],
        BillingMode='PAY_PER_REQUEST',
    )
    table.meta.client.get_waiter('table_exists').wait(
        TableName='bharat-tax-mitra-users-test'
    )
    return table


def make_otp_event(mobile_number: str) -> dict:
    """Build a mock API Gateway event for send-otp."""
    import json
    return {
        'body': json.dumps({'mobileNumber': mobile_number}),
        'headers': {'Content-Type': 'application/json'},
    }


def make_verify_event(mobile_number: str, otp: str) -> dict:
    """Build a mock API Gateway event for verify-otp."""
    import json
    return {
        'body': json.dumps({'mobileNumber': mobile_number, 'otp': otp}),
        'headers': {'Content-Type': 'application/json'},
    }


def seed_otp(otp_table, mobile_number: str, otp: str,
             expired: bool = False, verified: bool = False,
             attempts: int = 0, locked: bool = False) -> None:
    """Seed an OTP record directly into the test table."""
    now = int(time.time())
    otp_table.put_item(Item={
        'mobileNumber': mobile_number,
        'timestamp': now - (1 if not expired else 400),
        'otp': otp,
        'expiresAt': (now - 1) if expired else (now + 300),
        'attempts': attempts,
        'verified': verified,
        'lockedUntil': (now + 900) if locked else 0,
    })
