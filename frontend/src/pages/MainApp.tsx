import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { MotionProvider, Reveal, TiltCard, Pressable, StepTransition, m } from '../components/motion';
import { useTranslation } from 'react-i18next';
import type { AuthState } from '../App';
import { ConnectivityIndicator } from '../components/ConnectivityIndicator';
import { PersonalInfoForm } from '../components/PersonalInfoForm';
import { SalaryIncomeForm } from '../components/SalaryIncomeForm';
import { DeductionsForm } from '../components/DeductionsForm';
import { BusinessIncomeForm } from '../components/BusinessIncomeForm';
import { ResultsSkeleton, ViewSkeleton } from '../components/feedback/Skeleton';
import { TaxCalculator } from '../services/taxCalculator';
import { defaultTaxRules } from '../services/taxRulesService';
import { toPersonalInfo } from '../utils/formDataMapper';
import { buildIncomeData, buildDeductionData } from '../utils/buildTaxData';
import { ConsentDialog } from '../components/ConsentDialog';
import { GuidedAssistant } from '../components/assistant/GuidedAssistant';
import { hasStoredConsent } from '../utils/consent';
import { SUPPORTED_LANGUAGES } from '../i18n/config';
import { db } from '../lib/db';
import { SyncStatusIndicator } from '../components/layout/SyncStatusIndicator';
import type {
  PersonalInfoFormData,
  SalaryIncomeFormData,
  DeductionFormData,
  BusinessInfoFormData,
} from '../../../shared/types/form-data';
import type {
  IncomeData,
  DeductionData,
  RegimeComparisonResult,
} from '../../../shared/types/tax-calculation';

/*
 * Code splitting (Tier-2/3 / 2G-3G optimisation):
 * The results screen (summary dashboard + regime comparison + slab breakdown)
 * and the Chat/Export/Settings placeholders are non-critical for first paint.
 * They are loaded lazily so their JS lands in separate route-style chunks and
 * is fetched on demand, keeping the initial entry bundle small. The eager
 * Personal/Salary/Deductions/Business forms stay in the entry chunk so the
 * first filing step paints immediately.
 */
