/**
 * Guided Filing Assistant — category taxonomy + filing roadmaps (Module 5.7).
 *
 * Ported from the interactive prototype into typed app data. Each main category
 * (what kind of taxpayer you are) opens into its sub-taxes — direct and, where
 * relevant, GST — and a step-by-step roadmap: select → fill the legal profile →
 * optimise → file. This is the deterministic content the assistant walks a user
 * through; the live LLM (Module 5.2/5.3) will later enrich the conversation, but
 * the roadmaps stay grounded here so the guidance is stable and offline-capable.
 *
 * Strings are English for now; they move behind react-i18next keys when the
 * assistant's translations land (base i18n already ships 7 languages).
 */

export interface SubGroup {
  /** e.g. "Direct tax — Income tax" | "Indirect tax — GST" */
  group: string;
  items: string[];
}

export interface RoadmapStep {
  title: string;
  detail: string;
}

export interface AssistantCategory {
  id: string;
  /** Short label with a leading emoji for the quick-reply chip. */
  chip: string;
  title: string;
  subs: SubGroup[];
  roadmap: RoadmapStep[];
}

export const ASSISTANT_CATEGORIES: AssistantCategory[] = [
  {
    id: 'salaried',
    chip: '🧑‍💼 Salaried',
    title: 'Salaried individual',
    subs: [
      {
        group: 'Direct tax — Income tax',
        items: ['Salary head', 'Standard deduction 16(ia)', 'HRA 10(13A)', '80C / 80D (old regime)', '80CCD(2) NPS'],
      },
    ],
    roadmap: [
      { title: 'Confirm your profile', detail: 'Age, city (metro?), whether you rent, and if your employer offers NPS.' },
      { title: 'Gather documents', detail: 'Form 16, rent receipts, 80C/80D proofs, home-loan interest certificate, AIS.' },
      { title: 'Compare the two regimes', detail: 'The engine computes old vs new side by side — the single biggest lever.' },
      { title: 'Stack deductions (if old regime)', detail: 'HRA, 80C ₹1.5L, 80D health, 80CCD(1B) NPS — each mapped to its section.' },
      { title: 'Review the legal profile', detail: 'Every claim shown with the section that authorises it, ready for a CA to check.' },
      { title: 'File ITR-1 / ITR-2', detail: 'Export the validated JSON and upload at incometax.gov.in, or file assisted.' },
    ],
  },
  {
    id: 'business',
    chip: '🏪 Business owner',
    title: 'Business owner',
    subs: [
      { group: 'Direct tax — Income tax', items: ['Business head', 'Presumptive 44AD', 'Depreciation 32', 'Expenses 37(1)', '80JJAA'] },
      { group: 'Indirect tax — GST', items: ['GST registration', 'CGST', 'SGST', 'IGST', 'UTGST', 'Composition scheme', 'Input Tax Credit', 'GSTR-1 / 3B', 'E-invoice / E-way'] },
    ],
    roadmap: [
      { title: 'Confirm turnover & cash mix', detail: 'Total receipts, share paid digitally vs cash, and whether you are GST-registered.' },
      { title: 'Register / verify GST', detail: 'Above the threshold you charge CGST+SGST within the state, IGST across states.' },
      { title: 'Choose your income route', detail: 'Presumptive 44AD (6% digital / 8% cash, up to ₹2Cr–₹3Cr) vs regular books with real expenses.' },
      { title: 'Optimise GST', detail: 'Claim every eligible Input Tax Credit; if turnover ≤ ₹1.5Cr, weigh the Composition scheme.' },
      { title: 'Add direct-tax deductions', detail: 'Depreciation, genuine business expenses, 80JJAA for new hires (old regime).' },
      { title: 'Compare regimes & reconcile', detail: 'Engine computes both regimes; reconcile GSTR-2B before claiming ITC.' },
      { title: 'File both returns', detail: 'GSTR-1 & 3B on the GST portal, ITR-3/4 for income — CA signs off.' },
    ],
  },
  {
    id: 'professional',
    chip: '🩺 Professional / Freelancer',
    title: 'Professional or freelancer',
    subs: [
      { group: 'Direct tax — Income tax', items: ['Profession head', 'Presumptive 44ADA (50%)', '80C / 80D (old)'] },
      { group: 'Indirect tax — GST', items: ['GST on services (18% typical)', 'IGST for out-of-state clients', 'ITC on inputs', 'GSTR filings'] },
    ],
    roadmap: [
      { title: 'Confirm gross receipts', detail: 'Are professional receipts within ₹50L (₹75L if mostly digital)?' },
      { title: 'Check GST applicability', detail: 'Services usually attract 18% GST; export of services may be zero-rated with an LUT.' },
      { title: 'Use 44ADA presumptive', detail: 'Declare 50% of receipts as income — the rest is presumed expense, no books needed.' },
      { title: 'Claim deductions (old regime)', detail: '80C, 80D, 80CCD(1B), education-loan 80E if applicable.' },
      { title: 'Compare regimes', detail: 'New regime often wins for professionals with few deductions — engine confirms.' },
      { title: 'File ITR-4 + GST returns', detail: 'Export validated figures; reconcile GST; CA review before filing.' },
    ],
  },
  {
    id: 'investor',
    chip: '📈 Investor',
    title: 'Investor / capital gains',
    subs: [
      { group: 'Direct tax — Capital gains', items: ['STCG / LTCG', '112A equity shield', '54 / 54F reinvestment', '54EC bonds ₹50L', 'Tax-loss harvesting'] },
    ],
    roadmap: [
      { title: 'Classify each gain', detail: 'Short vs long term, and by asset — listed equity, property, debt, gold.' },
      { title: 'Use the equity shield', detail: 'Long-term listed-equity gains are exempt up to the annual threshold — realise yearly to use it.' },
      { title: 'Plan reinvestment exemptions', detail: '54 / 54F into a house, or 54EC bonds within 6 months for land/building gains.' },
      { title: 'Harvest losses', detail: 'Book capital losses to offset gains; carry unused losses forward up to 8 years.' },
      { title: 'Reconcile with AIS', detail: 'Match broker/AIS statements so nothing is missed or double-counted.' },
      { title: 'File ITR-2', detail: 'Export the validated computation; confirm current rates/indexation with a CA.' },
    ],
  },
  {
    id: 'property',
    chip: '🏠 Property owner',
    title: 'House-property owner',
    subs: [
      { group: 'Direct tax — House property', items: ['24(a) 30% standard', '24(b) home-loan interest ₹2L', 'Municipal taxes', '80EEA (date-gated)'] },
    ],
    roadmap: [
      { title: 'Classify the property', detail: 'Self-occupied, let-out, or deemed let-out — the rules differ for each.' },
      { title: 'Claim the standard 30%', detail: 'Flat 30% of net annual value on let-out property, no bills needed (24a).' },
      { title: 'Deduct home-loan interest', detail: 'Up to ₹2L on a self-occupied home (old regime); full interest on a let-out one.' },
      { title: 'Add municipal taxes', detail: 'Property tax actually paid is deducted before computing annual value.' },
      { title: 'Set off house-property loss', detail: 'Loss set-off against other income capped at ₹2L per year.' },
      { title: 'File ITR-2', detail: 'Export validated figures; CA review for the loan-interest split.' },
    ],
  },
  {
    id: 'senior',
    chip: '👴 Senior citizen',
    title: 'Senior citizen',
    subs: [
      { group: 'Direct tax — Income tax', items: ['Higher basic exemption', '80TTB ₹50k interest', '80D up to ₹50k', '80DDB illnesses'] },
    ],
    roadmap: [
      { title: 'Confirm age band', detail: '60–79 (senior) or 80+ (super-senior) — the basic exemption and slabs differ.' },
      { title: 'Shield deposit interest', detail: '80TTB exempts up to ₹50,000 of interest on deposits (old regime).' },
      { title: 'Maximise health cover', detail: '80D up to ₹50,000 for senior premiums; 80DDB for specified illnesses.' },
      { title: 'Compare regimes', detail: 'Old regime often wins for seniors with medical and interest income.' },
      { title: 'Check advance-tax relief', detail: 'Seniors without business income are exempt from advance tax.' },
      { title: 'File ITR-1 / ITR-2', detail: 'Export validated data; assisted filing available in-app.' },
    ],
  },
  {
    id: 'huf',
    chip: '👨‍👩‍👧 HUF / family',
    title: 'HUF / family',
    subs: [
      { group: 'Structuring', items: ['Form an HUF', 'Own basic exemption + 80C', 'Income splitting', '64 clubbing rules'] },
    ],
    roadmap: [
      { title: 'Assess if an HUF fits', detail: 'A Hindu Undivided Family is a separate taxpayer with its own exemption and 80C.' },
      { title: 'Identify genuine HUF assets', detail: 'Ancestral property, gifts to the HUF — must have real substance (GAAR).' },
      { title: 'Split income lawfully', detail: 'Route eligible income to the HUF or lower-taxed members, respecting §64 clubbing.' },
      { title: 'Run both PANs', detail: 'Individual and HUF each claim their own deductions — the engine computes both.' },
      { title: 'Get a CA to structure it', detail: 'HUF formation and deeds need professional set-up — flagged for human sign-off.' },
      { title: 'File separate returns', detail: 'One ITR for the individual, one for the HUF.' },
    ],
  },
  {
    id: 'nri',
    chip: '🌏 NRI',
    title: 'NRI / cross-border',
    subs: [
      { group: 'Direct tax', items: ['Residency test', 'DTAA treaty relief', 'TDS 195', 'Foreign-asset disclosure'] },
    ],
    roadmap: [
      { title: 'Determine residency', detail: 'The days-in-India test decides what income India can tax.' },
      { title: 'Apply treaty relief', detail: 'DTAA can lower or credit tax on the same income — needs a TRC.' },
      { title: 'Reconcile TDS', detail: 'TDS under §195 on Indian income; claim credit or refund.' },
      { title: 'Disclose foreign assets', detail: 'Schedule FA if resident — non-disclosure is high-risk (Black Money Act).' },
      { title: 'CA review is mandatory here', detail: 'Cross-border positions are escalated to a human CA by default.' },
      { title: 'File ITR-2 / ITR-3', detail: 'Export validated computation with treaty positions documented.' },
    ],
  },
];

