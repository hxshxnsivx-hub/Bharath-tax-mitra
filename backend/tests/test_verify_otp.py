"""
Unit tests for verify_otp Lambda.
Tests: valid OTP, expired OTP, wrong OTP, lockout, JWT structure.
"""
import json
import time
import pytest
import jwt

from tests.conftest import make_verify_event, seed_otp


def _handler():
    """Import handler lazily so env vars are set first."""
    from src.lambdas.auth.verify_otp import lambda_handler
    return lambda_handler


class TestVerifyOTPValidation:
    """Input validation tests."""

    def test_missing_mobile_returns_400(self, aws_mock, otp_table, users_table):
        event = {'body': json.dumps({'otp': '123456'}), 'headers': {}}
        resp = _handler()(event, None)
        assert resp['statusCode'] == 400

    def test_missing_otp_returns_400(self, aws_mock, otp_table, users_table):
        event = {'body': json.dumps({'mobileNumber': '9876543210'}), 'headers': {}}
        resp = _handler()(event, None)
        assert resp['statusCode'] == 400

    def test_short_otp_returns_400(self, aws_mock, otp_table, users_table):
        resp = _handler()(make_verify_event('9876543210', '12345'), None)
        assert resp['statusCode'] == 400

    def test_non_digit_otp_returns_400(self, aws_mock, otp_table, users_table):
        resp = _handler()(make_verify_event('9876543210', '12345X'), None)
        assert resp['statusCode'] == 400


class TestVerifyOTPSuccess:
    """Happy path tests."""

    def test_valid_otp_returns_200_with_tokens(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321')
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        assert resp['statusCode'] == 200
        body = json.loads(resp['body'])
        assert 'accessToken' in body
        assert 'refreshToken' in body
        assert 'userId' in body
        assert body['expiresIn'] == 86400  # 24 hours

    def test_access_token_contains_user_id_only(self, aws_mock, otp_table, users_table):
        """JWT must contain userId but NO phone number fragment (LOW-5 fix)."""
        seed_otp(otp_table, '9876543210', '654321')
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        body = json.loads(resp['body'])
        payload = jwt.decode(
            body['accessToken'],
            'test-secret-key-for-pytest-only',
            algorithms=['HS256']
        )
        assert 'userId' in payload
        assert 'mobile' not in payload  # No phone digits in JWT
        assert '3210' not in str(payload)  # Last 4 digits not present

    def test_valid_otp_marks_record_as_verified(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321')
        _handler()(make_verify_event('9876543210', '654321'), None)
        result = otp_table.query(
            KeyConditionExpression='mobileNumber = :m',
            ExpressionAttributeValues={':m': '9876543210'},
            ScanIndexForward=False, Limit=1
        )
        assert result['Items'][0]['verified'] is True

    def test_valid_otp_creates_user_in_users_table(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321')
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        body = json.loads(resp['body'])
        user_id = body['userId']
        result = users_table.get_item(Key={'userId': user_id})
        assert 'Item' in result


class TestVerifyOTPExpiry:
    """OTP expiry tests."""

    def test_expired_otp_returns_401(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321', expired=True)
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        assert resp['statusCode'] == 401
        body = json.loads(resp['body'])
        assert 'expired' in body['error'].lower()

    def test_already_verified_otp_returns_401(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321', verified=True)
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        assert resp['statusCode'] == 401
        body = json.loads(resp['body'])
        assert 'already used' in body['error'].lower()

    def test_nonexistent_otp_returns_401(self, aws_mock, otp_table, users_table):
        resp = _handler()(make_verify_event('9999999999', '000000'), None)
        assert resp['statusCode'] == 401


class TestVerifyOTPAttempts:
    """Wrong OTP and lockout tests."""

    def test_wrong_otp_returns_401_with_remaining_count(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321')
        resp = _handler()(make_verify_event('9876543210', '000000'), None)
        assert resp['statusCode'] == 401
        body = json.loads(resp['body'])
        assert '2' in body['error']  # '2 attempt(s) remaining'

    def test_three_wrong_otps_trigger_lockout(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321', attempts=2)  # already 2 failed
        resp = _handler()(make_verify_event('9876543210', '000000'), None)
        assert resp['statusCode'] == 401
        body = json.loads(resp['body'])
        assert 'locked' in body['error'].lower()

    def test_locked_account_returns_401_immediately(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321', locked=True)
        resp = _handler()(make_verify_event('9876543210', '654321'), None)
        assert resp['statusCode'] == 401
        body = json.loads(resp['body'])
        assert 'locked' in body['error'].lower()

    def test_wrong_attempts_incremented_in_dynamodb(self, aws_mock, otp_table, users_table):
        seed_otp(otp_table, '9876543210', '654321')
        _handler()(make_verify_event('9876543210', '000000'), None)
        result = otp_table.query(
            KeyConditionExpression='mobileNumber = :m',
            ExpressionAttributeValues={':m': '9876543210'},
            ScanIndexForward=False, Limit=1
        )
        assert result['Items'][0]['attempts'] == 1