const ResultsView = lazy(() => import('../components/results/ResultsView'));
const ChatView = lazy(() => import('./views/ChatView'));
const ExportView = lazy(() => import('./views/ExportView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

interface MainAppProps {
  authState: AuthState;
  onLogout: () => void;
}

type AppTab = 'home' | 'tax' | 'chat' | 'export' | 'settings';
type TaxStep = 'personal' | 'salary' | 'deductions' | 'business' | 'calculate' | 'results';

/** Wizard form state accumulated across steps (sections null until saved). */
interface TaxDataState {
  personalInfo: Partial<PersonalInfoFormData>;
  salary: SalaryIncomeFormData | null;
  deductions: DeductionFormData | null;
  business: BusinessInfoFormData | null;
}

const TAX_STEPS: { id: TaxStep; label: string; icon: string }[] = [
  { id: 'personal', label: 'Personal Info', icon: '👤' },
  { id: 'salary', label: 'Salary', icon: '💼' },
  { id: 'deductions', label: 'Deductions', icon: '📋' },
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'results', label: 'Results', icon: '📊' },
];

export function MainApp({ authState, onLogout }: MainAppProps) {
  const { t, i18n } = useTranslation();
  const sessionId = `session-${authState.userId || 'local'}-2025-26`;
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  // Guided assistant (Module 5.7) — pops up on entry after login, dismissible + reopenable.
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [taxStep, setTaxStep] = useState<TaxStep>('personal');
  const [completenessScore, setCompletenessScore] = useState(0);
  const [selectedRegime, setSelectedRegime] = useState<'old' | 'new'>(authState.preferredRegime);
  const [regimeComparison, setRegimeComparison] = useState<RegimeComparisonResult | null>(null);
  const [calculatedOffline, setCalculatedOffline] = useState(false);
  const [taxData, setTaxData] = useState<TaxDataState>({
    personalInfo: {},
    salary: null,
    deductions: null,
    business: null,
  });
  // Informed-consent gate before any PII is entered (task 4.1.3). Asked once
  // per device; entering the wizard is deferred until consent is granted.
  const [consentOpen, setConsentOpen] = useState(false);
  const enterWizard = useCallback(() => {
    if (hasStoredConsent()) {
      setActiveTab('tax');
    } else {
      setConsentOpen(true);
    }
  }, []);

  // Anomaly acknowledgements (task 3.1.2) — lifted here so they persist across
  // tab/step navigation, not just within ResultsView's lifetime.
  const [acknowledgedAnomalies, setAcknowledgedAnomalies] = useState<Set<string>>(new Set());
  const acknowledgeAnomaly = useCallback((id: string) => {
    setAcknowledgedAnomalies((prev) => new Set(prev).add(id));
  }, []);

  useEffect(() => {
    // Seed the UI language from the authenticated profile only when the user
    // has NO explicit local choice yet. i18n already restores the persisted
    // language at startup (i18n/config.ts), and the user may switch it in-session
    // via the nav switcher or the pre-auth selector — both persist to
    // localStorage. Without this guard, the profile default (often 'en') would
    // clobber that saved choice on every reload. The user's selection wins.
    const hasLocalChoice = !!localStorage.getItem('btm_lang');
    if (authState.preferredLanguage && !hasLocalChoice) {
      i18n.changeLanguage(authState.preferredLanguage);
    }
  }, [authState.preferredLanguage, i18n]);

  // Note: <html lang> is kept in step with the UI language by the
  // `languageChanged` listener in i18n/config.ts — a global side effect, so it
  // also covers the pre-auth pages (task 4.12.3).

  // Ambient story hue (AmbientBackground reads --ambient-1): each tab gets its
  // own accent so navigation feels like chapters, not a static shell.
  useEffect(() => {
    const AMBIENT_HUES: Record<AppTab, string> = {
      home: '221 83% 53%',     // blue-600
      tax: '243 75% 59%',      // indigo-600
      chat: '262 83% 58%',     // violet-600
      export: '160 84% 39%',   // emerald-600
      settings: '215 16% 47%', // slate-500
    };
    document.documentElement.style.setProperty('--ambient-1', AMBIENT_HUES[activeTab]);
    return () => {
      document.documentElement.style.removeProperty('--ambient-1');
    };
  }, [activeTab]);

  // Calculate completeness score
  useEffect(() => {
    let score = 0;
    if (Object.keys(taxData.personalInfo).length > 0) score += 25;
    if (taxData.salary) score += 35;
    if (taxData.deductions) score += 25;
    if (regimeComparison) score += 15;
    setCompletenessScore(score);
  }, [taxData, regimeComparison]);

  const handleCalculateTax = useCallback((income: IncomeData, deductions: DeductionData) => {
    try {
      const calculator = new TaxCalculator(defaultTaxRules);
      // Use toPersonalInfo to normalise DOB and compute age/senior flags correctly (design HIGH-1)
      const rawPersonalInfo = taxData.personalInfo;
      let mappedPersonalInfo: ReturnType<typeof toPersonalInfo> | undefined;
      if (rawPersonalInfo?.dob) {
        try {
          mappedPersonalInfo = toPersonalInfo(rawPersonalInfo, 'FY2025-26');
        } catch {
          // If DOB parsing fails (e.g. empty/invalid), fall back to no personalInfo
          mappedPersonalInfo = undefined;
        }
      }
      const comparison = calculator.compareRegimes(income, deductions, mappedPersonalInfo);
      // Capture whether this calculation was produced offline (client-side via
      // cached/bundled rules) so the results view can surface a badge.
      setCalculatedOffline(!navigator.onLine);
      setRegimeComparison(comparison);
      setTaxStep('results');
    } catch (error) {
      console.error('Tax calculation error:', error);
    }
  }, [taxData.personalInfo]);

  const handlePersonalInfoSave = (data: PersonalInfoFormData) => {
    setTaxData(prev => ({ ...prev, personalInfo: data }));
    setTaxStep('salary');
  };

  const handleSalarySave = (data: SalaryIncomeFormData) => {
    setTaxData(prev => ({ ...prev, salary: data }));
    setTaxStep('deductions');
  };

  const handleDeductionsSave = (data: DeductionFormData) => {
    setTaxData(prev => ({ ...prev, deductions: data }));
    setTaxStep('business');
  };

  const handleBusinessSave = (data: BusinessInfoFormData) => {
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
    <MotionProvider>
    <div className="min-h-screen flex flex-col">
      {/* Skip link — first tab stop, jumps past the chrome (task 4.12.3) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))]"
      >
        {t('a11y.skipToContent', { defaultValue: 'Skip to main content' })}
      </a>

      {/* Top Header — deep ink, gold hairline, serif wordmark */}
      <header className="bg-ink text-white sticky top-0 z-50 shadow-lg border-b border-[hsl(var(--gold)/0.35)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="btn-gold w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm">
              भ
            </div>
            <div>
              <div className="font-display font-semibold text-white text-base leading-tight tracking-wide">
                {t('app.name')}
              </div>
              <div className="eyebrow text-[hsl(var(--gold)/0.9)]">FY 2025-26</div>
            </div>
          </div>

          {/* Center: Completeness */}
          {activeTab === 'tax' && (
            <div className="hidden sm:flex items-center space-x-2">
              <div className="text-xs text-blue-200">{t('header.returnComplete')}</div>
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
            <SyncStatusIndicator className="hidden sm:inline-flex text-blue-100" />
            <ConnectivityIndicator />
            <LanguageSwitcher currentLang={i18n.language} />
            <button
              onClick={onLogout}
              className="text-xs text-blue-200 hover:text-white transition-colors px-2 py-1 rounded"
              id="logout-btn"
            >
              {t('header.logout')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto pb-20 md:pb-0">
        {activeTab === 'home' && <HomePage onStartFiling={enterWizard} completenessScore={completenessScore} />}
        {activeTab === 'tax' && (
          <TaxWizard
            taxStep={taxStep}
            setTaxStep={setTaxStep}
            taxData={taxData}
            regimeComparison={regimeComparison}
            calculatedOffline={calculatedOffline}
            selectedRegime={selectedRegime}
            setSelectedRegime={setSelectedRegime}
            completenessScore={completenessScore}
            sessionId={sessionId}
            onPersonalSave={handlePersonalInfoSave}
            onSalarySave={handleSalarySave}
            onDeductionsSave={handleDeductionsSave}
            onBusinessSave={handleBusinessSave}
            skipToResults={skipToResults}
            acknowledgedAnomalyIds={acknowledgedAnomalies}
            onAcknowledgeAnomaly={acknowledgeAnomaly}
          />
        )}
        {activeTab === 'chat' && (
          <Suspense fallback={<ViewSkeleton />}>
            <ChatView />
          </Suspense>
        )}
        {activeTab === 'export' && (
          <Suspense fallback={<ViewSkeleton />}>
            <ExportView
              regimeComparison={regimeComparison}
              completenessScore={completenessScore}
              personalInfo={taxData.personalInfo}
              salary={taxData.salary}
              selectedRegime={selectedRegime}
              tdsPaid={
                (taxData.salary?.tdsQ1 || 0) +
                (taxData.salary?.tdsQ2 || 0) +
                (taxData.salary?.tdsQ3 || 0) +
                (taxData.salary?.tdsQ4 || 0)
              }
            />
          </Suspense>
        )}
        {activeTab === 'settings' && (
          <Suspense fallback={<ViewSkeleton />}>
            <SettingsView onLogout={onLogout} authState={authState} />
          </Suspense>
        )}
      </main>

      {/* Informed-consent gate (task 4.1.3) — must clear before the wizard */}
      <ConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        onConsent={() => setActiveTab('tax')}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => (tab === 'tax' ? enterWizard() : setActiveTab(tab))}
        completenessScore={completenessScore}
      />

      {/* Guided filing assistant (Module 5.7) — opens on entry, reopenable via the launcher */}
      {assistantOpen ? (
        <GuidedAssistant onClose={() => setAssistantOpen(false)} />
      ) : (
        <button
          onClick={() => setAssistantOpen(true)}
          aria-label="Open Tax Mitra assistant"
          className="fixed z-40 bottom-24 md:bottom-6 right-4 w-14 h-14 rounded-full btn-gold shadow-elevated grid place-items-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8M8 14h5m-9 6l3.5-2.5A2 2 0 0110.6 17H16a4 4 0 004-4V8a4 4 0 00-4-4H8a4 4 0 00-4 4v12z" />
          </svg>
        </button>
      )}
    </div>
    </MotionProvider>
  );
}

/* ── Home Page ──────────────────────────────────────────────── */

function HomePage({ onStartFiling, completenessScore }: {
  onStartFiling: () => void;
  completenessScore: number;
}) {
  const { t } = useTranslation();
  const isReturningUser = completenessScore > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
      {/* ── Row 1: hero (8 cols) + concierge rail (4 cols) ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Hero — deep ink, gold sheen, serif voice (private-wealth treatment) */}
        <Reveal y={16} mode="mount" className="lg:col-span-8">
          <TiltCard maxTilt={3}>
            <div className="bg-ink relative overflow-hidden rounded-2xl p-8 text-white shadow-elevated lg:p-10">
              {/* Depth: gold orb + engraved rupee fragment */}
              <div aria-hidden className="animate-float absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[hsl(var(--gold)/0.14)] blur-3xl" />
              <div
                aria-hidden
                className="font-display absolute -bottom-24 -right-4 rotate-6 select-none font-black leading-none"
                style={{ fontSize: '16rem', color: 'transparent', WebkitTextStroke: '1.5px hsl(var(--gold)/0.22)' }}
              >
                ₹
              </div>

              <div className="relative">
                <div className="eyebrow text-[hsl(var(--gold))]">{t('home.eyebrow')}</div>
                <h1 className="font-display mt-3 text-3xl font-semibold leading-tight text-balance lg:text-[2.6rem]">
                  {t('home.heroL1')}
                  <br />
                  {t('home.heroL2')}
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
                  {t('home.heroSub')}
                </p>

                <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <div className="figure-display glow-amber text-5xl font-semibold text-[hsl(var(--gold))]">
                      {completenessScore}%
                    </div>
                    <div className="eyebrow mt-2 text-white/50">{t('home.returnComplete')}</div>
                  </div>
                  <div className="glass relative h-24 w-24 rounded-full p-2">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                        fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2.5"
                      />
                      <m.path
                        d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                        fill="none" stroke="#c9a961" strokeWidth="2.5" strokeLinecap="round"
                        initial={{ strokeDasharray: '0, 100' }}
                        animate={{ strokeDasharray: `${completenessScore}, 100` }}
                        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
                      />
                    </svg>
                  </div>
                </div>

                <Pressable className="mt-8">
                  <button
                    id="start-filing-btn"
                    onClick={onStartFiling}
                    className="btn-gold w-full rounded-xl py-3.5 text-[15px] font-bold tracking-wide transition-colors sm:w-auto sm:px-12"
                  >
                    {isReturningUser ? t('home.continueFiling') : t('home.begin')}
                  </button>
                </Pressable>
              </div>
            </div>
          </TiltCard>
        </Reveal>

        {/* Concierge rail — stacked service cards on warm paper */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {[
            { icon: '📄', title: t('home.docsTitle'), desc: t('home.docsDesc') },
            { icon: '🤖', title: t('home.aiTitle'), desc: t('home.aiDesc') },
          ].map((s, i) => (
            <Reveal key={s.icon} delay={0.1 + i * 0.08} mode="mount" className="flex-1">
              <TiltCard maxTilt={5} className="h-full">
                <div className="hairline flex h-full flex-col rounded-xl bg-card p-6 shadow-elevated transition-shadow hover:shadow-float">
                  <div className="text-2xl">{s.icon}</div>
                  <div className="font-display mt-3 text-lg font-semibold text-foreground">{s.title}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
                  <div className="eyebrow mt-auto pt-4 text-[hsl(var(--gold-deep))]">{t('home.comingSoon')}</div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Row 2: services — three columns across the full width ──────── */}
      <div className="mt-12">
        <Reveal>
          <div className="hairline-b flex items-baseline justify-between pb-3">
            <h2 className="font-display text-2xl font-semibold text-foreground">{t('home.serviceHeading')}</h2>
            <span className="eyebrow text-muted-foreground">{t('home.serviceTag')}</span>
          </div>
        </Reveal>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: 'I', title: t('home.s1t'), desc: t('home.s1d'), action: onStartFiling },
            { n: 'II', title: t('home.s2t'), desc: t('home.s2d'), action: onStartFiling },
            { n: 'III', title: t('home.s3t'), desc: t('home.s3d'), action: onStartFiling },
          ].map((item, i) => (
            <Reveal key={item.n} delay={0.08 + i * 0.08}>
              <button
                onClick={item.action}
                className="hairline group h-full w-full rounded-xl bg-card p-6 text-left shadow-elevated transition-all hover:shadow-float hover:hairline-gold"
              >
                <div className="figure-display text-sm text-[hsl(var(--gold-deep))]">{item.n}</div>
                <div className="font-display mt-2 text-xl font-semibold text-foreground">
                  {item.title}
                  <span className="ml-2 inline-block text-[hsl(var(--gold-deep))] transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{item.desc}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Row 3: the privacy covenant — quiet, full-width hairline strip ── */}
      <Reveal delay={0.12}>
        <div className="hairline mt-12 flex flex-col items-start gap-3 rounded-xl bg-card/60 px-6 py-5 sm:flex-row sm:items-center">
          <span aria-hidden className="text-lg">🔒</span>
          <div>
            <div className="eyebrow text-foreground">{t('home.privacyTitle')}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {t('home.privacyBody')}
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ── Tax Wizard ─────────────────────────────────────────────── */

interface TaxWizardProps {
  taxStep: TaxStep;
  setTaxStep: (step: TaxStep) => void;
  taxData: TaxDataState;
  regimeComparison: RegimeComparisonResult | null;
  calculatedOffline: boolean;
  selectedRegime: 'old' | 'new';
  setSelectedRegime: (r: 'old' | 'new') => void;
  completenessScore: number;
  sessionId: string;
  onPersonalSave: (data: PersonalInfoFormData) => void;
  onSalarySave: (data: SalaryIncomeFormData) => void;
  onDeductionsSave: (data: DeductionFormData) => void;
  onBusinessSave: (data: BusinessInfoFormData) => void;
  skipToResults: () => void;
  acknowledgedAnomalyIds: Set<string>;
  onAcknowledgeAnomaly: (id: string) => void;
}

function TaxWizard({
  taxStep, setTaxStep, taxData, regimeComparison, calculatedOffline, selectedRegime, setSelectedRegime,
  completenessScore, sessionId, onPersonalSave, onSalarySave, onDeductionsSave, onBusinessSave, skipToResults,
  acknowledgedAnomalyIds, onAcknowledgeAnomaly,
}: TaxWizardProps) {
  const { t } = useTranslation();
  const currentStepIndex = TAX_STEPS.findIndex(s => s.id === taxStep);

  // Direction-aware step transitions (OPT-UI.2): forward slides left, back slides right.
  const prevIndexRef = useRef(currentStepIndex);
  const direction: 1 | -1 = currentStepIndex >= prevIndexRef.current ? 1 : -1;
  useEffect(() => {
    prevIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

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
                {t(`wizard.${step.id}`)}
              </div>
              {index < TAX_STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mt-4 hidden sm:block ${
                  index < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'
                }`} style={{ position: 'absolute', left: 0, right: 0 }} />
              )}
            </button>
          ))}
        </div>
        <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
          <m.div
            className="bg-gradient-to-r from-blue-600 to-indigo-500 h-1.5 rounded-full"
            initial={false}
            animate={{ width: `${((currentStepIndex + 1) / TAX_STEPS.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
      </div>

      {/* Step Content — slide+fade between steps (OPT-UI.2) */}
      <StepTransition stepKey={taxStep} direction={direction}>
      {taxStep === 'personal' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-gray-900">{t('wizard.hPersonal')}</h2>
            <button
              onClick={() => setTaxStep('salary')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('wizard.skip')} →
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
            <h2 className="font-display text-xl font-bold text-gray-900">{t('wizard.hSalary')}</h2>
            <button
              onClick={() => setTaxStep('deductions')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('wizard.skip')} →
            </button>
          </div>
          <SalaryIncomeForm
            sessionId={sessionId}
            onSave={onSalarySave}
            initialData={taxData.salary ?? undefined}
          />
        </div>
      )}

      {taxStep === 'deductions' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-gray-900">{t('wizard.hDeductions')}</h2>
            <button
              onClick={() => setTaxStep('business')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('wizard.skip')} →
            </button>
          </div>
          <DeductionsForm
            sessionId={sessionId}
            onSave={onDeductionsSave}
            initialData={taxData.deductions ?? undefined}
            basicSalary={taxData.salary?.basicSalary || 0}
          />
        </div>
      )}

      {taxStep === 'business' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-gray-900">{t('wizard.hBusiness')}</h2>
            <button
              onClick={skipToResults}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('wizard.skipCalculate')}
            </button>
          </div>
          <BusinessIncomeForm
            sessionId={sessionId}
            onSave={onBusinessSave}
            initialData={taxData.business ?? undefined}
          />
        </div>
      )}

      {taxStep === 'results' && (
        <Suspense fallback={<ResultsSkeleton />}>
          <ResultsView
            regimeComparison={regimeComparison}
            calculatedOffline={calculatedOffline}
            selectedRegime={selectedRegime}
            setSelectedRegime={setSelectedRegime}
            completenessScore={completenessScore}
            tdsPaid={
              (taxData.salary?.tdsQ1 || 0) +
              (taxData.salary?.tdsQ2 || 0) +
              (taxData.salary?.tdsQ3 || 0) +
              (taxData.salary?.tdsQ4 || 0)
            }
            onEnterSalary={() => setTaxStep('salary')}
            taxData={taxData}
            acknowledgedAnomalyIds={acknowledgedAnomalyIds}
            onAcknowledgeAnomaly={onAcknowledgeAnomaly}
          />
        </Suspense>
      )}
      </StepTransition>
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
              onClick={() => {
                i18n.changeLanguage(lang.code);
                // Persist to IndexedDB too (LanguageSelector does the same), so
                // the app's offline language store never drifts from the live
                // i18n/localStorage choice and survives reload consistently.
                void db.saveLanguagePreference(lang.code);
                setOpen(false);
              }}
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
  const { t } = useTranslation();
  const NAV_KEYS: Record<AppTab, string> = {
    home: 'nav.home', tax: 'nav.taxFiling', chat: 'nav.aiHelp', export: 'nav.export', settings: 'nav.settings',
  };
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
    <nav
      aria-label={t('a11y.mainNav', { defaultValue: 'Main navigation' })}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden safe-area-inset-bottom"
    >
      <div className="flex">
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`nav-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
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
            <span className="text-xs mt-1 font-medium">{t(NAV_KEYS[tab.id])}</span>
            {activeTab === tab.id && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/*
 * buildIncomeData / buildDeductionData moved to src/utils/buildTaxData.ts
 * (OPT-P1.2): page files must only export components for Vite fast-refresh.
 */
