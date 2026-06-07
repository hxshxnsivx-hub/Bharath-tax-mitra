import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuthState } from '../App';
import { ConnectivityIndicator } from '../components/ConnectivityIndicator';
import { PersonalInfoForm } from '../components/PersonalInfoForm';
import { SalaryIncomeForm } from '../components/SalaryIncomeForm';
import { DeductionsForm } from '../components/DeductionsForm';
import { BusinessIncomeForm } from '../components/BusinessIncomeForm';
import { RegimeComparison } from '../components/RegimeComparison';
import { TaxBreakdown } from '../components/TaxBreakdown';
import { TaxSummaryDashboard } from '../components/TaxSummaryDashboard';
import { TaxCalculator } from '../services/taxCalculator';
import { defaultTaxRules } from '../services/taxRulesService';
import { db } from '../lib/db';
import { SUPPORTED_LANGUAGES } from '../i18n/config';

interface MainAppProps {
  authState: AuthState;
  onLogout: () => void;
}

type AppTab = 'home' | 'tax' | 'chat' | 'export' | 'settings';
type TaxStep = 'personal' | 'salary' | 'deductions' | 'business' | 'calculate' | 'results';

const TAX_STEPS: { id: TaxStep; label: string; icon: string }[] = [
  { id: 'personal', label: 'Personal Info', icon: '👤' },
  { id: 'salary', label: 'Salary', icon: '💼' },
  { id: 'deductions', label: 'Deductions', icon: '📋' },
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'results', label: 'Results', icon: '📊' },
];

export function MainApp({ authState, onLogout }: MainAppProps) {
  const { i18n } = useTranslation();
  const sessionId = `session-${authState.userId || 'local'}-2025-26`;
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [taxStep, setTaxStep] = useState<TaxStep>('personal');
  const [completenessScore, setCompletenessScore] = useState(0);
  const [selectedRegime, setSelectedRegime] = useState<'old' | 'new'>(authState.preferredRegime);
  const [regimeComparison, setRegimeComparison] = useState<any>(null);
  const [taxData, setTaxData] = useState({
    personalInfo: {},
    salary: null as any,
    deductions: null as any,
    business: null as any,
  });

  useEffect(() => {
    if (authState.preferredLanguage) {
      i18n.changeLanguage(authState.preferredLanguage);
    }
  }, [authState.preferredLanguage]);

  // Calculate completeness score
  useEffect(() => {
    let score = 0;
    if (Object.keys(taxData.personalInfo).length > 0) score += 25;
    if (taxData.salary) score += 35;
    if (taxData.deductions) score += 25;
    if (regimeComparison) score += 15;
    setCompletenessScore(score);
  }, [taxData, regimeComparison]);

  const handleCalculateTax = useCallback((income: any, deductions: any) => {
    try {
      const calculator = new TaxCalculator(defaultTaxRules);
      // Pass personalInfo so senior/super-senior slabs are applied correctly (design HIGH-1)
      const personalInfo = taxData.personalInfo as any;
      const comparison = calculator.compareRegimes(income, deductions, personalInfo?.age ? {
        pan: personalInfo.pan || '',
        name: personalInfo.fullName || '',
        dateOfBirth: personalInfo.dob || '',
        age: personalInfo.age || 30,
        isSeniorCitizen: (personalInfo.age || 0) >= 60,
        isSuperSeniorCitizen: (personalInfo.age || 0) >= 80,
        residentialStatus: 'resident' as const,
      } : undefined);
      setRegimeComparison(comparison);
      setTaxStep('results');
    } catch (error) {
      console.error('Tax calculation error:', error);
    }
  }, [taxData.personalInfo]);

  const handlePersonalInfoSave = (data: any) => {
    setTaxData(prev => ({ ...prev, personalInfo: data }));
    setTaxStep('salary');
  };

  const handleSalarySave = (data: any) => {
    setTaxData(prev => ({ ...prev, salary: data }));
    setTaxStep('deductions');
  };

  const handleDeductionsSave = (data: any) => {
    setTaxData(prev => ({ ...prev, deductions: data }));
    setTaxStep('business');
  };

  const handleBusinessSave = (data: any) => {
    setTaxData(prev => ({ ...prev, business: data }));
    if (taxData.salary && data) {
      const income = buildIncomeData(taxData.salary, data);
      const deductions = buildDeductionData(taxData.deductions, taxData.salary);
      handleCalculateTax(income, deductions);
    } else {
      setTaxStep('results');
    }
  };

  const skipToResults = () => {
    if (taxData.salary && taxData.deductions) {
      const income = buildIncomeData(taxData.salary, taxData.business);
      const deductions = buildDeductionData(taxData.deductions, taxData.salary);
      handleCalculateTax(income, deductions);
    } else {
      setTaxStep('results');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center text-blue-900 font-bold text-sm">
              भ
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">Bharat Tax Mitra</div>
              <div className="text-blue-200 text-xs">FY 2025-26</div>
            </div>
          </div>

          {/* Center: Completeness */}
          {activeTab === 'tax' && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="text-xs text-blue-200">Return complete</div>
              <div className="w-24 bg-blue-700 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completenessScore}%` }}
                />
              </div>
              <div className="text-xs font-bold text-amber-400">{completenessScore}%</div>
            </div>
          )}

          {/* Right: Connectivity + Lang */}
          <div className="flex items-center space-x-3">
            <ConnectivityIndicator />
            <LanguageSwitcher currentLang={i18n.language} />
            <button
              onClick={onLogout}
              className="text-xs text-blue-200 hover:text-white transition-colors px-2 py-1 rounded"
              id="logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {activeTab === 'home' && <HomePage onStartFiling={() => setActiveTab('tax')} authState={authState} completenessScore={completenessScore} />}
        {activeTab === 'tax' && (
          <TaxWizard
            taxStep={taxStep}
            setTaxStep={setTaxStep}
            taxData={taxData}
            regimeComparison={regimeComparison}
            selectedRegime={selectedRegime}
            setSelectedRegime={setSelectedRegime}
            completenessScore={completenessScore}
            sessionId={sessionId}
            onPersonalSave={handlePersonalInfoSave}
            onSalarySave={handleSalarySave}
            onDeductionsSave={handleDeductionsSave}
            onBusinessSave={handleBusinessSave}
            skipToResults={skipToResults}
          />
        )}
        {activeTab === 'chat' && <ChatPlaceholder />}
        {activeTab === 'export' && <ExportPlaceholder regimeComparison={regimeComparison} completenessScore={completenessScore} />}
        {activeTab === 'settings' && <SettingsPage onLogout={onLogout} authState={authState} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} completenessScore={completenessScore} />
    </div>
  );
}

