/**
 * ITR-1 (Sahaj) export types — mirrors shared/schemas/itr1-fy2025-26.schema.json.
 * The generator (frontend/src/services/itrExport.ts) produces this shape; the
 * Ajv/jsonschema validators check it against the schema of record.
 */

export interface ITR1SalaryDtl {
  EmployerName: string;
  TAN?: string;
  GrossSalary: number;
  Allowances: number;
  PerquisitesValue: number;
  ProfitsInLieuOfSalary: number;
  TotalSalary: number;
  StandardDeduction: number;
  EntertainmentAllowance: number;
  TaxOnEmployment: number;
  NetSalary: number;
}

export interface ITR1OtherIncomeDtl {
  SourceDescription: string;
  IncAmt: number;
}

export interface ITR1TDSonSalaryDtl {
  TAN?: string;
  EmployerName?: string;
  TaxDeducted: number;
}

export interface ITR1Export {
  ITR: {
    ITR1: {
      CreationInfo: {
        SWVersionNo: string;
        SWCreatedBy: string;
        JSONCreatedBy: string;
        JSONCreationDate: string;
      };
      Form_ITR1: {
        PersonalInfo: {
          AssesseeType: 'Individual';
          PAN: string;
          AadhaarCardNo?: string;
          DOB: string;
          EmployerCategory?: 'PSU' | 'GOVT' | 'PRIVATE' | 'OTHER';
          Name: { FirstName: string; MiddleName?: string; SurName: string };
          Address: {
            ResidenceNo?: string;
            RoadOrStreet?: string;
            LocalityOrArea?: string;
            CityOrTownOrDistrict: string;
            StateCode: string;
            PinCode: string;
            CountryCode: '91';
          };
        };
        FilingStatus: {
          ReturnFiledUnderSec: string;
          SeventhProviso139: 'Y' | 'N';
          FilingDate?: string;
          OriginalOrRevised: 'O' | 'R';
        };
        ITR1_IncomeDeductions: {
          Salary: { SalaryDtls: ITR1SalaryDtl[] };
          IncomeFromOS?: {
            IncOthThanOwnRaceHorse?: {
              OthersInc?: { OthersIncDtls: ITR1OtherIncomeDtl[] };
            };
          };
          TotalIncomeAfterDeductions: number;
        };
        TaxComputation: {
          TotalTaxPayable: number;
          Rebate87A: number;
          TaxPayableOnTI: number;
          Surcharge: number;
          EducationCess: number;
          GrossTaxLiability: number;
          Section89?: number;
          NetTaxLiability: number;
        };
        TaxPaid: {
          TDS?: { TDSonSalary: { TDSonSalaryDtls: ITR1TDSonSalaryDtl[] } };
          AdvanceTax: number;
          SelfAssessmentTax: number;
          TotalTaxesPaid: number;
        };
        Refund?: {
          RefundDue: number;
          BankAccountDtls?: { IFSCCode: string; BankName?: string; BankAccountNo: string };
        };
      };
    };
  };
}