/** Localised greeting for the assistant, keyed by i18n language code. */
export const ASSISTANT_GREETING: Record<string, string> = {
  en: "Namaste 👋 I'm your Tax Mitra. Let's find where you legally save the most tax. What best describes you?",
  hi: 'नमस्ते 👋 मैं आपका टैक्स मित्र हूँ। आइए देखें आप कानूनी रूप से सबसे ज़्यादा टैक्स कहाँ बचा सकते हैं। आप कौन हैं?',
  ta: 'வணக்கம் 👋 நான் உங்கள் டேக்ஸ் மித்ரா. சட்டப்படி அதிக வரி சேமிப்பைக் கண்டறியலாம். நீங்கள் யார்?',
  te: 'నమస్తే 👋 నేను మీ ట్యాక్స్ మిత్ర. చట్టబద్ధంగా ఎక్కువ పన్ను ఎక్కడ ఆదా చేయవచ్చో చూద్దాం. మీరు ఎవరు?',
  mr: 'नमस्कार 👋 मी तुमचा टॅक्स मित्र आहे. कायदेशीररीत्या सर्वाधिक कर कुठे वाचवता येईल पाहूया. तुम्ही कोण आहात?',
  bn: 'নমস্কার 👋 আমি আপনার ট্যাক্স মিত্র। আইনসম্মতভাবে সবচেয়ে বেশি কর কোথায় বাঁচবে দেখি। আপনি কে?',
  gu: 'નમસ્તે 👋 હું તમારો ટેક્સ મિત્ર છું. કાયદેસર રીતે સૌથી વધુ ટેક્સ ક્યાં બચે તે જોઈએ. તમે કોણ છો?',
};

