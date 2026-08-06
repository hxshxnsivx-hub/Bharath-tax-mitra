"""
ITR-1 schema is valid & enforceable (tasks 3.2.1a / 3.2.2, OPT-P3.1).

The frontend generator (itrExport.ts) is exercised by the Vitest suite; here we
prove the SAME canonical schema file the backend export Lambda will use is a
well-formed draft-07 schema and actually rejects malformed ITR JSON. One schema,
two validators — an export that passes the client cannot be rejected server-side
for a shape mismatch.
"""

import json
import os

import pytest

try:
    import jsonschema
    from jsonschema import Draft7Validator
except ImportError:  # pragma: no cover
    jsonschema = None

_SCHEMA_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "shared", "schemas", "itr1-fy2025-26.schema.json"
)

with open(_SCHEMA_PATH, encoding="utf-8") as fh:
    SCHEMA = json.load(fh)


def _valid_itr1() -> dict:
    return {
        "ITR": {
            "ITR1": {
                "CreationInfo": {
                    "SWVersionNo": "1.0.0",
                    "SWCreatedBy": "BharatTaxMitra",
                    "JSONCreatedBy": "BharatTaxMitra",
                    "JSONCreationDate": "2026-07-13",
                },
                "Form_ITR1": {
                    "PersonalInfo": {
                        "AssesseeType": "Individual",
                        "PAN": "ABCDE1234F",
                        "DOB": "1990-06-15",
                        "Name": {"FirstName": "Ravi", "SurName": "Sharma"},
                        "Address": {
                            "CityOrTownOrDistrict": "Bengaluru",
                            "StateCode": "KA",
                            "PinCode": "560001",
                            "CountryCode": "91",
                        },
                    },
                    "FilingStatus": {
                        "ReturnFiledUnderSec": "11",
                        "SeventhProviso139": "N",
                        "OriginalOrRevised": "O",
                    },
                    "ITR1_IncomeDeductions": {
                        "Salary": {
                            "SalaryDtls": [
                                {
                                    "EmployerName": "Acme",
                                    "GrossSalary": 1200000,
                                    "TotalSalary": 1200000,
                                    "StandardDeduction": 50000,
                                    "NetSalary": 1150000,
                                }
                            ]
                        },
                        "TotalIncomeAfterDeductions": 1150000,
                    },
                    "TaxComputation": {
                        "TotalTaxPayable": 85800,
                        "Rebate87A": 0,
                        "TaxPayableOnTI": 82500,
                        "Surcharge": 0,
                        "EducationCess": 3300,
                        "GrossTaxLiability": 85800,
                        "NetTaxLiability": 85800,
                    },
                    "TaxPaid": {
                        "AdvanceTax": 0,
                        "SelfAssessmentTax": 0,
                        "TotalTaxesPaid": 90000,
                    },
                },
            }
        }
    }


@pytest.mark.skipif(jsonschema is None, reason="jsonschema not installed")
def test_schema_is_valid_draft7():
    Draft7Validator.check_schema(SCHEMA)


@pytest.mark.skipif(jsonschema is None, reason="jsonschema not installed")
def test_accepts_a_well_formed_itr1():
    jsonschema.validate(_valid_itr1(), SCHEMA)


@pytest.mark.skipif(jsonschema is None, reason="jsonschema not installed")
def test_rejects_bad_pan_with_field_path():
    payload = _valid_itr1()
    payload["ITR"]["ITR1"]["Form_ITR1"]["PersonalInfo"]["PAN"] = "NOTAPAN"
    errors = list(Draft7Validator(SCHEMA).iter_errors(payload))
    assert errors, "invalid PAN must be rejected"
    assert any("PAN" in list(e.absolute_path) for e in errors)


@pytest.mark.skipif(jsonschema is None, reason="jsonschema not installed")
def test_rejects_unexpected_field():
    payload = _valid_itr1()
    payload["ITR"]["ITR1"]["Form_ITR1"]["PersonalInfo"]["Nickname"] = "Ravi"
    errors = list(Draft7Validator(SCHEMA).iter_errors(payload))
    assert errors, "additionalProperties:false must reject unknown fields"


@pytest.mark.skipif(jsonschema is None, reason="jsonschema not installed")
def test_rejects_missing_required_salary():
    payload = _valid_itr1()
    del payload["ITR"]["ITR1"]["Form_ITR1"]["ITR1_IncomeDeductions"]["Salary"]
    errors = list(Draft7Validator(SCHEMA).iter_errors(payload))
    assert errors, "missing required Salary must be rejected"