/* ── Home Page ──────────────────────────────────────────────── */

function HomePage({ onStartFiling, completenessScore }: any) {
  const isReturningUser = completenessScore > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-800 rounded-2xl p-6 text-white">
        <div className="text-2xl font-bold mb-1">नमस्ते! 🙏</div>
        <div className="text-blue-200 text-sm mb-4">FY 2025-26 Tax Filing</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-amber-400">{completenessScore}%</div>
            <div className="text-blue-200 text-xs mt-1">Return Complete</div>
          </div>
          <div className="w-20 h-20 relative">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"
              />
              <path
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${completenessScore}, 100`}
              />
            </svg>
          </div>
        </div>
        <button
          id="start-filing-btn"
          onClick={onStartFiling}
          className="mt-4 w-full py-3 bg-amber-400 text-blue-900 font-bold rounded-xl hover:bg-amber-300 transition-colors"
        >
          {isReturningUser ? '📝 Continue Filing' : '🚀 Start Filing Now'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl mb-1">📄</div>
          <div className="text-sm font-semibold text-gray-800">Documents</div>
          <div className="text-xs text-gray-500 mt-1">Upload Form-16 or AIS</div>
          <div className="text-xs text-amber-600 font-medium mt-2">Coming soon</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl mb-1">🤖</div>
          <div className="text-sm font-semibold text-gray-800">AI Assistant</div>
          <div className="text-xs text-gray-500 mt-1">Tax questions answered</div>
          <div className="text-xs text-amber-600 font-medium mt-2">Coming soon</div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-700">What You Can Do</div>
        </div>
        {[
          { icon: '💰', title: 'Calculate Tax', desc: 'Old Regime vs New Regime comparison', action: onStartFiling },
          { icon: '📊', title: 'View Breakdown', desc: 'Slab-wise tax and deduction analysis', action: onStartFiling },
          { icon: '⬇️', title: 'Export ITR JSON', desc: 'Ready for IT Portal upload', action: onStartFiling },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="w-full flex items-center px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-2xl mr-3">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* Privacy notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start space-x-2">
          <span className="text-green-600 mt-0.5">🔒</span>
          <div>
            <div className="text-xs font-semibold text-green-800">Privacy Protected</div>
            <div className="text-xs text-green-700 mt-0.5">
              All data encrypted locally. Documents auto-deleted after 24 hours. Your data stays private.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Tax Wizard ─────────────────────────────────────────────── */

interface TaxWizardProps {
  taxStep: TaxStep;
  setTaxStep: (step: TaxStep) => void;
  taxData: any;
  regimeComparison: any;
  selectedRegime: 'old' | 'new';
  setSelectedRegime: (r: 'old' | 'new') => void;
  completenessScore: number;
  sessionId: string;
  onPersonalSave: (data: any) => void;
  onSalarySave: (data: any) => void;
  onDeductionsSave: (data: any) => void;
  onBusinessSave: (data: any) => void;
  skipToResults: () => void;
}

function TaxWizard({
  taxStep, setTaxStep, taxData, regimeComparison, selectedRegime, setSelectedRegime,
  completenessScore, sessionId, onPersonalSave, onSalarySave, onDeductionsSave, onBusinessSave, skipToResults
}: TaxWizardProps) {
  const currentStepIndex = TAX_STEPS.findIndex(s => s.id === taxStep);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Step Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {TAX_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setTaxStep(step.id)}
              className={`flex flex-col items-center flex-1 ${index < TAX_STEPS.length - 1 ? 'mr-1' : ''}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                index < currentStepIndex
                  ? 'bg-green-500 text-white'
                  : index === currentStepIndex
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index < currentStepIndex ? '✓' : step.icon}
              </div>
              <div className={`text-xs mt-1 hidden sm:block truncate ${
                index === currentStepIndex ? 'text-blue-600 font-semibold' : 'text-gray-400'
              }`}>
                {step.label}
              </div>
              {index < TAX_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mt-4 hidden sm:block ${
                  index < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'
                }`} style={{ position: 'absolute', left: 0, right: 0 }} />
              )}
            </button>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / TAX_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      {taxStep === 'personal' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            <button
              onClick={() => setTaxStep('salary')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Skip →
            </button>
          </div>
          <PersonalInfoForm
            sessionId={sessionId}
            onSave={onPersonalSave}
            initialData={taxData.personalInfo}
          />
        </div>
      )}

      {taxStep === 'salary' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Salary Income</h2>
            <button
              onClick={() => setTaxStep('deductions')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Skip →
            </button>
          </div>
          <SalaryIncomeForm
            sessionId={sessionId}
            onSave={onSalarySave}
            initialData={taxData.salary}
          />
        </div>
      )}

      {taxStep === 'deductions' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Deductions (Chapter VI-A)</h2>
            <button
              onClick={() => setTaxStep('business')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Skip →
            </button>
          </div>
          <DeductionsForm
            sessionId={sessionId}
            onSave={onDeductionsSave}
            initialData={taxData.deductions}
            basicSalary={taxData.salary?.basicSalary || 0}
          />
        </div>
      )}

      {taxStep === 'business' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Business Income (Sec. 44AD)</h2>
            <button
              onClick={skipToResults}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Skip → Calculate
            </button>
          </div>
          <BusinessIncomeForm
            sessionId={sessionId}
            onSave={onBusinessSave}
            initialData={taxData.business}
          />
        </div>
      )}

      {taxStep === 'results' && (
        <div className="space-y-8">
          {regimeComparison ? (
            <>
              {/* Tax Summary */}
              <TaxSummaryDashboard
                result={
                  selectedRegime === 'new'
                    ? regimeComparison.newRegime
                    : regimeComparison.oldRegime
                }
                comparison={regimeComparison}
                tdsPaid={
                  (taxData.salary?.tdsQ1 || 0) +
                  (taxData.salary?.tdsQ2 || 0) +
                  (taxData.salary?.tdsQ3 || 0) +
                  (taxData.salary?.tdsQ4 || 0)
                }
                completenessScore={completenessScore}
                onRegimeSwitch={() =>
                  setSelectedRegime(selectedRegime === 'old' ? 'new' : 'old')
                }
              />

              {/* Regime Comparison */}
              <RegimeComparison
                comparison={regimeComparison}
                selectedRegime={selectedRegime}
                onRegimeSelect={setSelectedRegime}
              />

              {/* Tax Breakdown */}
              <TaxBreakdown
                result={
                  selectedRegime === 'new'
                    ? regimeComparison.newRegime
                    : regimeComparison.oldRegime
                }
              />
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Calculation Yet</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Please fill in your salary and deductions to calculate tax
              </p>
              <button
                onClick={() => setTaxStep('salary')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Enter Salary Details
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Language Switcher ──────────────────────────────────────── */

function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-blue-200 hover:text-white flex items-center space-x-1 px-2 py-1 rounded"
        id="lang-switcher-btn"
      >
        <span>{current?.nativeName || 'EN'}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-100 py-1 w-36 z-50">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                currentLang === lang.code ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bottom Navigation ──────────────────────────────────────── */

function BottomNav({ activeTab, onTabChange, completenessScore }: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  completenessScore: number;
}) {
  const tabs: { id: AppTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'home', label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'tax', label: 'Tax Filing',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'chat', label: 'AI Help',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'export', label: 'Export',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      id: 'settings', label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden safe-area-inset-bottom">
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex flex-col items-center py-2 px-1 transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {/* Badge for tax tab */}
            {tab.id === 'tax' && completenessScore > 0 && completenessScore < 100 && (
              <span className="absolute top-1 right-1/4 w-4 h-4 bg-amber-400 rounded-full text-xs text-blue-900 font-bold flex items-center justify-center">
                !
              </span>
            )}
            {tab.icon}
            <span className="text-xs mt-1 font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ── Chat Placeholder ───────────────────────────────────────── */

function ChatPlaceholder() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Tax Assistant</h2>
      <p className="text-gray-500 mb-2 text-sm leading-relaxed">
        Powered by Amazon Bedrock (Claude 3) with RAG from Income Tax Act documentation.
      </p>
      <p className="text-gray-400 text-xs mb-8">
        Ask about sections 80C, 80D, HRA, 44AD, regime comparison, and more.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-amber-700 text-sm font-semibold">🚧 Coming in Phase 4</div>
        <div className="text-amber-600 text-xs mt-1">Backend Lambda + Knowledge Base setup in progress</div>
      </div>
    </div>
  );
}

/* ── Export Placeholder ─────────────────────────────────────── */

function ExportPlaceholder({ regimeComparison, completenessScore }: any) {
  const canExport = regimeComparison && completenessScore >= 80;
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Export ITR JSON</h2>
      <p className="text-gray-500 mb-8 text-sm leading-relaxed">
        Generate IT Portal-ready JSON file for FY 2025-26 (ITR-1/ITR-2/ITR-3/ITR-4)
      </p>
      {canExport ? (
        <button className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg">
          📥 Download ITR JSON
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <div className="text-gray-600 text-sm font-semibold mb-2">Complete your tax filing first</div>
          <div className="text-gray-400 text-xs">
            Return is {completenessScore}% complete. Need at least 80% to export.
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div className="bg-green-400 h-2 rounded-full" style={{ width: `${completenessScore}%` }} />
          </div>
        </div>
      )}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="text-amber-700 text-sm font-semibold">🚧 Full Export in Phase 3</div>
        <div className="text-amber-600 text-xs mt-1">JSON schema validation + PDF summary generation coming next</div>
      </div>
    </div>
  );
}

/* ── Settings Page ──────────────────────────────────────────── */

function SettingsPage({ onLogout, authState }: any) {
  const { i18n } = useTranslation();
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearData = async () => {
    if (window.confirm('This will clear all local data. Are you sure?')) {
      await db.profiles.clear();
      await db.taxSessions.clear();
      await db.savedDrafts.clear();
      setCacheCleared(true);
      setTimeout(onLogout, 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      {/* Account */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Account
        </div>
        <div className="px-4 py-4">
          <div className="text-sm text-gray-600">User ID: <span className="font-mono text-xs text-gray-400">{authState.userId?.slice(0, 20)}...</span></div>
          <div className="text-sm text-gray-600 mt-1">Language: <span className="font-semibold">{SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.nativeName}</span></div>
          <div className="text-sm text-gray-600 mt-1">Regime: <span className="font-semibold capitalize">{authState.preferredRegime} Regime</span></div>
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Language
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Privacy & Data
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">Local Encryption</div>
              <div className="text-xs text-gray-500">AES-GCM-256 via Web Crypto API</div>
            </div>
            <span className="text-green-500 text-xs font-semibold">✓ Active</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-800">Document TTL</div>
              <div className="text-xs text-gray-500">Auto-deleted after 24 hours</div>
            </div>
            <span className="text-green-500 text-xs font-semibold">✓ Enabled</span>
          </div>
          <button
            onClick={handleClearData}
            className="w-full py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors mt-2"
            id="clear-data-btn"
          >
            {cacheCleared ? '✓ Data Cleared' : '🗑️ Delete All My Data'}
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition-colors"
        id="settings-logout-btn"
      >
        Logout
      </button>
    </div>
  );
}

/* ── Helper: Build income/deduction data from form state ─────── */

function buildIncomeData(salary: any, business: any) {
  return {
    salary: {
      grossSalary: salary?.grossSalary || 0,
      basicSalary: salary?.basicSalary || 0,        // required for HRA + senior slab
      hraReceived: salary?.hraReceived || 0,
      specialAllowance: salary?.specialAllowance || 0,
      otherAllowances: salary?.otherAllowances || 0,
      professionalTax: salary?.professionalTax || 0, // Section 16 deduction (NOT subtracted from gross)
    },
    otherSources: {
      interestIncome: salary?.interestIncome || 0,
      dividendIncome: 0,
      other: 0,
    },
    businessIncome: business
      ? {
          grossReceipts: (business.grossReceiptsDigital || 0) + (business.grossReceiptsCash || 0),
          digitalReceipts: business.grossReceiptsDigital || 0,
          cashReceipts: business.grossReceiptsCash || 0,
          expenses: 0,
        }
      : undefined,
  };
}

function buildDeductionData(deductions: any, salary?: any) {
  const profTax = salary?.professionalTax || 0;
  const empty = {
    section80C: { lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, sukanyaSamriddhi: 0, other: 0 },
    section80CCD1B: { npsAdditional: 0 },
    section80D: { selfPremium: 0, parentsPremium: 0, preventiveHealthCheckup: 0, isSelfSenior: false, isParentsSenior: false },
    section80E: { educationLoanInterest: 0 },
    section80G: { donations: 0 },
    hra: { rentPaid: 0, isMetro: false },               // basicSalary removed — sourced from IncomeData
    section16: { professionalTax: profTax },
  };

  if (!deductions) return empty;

  return {
    section80C: {
      lic: deductions.lic || 0,
      ppf: deductions.ppf || 0,
      elss: deductions.elss || 0,
      nsc: deductions.nsc || 0,
      homeLoanPrincipal: deductions.homeLoanPrincipal || 0,
      tuitionFees: deductions.tuitionFees || 0,
      sukanyaSamriddhi: deductions.sukanyaSamriddhi || 0,
      other: deductions.other80C || 0,
    },
    section80CCD1B: { npsAdditional: deductions.npsAdditional || 0 },
    section80D: {
      selfPremium: deductions.healthInsuranceSelf || 0,
      parentsPremium: deductions.healthInsuranceParents || 0,
      preventiveHealthCheckup: deductions.preventiveHealthCheckup || 0,
      isSelfSenior: deductions.isSelfSeniorCitizen || false,
      isParentsSenior: deductions.isParentSeniorCitizen || false,
    },
    section80E: { educationLoanInterest: deductions.educationLoanInterest || 0 },
    section80G: { donations: deductions.donations || 0 },
    hra: {
      rentPaid: deductions.rentPaid || 0,
      isMetro: deductions.isMetroCity || false,         // basicSalary removed — sourced from IncomeData
    },
    section16: { professionalTax: profTax },            // sourced from salary form (design HIGH-2)
  };
}