/** Placeholder for the composer input, per language. */
export const ASSISTANT_PLACEHOLDER: Record<string, string> = {
  en: 'Type your answer…',
  hi: 'अपना उत्तर लिखें…',
  ta: 'பதிலை தட்டச்சு செய்க…',
  te: 'మీ సమాధానం టైప్ చేయండి…',
  mr: 'तुमचे उत्तर लिहा…',
  bn: 'আপনার উত্তর লিখুন…',
  gu: 'તમારો જવાબ લખો…',
};

/** BCP-47 tags for Web Speech (TTS / recognition), per i18n language. */
export const SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN',
};

/** Naive keyword → category routing (stands in for the LLM until 5.7.4). */
const KEYWORDS: Record<string, string[]> = {
  business: ['business', 'shop', 'gst', 'trader', 'dukaan', 'व्यापार'],
  salaried: ['salary', 'salaried', 'job', 'employee', 'नौकरी'],
  professional: ['freelance', 'professional', 'doctor', 'consultant', 'lawyer'],
  investor: ['invest', 'shares', 'stock', 'capital gain', 'mutual', 'equity'],
  property: ['rent', 'house', 'property', 'home loan'],
  senior: ['senior', 'retire', 'pension'],
  huf: ['huf', 'family', 'hindu undivided'],
  nri: ['nri', 'abroad', 'foreign', 'non resident'],
};

export function matchCategory(text: string): AssistantCategory | null {
  const t = text.toLowerCase();
  for (const [id, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) {
      return ASSISTANT_CATEGORIES.find((c) => c.id === id) ?? null;
    }
  }
  return null;
}
