/**
 * Guided Filing Assistant (Module 5.7 / 5.2.3) — professional, dynamic.
 *
 * Non-static: typed input is routed by the backend `/assistant` endpoint
 * (provider + optimiser driven), so category detection and the computed
 * recommendation come from the agents, not hardcoded UI. Falls back to local
 * deterministic routing when offline. No emojis — SVG icons throughout.
 *
 * The roadmap steps render from `assistantData` keyed by the returned category
 * (offline-capable); when the Anthropic key is wired, the endpoint returns an
 * LLM-generated, per-language roadmap in the same `roadmap` field with no client
 * change. Voice uses the browser's Web Speech API with graceful fallback.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ASSISTANT_CATEGORIES,
  ASSISTANT_GREETING,
  ASSISTANT_PLACEHOLDER,
  SPEECH_LANG,
  matchCategory,
  type AssistantCategory,
  type RoadmapStep,
} from './assistantData';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

interface GuidedAssistantProps {
  onClose: () => void;
}

interface Recommendation {
  recommendedRegime: string;
  totalTax: number;
  oldTax: number;
  newTax: number;
  advocate: string[];
  adversary: string[];
  note: string;
}

type Message =
  | { role: 'bot' | 'user'; kind: 'text'; text: string }
  | { role: 'bot'; kind: 'subs'; category: AssistantCategory }
  | { role: 'bot'; kind: 'roadmap'; steps: RoadmapStep[]; categoryId?: string }
  | { role: 'bot'; kind: 'scenario'; senior: boolean }
  | { role: 'bot'; kind: 'reco'; reco: Recommendation };

interface ScenarioData {
  grossSalary: number;
  investableBudget: number;
  healthInsurance80D: number;
  isSenior: boolean;
}

// Categories the optimiser models accurately today (salary-slab based).
const OPTIMIZABLE = new Set(['salaried', 'senior']);

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}
interface SpeechWindow {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
}

const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ── Inline SVG icons (no emoji) ───────────────────────────────────────────────
const Icon = {
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  send: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12l14-7-7 14-2-5-5-2z" />
    </svg>
  ),
  mic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0m5 5v3" />
    </svg>
  ),
  sound: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5L6 9H3v6h3l5 4V5zm4.5 3a4 4 0 010 8m2.5-11a8 8 0 010 14" />
    </svg>
  ),
  back: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7 7-7m-7 7h18" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3v18h18M8 15v3m5-8v8m5-11v11" />
    </svg>
  ),
};

export function GuidedAssistant({ onClose }: GuidedAssistantProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'en';
  const greeting = (ASSISTANT_GREETING[lang] || ASSISTANT_GREETING.en).replace(/\s*👋\s*/u, ' ').trim();

  const [messages, setMessages] = useState<Message[]>([{ role: 'bot', kind: 'text', text: greeting }]);
  const [showChips, setShowChips] = useState(true);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const lastRoadmap = useRef<string>('');

  const supportsMic = useMemo(() => {
    const w = window as unknown as SpeechWindow;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo?.({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  const renderRoadmap = (steps: RoadmapStep[], title?: string, categoryId?: string) => {
    lastRoadmap.current = (title ? `${title}. ` : '') + steps.map((s) => `${s.title}. ${s.detail}`).join(' ');
    setMessages((m) => [...m, { role: 'bot', kind: 'roadmap', steps, categoryId }]);
  };

  const renderCategory = (c: AssistantCategory) => {
    setMessages((m) => [...m, { role: 'bot', kind: 'subs', category: c }]);
    renderRoadmap(c.roadmap, c.title, c.id);
  };

  const pickCategory = (c: AssistantCategory) => {
    setShowChips(false);
    setMessages((m) => [...m, { role: 'user', kind: 'text', text: c.title }]);
    renderCategory(c);
  };

  const handleText = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput('');
    setShowChips(false);
    const history = messages.filter((m): m is Extract<Message, { kind: 'text' }> => m.kind === 'text');
    setMessages((m) => [...m, { role: 'user', kind: 'text', text }]);
    setThinking(true);

    try {
      const res = await fetch(`${API_BASE}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history.map((h) => ({ role: h.role, content: h.text })), { role: 'user', content: text }],
          language: lang,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setThinking(false);
      setMessages((m) => [...m, { role: 'bot', kind: 'text', text: data.content }]);
      const cat = data.category ? ASSISTANT_CATEGORIES.find((c) => c.id === data.category) : undefined;
      // Prefer a backend-generated (per-language) roadmap when present — this is
      // the path the Anthropic provider fills; otherwise use the local roadmap.
      const apiSteps: RoadmapStep[] | null =
        Array.isArray(data.roadmap) && data.roadmap.length ? data.roadmap : null;
      if (apiSteps) {
        if (cat) setMessages((m) => [...m, { role: 'bot', kind: 'subs', category: cat }]);
        renderRoadmap(apiSteps, cat?.title, cat?.id);
      } else if (cat) {
        renderCategory(cat);
      }
      if (data.recommendation) setMessages((m) => [...m, { role: 'bot', kind: 'reco', reco: data.recommendation }]);
      if (!cat && !apiSteps) setShowChips(true);
    } catch {
      // Offline / server down → deterministic local routing.
      setThinking(false);
      const cat = matchCategory(text);
      if (cat) {
        renderCategory(cat);
      } else {
        setMessages((m) => [...m, { role: 'bot', kind: 'text', text: greeting }]);
        setShowChips(true);
      }
    }
  };

  const handleScenario = async (s: ScenarioData) => {
    const summary =
      `Annual salary ${inr(s.grossSalary)}, investing ${inr(s.investableBudget)}` +
      (s.healthInsurance80D ? `, health cover ${inr(s.healthInsurance80D)}` : '') +
      (s.isSenior ? ', senior citizen' : '');
    setMessages((m) => [...m, { role: 'user', kind: 'text', text: summary }]);
    setThinking(true);
    try {
      const res = await fetch(`${API_BASE}/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: summary }],
          language: lang,
          scenario: {
            grossSalary: s.grossSalary,
            investableBudget: s.investableBudget,
            healthInsurance80D: s.healthInsurance80D,
            isSenior: s.isSenior,
          },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setThinking(false);
      if (data.recommendation) {
        setMessages((m) => [...m, { role: 'bot', kind: 'reco', reco: data.recommendation }]);
      } else {
        setMessages((m) => [...m, { role: 'bot', kind: 'text', text: t('assistant.noEstimate', { defaultValue: "I couldn't compute an estimate for that input." }) }]);
      }
    } catch {
      setThinking(false);
      setMessages((m) => [...m, { role: 'bot', kind: 'text', text: t('assistant.offlineEstimate', { defaultValue: 'The estimate needs the tax engine online — please try again when connected.' }) }]);
    }
  };

  const readAloud = (text: string) => {
    if (!('speechSynthesis' in window)) {
      flash(t('assistant.noVoice', { defaultValue: "Voice output isn't available in this browser." }));
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || 'en-IN';
    window.speechSynthesis.speak(u);
  };

  const startListening = () => {
    const w = window as unknown as SpeechWindow;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      flash(t('assistant.micFallback', { defaultValue: 'Voice input runs on your device in the app. Type for now.' }));
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = SPEECH_LANG[lang] || 'en-IN';
      rec.interimResults = false;
      setListening(true);
      rec.onresult = (e) => void handleText(e.results[0][0].transcript);
      rec.onerror = () => flash(t('assistant.micError', { defaultValue: "Didn't catch that — try typing." }));
      rec.onend = () => setListening(false);
      rec.start();
    } catch {
      setListening(false);
      flash(t('assistant.micUnavailable', { defaultValue: "Voice input isn't available here — type for now." }));
    }
  };

  return (
    <div
      role="dialog"
      aria-label={t('assistant.title', { defaultValue: 'Tax Mitra assistant' })}
      className="fixed z-50 bottom-4 right-4 left-4 sm:left-auto sm:w-[404px] max-h-[82vh] flex flex-col hairline bg-card rounded-2xl shadow-elevated overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[hsl(var(--border))]">
        <div
          className="w-9 h-9 rounded-lg grid place-items-center text-white font-display text-sm font-semibold tracking-tight"
          style={{ background: 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-deep)))' }}
        >
          TM
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-foreground leading-tight text-[15px]">
            {t('assistant.name', { defaultValue: 'Tax Mitra' })}
          </p>
          <p className="text-xs text-gray-500 leading-tight">
            {t('assistant.status', { defaultValue: 'Guided filing & tax optimisation' })}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label={t('common.close', { defaultValue: 'Close' })}
          className="text-gray-400 hover:text-foreground w-8 h-8 grid place-items-center rounded-lg"
        >
          {Icon.close}
        </button>
      </div>

      {/* Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        {messages.map((m, i) => {
          if (m.kind === 'text') {
            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[86%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[hsl(var(--ink))] text-[hsl(var(--background))] rounded-br-md'
                      : 'bg-[hsl(var(--muted))] text-foreground rounded-bl-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          }
          if (m.kind === 'subs') {
            return (
              <div key={i} className="bg-[hsl(var(--muted))] rounded-2xl rounded-bl-md p-3.5 text-sm space-y-2.5">
                <p className="font-display font-semibold text-foreground">{m.category.title}</p>
                {m.category.subs.map((sg, j) => (
                  <div key={j}>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--gold-deep))] mb-1.5 font-mono">{sg.group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sg.items.map((it) => (
                        <span key={it} className="text-[11px] font-mono px-2 py-0.5 rounded bg-card text-foreground border border-[hsl(var(--border))]">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (m.kind === 'reco') {
            const due = m.reco.recommendedRegime === 'new';
            return (
              <div key={i} className="border border-[hsl(var(--border))] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[hsl(var(--muted))] flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-[hsl(var(--gold-deep))]">Recommended</span>
                  <span className="text-sm font-display font-semibold text-foreground">{due ? 'New regime' : 'Old regime'}</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">Tax payable</span>
                    <span className="font-display text-lg font-semibold text-foreground tabular-nums">{inr(m.reco.totalTax)}</span>
                  </div>
                  <div className="flex gap-4 text-[11px] text-gray-500 font-mono">
                    <span>Old {inr(m.reco.oldTax)}</span>
                    <span>New {inr(m.reco.newTax)}</span>
                  </div>
                  {m.reco.advocate[0] && <p className="text-xs text-foreground leading-relaxed pt-1">{m.reco.advocate[0]}</p>}
                  {m.reco.adversary[0] && <p className="text-xs text-gray-500 leading-relaxed">{m.reco.adversary[0]}</p>}
                </div>
              </div>
            );
          }
          if (m.kind === 'scenario') {
            return <ScenarioForm key={i} senior={m.senior} onSubmit={handleScenario} />;
          }
          // roadmap
          return (
            <div key={i} className="space-y-2">
              <p className="text-xs font-display font-semibold text-foreground px-1 uppercase tracking-wide">
                {t('assistant.roadmap', { defaultValue: 'Your step-by-step roadmap' })}
              </p>
              <ol className="space-y-1.5">
                {m.steps.map((step, j) => (
                  <li key={j} className="flex gap-3 bg-card border border-[hsl(var(--border))] rounded-xl p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-mono text-[hsl(var(--gold-deep))] bg-[hsl(var(--muted))] border border-[hsl(var(--border))] tabular-nums">
                      {j + 1}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-foreground leading-tight">{step.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => readAloud(lastRoadmap.current)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--border))] text-foreground hover:border-[hsl(var(--gold))]"
                >
                  {Icon.sound}
                  {t('assistant.readAloud', { defaultValue: 'Read aloud' })}
                </button>
                <button
                  onClick={() => { setMessages((mm) => [...mm, { role: 'bot', kind: 'text', text: greeting }]); setShowChips(true); }}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-dashed border-[hsl(var(--border))] text-gray-500 hover:border-[hsl(var(--gold))]"
                >
                  {Icon.back}
                  {t('assistant.another', { defaultValue: 'Another category' })}
                </button>
                {m.categoryId && OPTIMIZABLE.has(m.categoryId) && (
                  <button
                    onClick={() => setMessages((mm) => [...mm, { role: 'bot', kind: 'scenario', senior: m.categoryId === 'senior' }])}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[hsl(var(--gold))] text-[hsl(var(--gold-deep))] hover:bg-[hsl(var(--muted))]"
                  >
                    {Icon.chart}
                    {t('assistant.estimate', { defaultValue: 'Estimate my tax' })}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {thinking && (
          <div className="flex justify-start" aria-label={t('assistant.thinking', { defaultValue: 'Assistant is thinking' })}>
            <div className="bg-[hsl(var(--muted))] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {showChips && !thinking && (
          <div className="flex flex-wrap gap-2 pt-1">
            {ASSISTANT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => pickCategory(c)}
                className="text-[13px] px-3 py-1.5 rounded-full border border-[hsl(var(--border))] text-foreground hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-[hsl(var(--border))]">
        <button
          onClick={startListening}
          aria-label={t('assistant.speak', { defaultValue: 'Speak' })}
          aria-pressed={listening}
          className={`w-10 h-10 flex-shrink-0 grid place-items-center rounded-full border transition-colors ${
            listening ? 'bg-[hsl(var(--gold))] border-[hsl(var(--gold))] text-white animate-pulse' : 'border-[hsl(var(--border))] text-gray-500 hover:text-foreground hover:border-[hsl(var(--gold))]'
          }`}
          title={supportsMic ? t('assistant.speak', { defaultValue: 'Speak' }) : t('assistant.micFallback', { defaultValue: 'Voice input available in the app' })}
        >
          {Icon.mic}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleText(input)}
          placeholder={ASSISTANT_PLACEHOLDER[lang] || ASSISTANT_PLACEHOLDER.en}
          aria-label={t('assistant.message', { defaultValue: 'Message' })}
          className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full text-sm bg-[hsl(var(--muted))] text-foreground border border-transparent focus:outline-none focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))]"
        />
        <button
          onClick={() => void handleText(input)}
          disabled={!input.trim() || thinking}
          aria-label={t('common.send', { defaultValue: 'Send' })}
          className="w-10 h-10 flex-shrink-0 grid place-items-center rounded-full btn-gold disabled:opacity-40"
        >
          {Icon.send}
        </button>
      </div>

      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-[hsl(var(--ink))] text-[hsl(var(--background))] text-xs px-3 py-2 rounded-lg shadow-elevated">
          {toast}
        </div>
      )}
    </div>
  );
}

// Compact in-chat scenario collector — feeds the optimiser via /assistant.
function ScenarioForm({ senior, onSubmit }: { senior: boolean; onSubmit: (s: ScenarioData) => void }) {
  const { t } = useTranslation();
  const [salary, setSalary] = useState('');
  const [invest, setInvest] = useState('');
  const [health, setHealth] = useState('');
  const [isSenior, setIsSenior] = useState(senior);
  const num = (v: string) => parseInt(v.replace(/\D/g, ''), 10) || 0;
  const canSubmit = num(salary) > 0;

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <div>
      <label className="text-[11px] text-gray-500 block mb-1">{label}</label>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm bg-[hsl(var(--muted))] text-foreground border border-transparent focus:border-[hsl(var(--gold))] focus:outline-none tabular-nums"
      />
    </div>
  );

  return (
    <div className="border border-[hsl(var(--border))] rounded-xl p-3.5 space-y-2.5 bg-card">
      <p className="text-xs font-display font-semibold text-foreground">
        {t('assistant.quickEstimate', { defaultValue: 'Quick estimate' })}
      </p>
      {field(t('assistant.annualSalary', { defaultValue: 'Annual salary (₹)' }), salary, setSalary, 'e.g. 1500000')}
      {field(t('assistant.investAmount', { defaultValue: 'You invest — 80C / NPS (₹)' }), invest, setInvest, 'e.g. 200000')}
      {field(t('assistant.healthPremium', { defaultValue: 'Health insurance premium (₹)' }), health, setHealth, 'optional')}
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={isSenior} onChange={(e) => setIsSenior(e.target.checked)} className="accent-[hsl(var(--gold))]" />
        {t('assistant.seniorCitizen', { defaultValue: 'Senior citizen (60+)' })}
      </label>
      <button
        disabled={!canSubmit}
        onClick={() => onSubmit({ grossSalary: num(salary), investableBudget: num(invest), healthInsurance80D: num(health), isSenior })}
        className="w-full btn-gold rounded-lg py-2 text-sm font-medium disabled:opacity-40"
      >
        {t('assistant.showPlan', { defaultValue: 'Show my optimal plan' })}
      </button>
    </div>
  );
}
