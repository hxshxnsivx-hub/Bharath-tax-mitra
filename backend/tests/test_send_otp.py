"""
Unit tests for send_otp Lambda.
Tests: valid flow, validation, rate limiting, mock SMS mode.
"""
import json
import time
import pytest
from unittest.mock import patch

from tests.conftest import make_otp_event, seed_otp


def _handler():
    """Import handler lazily so env vars are set first."""
    from src.lambdas.auth.send_otp import lambda_handler
    return lambda_handler


class TestSendOTPValidation:
    """Input validation tests."""

    def test_missing_mobile_returns_400(self, aws_mock, otp_table):
        event = {'body': json.dumps({}), 'headers': {}}
        resp = _handler()(event, None)
        assert resp['statusCode'] == 400
        assert 'mobile' in resp['body'].lower() or 'invalid' in resp['body'].lower()

    def test_short_mobile_returns_400(self, aws_mock, otp_table):
        resp = _handler()(make_otp_event('98765'), None)
        assert resp['statusCode'] == 400

    def test_non_digit_mobile_returns_400(self, aws_mock, otp_table):
        resp = _handler()(make_otp_event('987654321X'), None)
        assert resp['statusCode'] == 400

    def test_11_digit_mobile_returns_400(self, aws_mock, otp_table):
        resp = _handler()(make_otp_event('98765432101'), None)
        assert resp['statusCode'] == 400


class TestSendOTPSuccess:
    """Happy path tests."""

    def test_valid_mobile_returns_200(self, aws_mock, otp_table):
        resp = _handler()(make_otp_event('9876543210'), None)
        assert resp['statusCode'] == 200
        body = json.loads(resp['body'])
        assert body.get('message') == 'OTP sent successfully'
        assert body.get('expiresIn') == 300

    def test_otp_stored_in_dynamodb(self, aws_mock, otp_table):
        _handler()(make_otp_event('9876543210'), None)
        result = otp_table.query(
            KeyConditionExpression='mobileNumber = :m',
            ExpressionAttributeValues={':m': '9876543210'}
        )
        assert len(result['Items']) == 1
        item = result['Items'][0]
        assert len(item['otp']) == 6
        assert item['otp'].isdigit()
        assert item['verified'] is False
        assert item['attempts'] == 0

    def test_otp_has_5_minute_ttl(self, aws_mock, otp_table):
        _handler()(make_otp_event('9876543210'), None)
        result = otp_table.query(
            KeyConditionExpression='mobileNumber = :m',
            ExpressionAttributeValues={':m': '9876543210'}
        )
        item = result['Items'][0]
        now = int(time.time())
        assert item['expiresAt'] > now
        assert item['expiresAt'] <= now + 301  # within 5 min + 1s tolerance

    def test_sms_mode_mock_does_not_call_sns(self, aws_mock, otp_table):
        """In SMS_MODE=mock, SNS publish must NOT be called."""
        with patch('src.lambdas.auth.send_otp.sns') as mock_sns:
            resp = _handler()(make_otp_event('9876543210'), None)
            assert resp['statusCode'] == 200
            mock_sns.publish.assert_not_called()


class TestSendOTPRateLimit:
    """Rate limiting tests."""

    def test_first_three_otps_succeed(self, aws_mock, otp_table):
        mobile = '9000000001'
        for _ in range(3):
            resp = _handler()(make_otp_event(mobile), None)
            assert resp['statusCode'] == 200

    def test_fourth_otp_returns_429(self, aws_mock, otp_table):
        mobile = '9000000002'
        # Seed 3 existing OTPs within the 15-min window
        now = int(time.time())
        for i in range(3):
            otp_table.put_item(Item={
                'mobileNumber': mobile,
                'timestamp': now - i * 60,   # 0, 1, 2 minutes ago
                'otp': '111111',
                'expiresAt': now + 300,
                'attempts': 0,
                'verified': False,
                'lockedUntil': 0,
            })
        resp = _handler()(make_otp_event(mobile), None)
        assert resp['statusCode'] == 429
        body = json.loads(resp['body'])
        assert '15 minutes' in body['error'] or 'too many' in body['error'].lower()

    def test_old_otps_outside_window_do_not_count(self, aws_mock, otp_table):
        mobile = '9000000003'
        # Seed 3 OTPs older than 15 minutes — should NOT count
        now = int(time.time())
        for i in range(3):
            otp_table.put_item(Item={
                'mobileNumber': mobile,
                'timestamp': now - 1000 - i,  # >15 min ago
                'otp': '111111',
                'expiresAt': now - 700,        # already expired
                'attempts': 0,
                'verified': False,
                'lockedUntil': 0,
            })
        # 4th OTP should succeed since old ones are outside window
        resp = _handler()(make_otp_event(mobile), None)
        assert resp['statusCode'] == 200
