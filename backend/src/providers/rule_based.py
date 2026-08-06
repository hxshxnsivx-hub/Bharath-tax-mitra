"""
Offline rule-based provider (Module 5.2.1).

The safe fallback when there's no connectivity or no API key. It does NOT try to
be a conversational LLM — for a tax product, a deterministic, grounded responder
is *better* offline than a small hallucinating model: it routes the user to a
taxpayer category and hands back a stable next step, never an invented number.

Category routing mirrors the frontend assistant's keyword map so the offline and
online paths behave consistently.
"""

from __future__ import annotations

from .base import ChatMessage, ModelProvider, ProviderResponse

# Keyword → category id (kept in sync with frontend assistantData.ts).
_KEYWORDS: dict[str, list[str]] = {
    "business": ["business", "shop", "gst", "trader", "dukaan"],
    "salaried": ["salary", "salaried", "job", "employee"],
    "professional": ["freelance", "professional", "doctor", "consultant", "lawyer"],
    "investor": ["invest", "shares", "stock", "capital gain", "mutual", "equity"],
    "property": ["rent", "house", "property", "home loan"],
    "senior": ["senior", "retire", "pension"],
    "huf": ["huf", "family", "hindu undivided"],
    "nri": ["nri", "abroad", "foreign", "non resident"],
}

# Grounded, number-free next step per category (cites the relevant area only).
_CATEGORY_REPLY: dict[str, tuple[str, list[str]]] = {
    "salaried": ("You're salaried — let's compare the old vs new regime and stack your eligible deductions (HRA, 80C, 80D, NPS). Share your salary and what you invest, and I'll show the tax-minimising plan.", ["§16(ia)", "§10(13A)", "§80C", "§80D"]),
    "business": ("As a business owner you deal with two systems: income tax (presumptive 44AD or regular books) and GST (registration, CGST/SGST/IGST, Input Tax Credit). Tell me your turnover and cash-vs-digital split.", ["§44AD", "GST/ITC"]),
    "professional": ("For professionals, 44ADA lets you declare 50% of receipts as income with no books; GST at 18% usually applies on services. Share your gross receipts.", ["§44ADA"]),
    "investor": ("For capital gains we'll classify each gain, use the listed-equity exemption and reinvestment reliefs (54/54F/54EC), and harvest losses. Share your gains by asset type.", ["§112A", "§54", "§54F", "§54EC"]),
    "property": ("For house property we'll claim the 30% standard deduction and home-loan interest, and set off any loss. Tell me if it's self-occupied or let-out.", ["§24(a)", "§24(b)"]),
    "senior": ("As a senior citizen you get a higher exemption, 80TTB on deposit interest, and larger 80D. Share your age band and income sources.", ["§80TTB", "§80D"]),
    "huf": ("An HUF can be a separate taxpayer with its own exemption and 80C — but it needs genuine family assets (GAAR). A CA should set up the structure.", ["HUF", "§64"]),
    "nri": ("For NRIs, residency decides what India taxes; DTAA can give relief. These positions are escalated to a human CA by default.", ["residency", "DTAA", "§195"]),
}

_FALLBACK = (
    "I can help you file and legally reduce your tax. Which are you — salaried, "
    "a business owner, a professional/freelancer, an investor, a property owner, "
    "a senior citizen, an HUF, or an NRI?"
)


def _last_user_text(messages: list[ChatMessage]) -> str:
    for m in reversed(messages):
        if m.role == "user":
            return m.content
    return ""


def match_category(text: str) -> str | None:
    t = text.lower()
    for cid, words in _KEYWORDS.items():
        if any(w in t for w in words):
            return cid
    return None


class RuleBasedProvider(ModelProvider):
    name = "rule-based"
    offline = True

    def chat(self, messages: list[ChatMessage]) -> ProviderResponse:
        text = _last_user_text(messages)
        cid = match_category(text)
        if cid is not None:
            reply, citations = _CATEGORY_REPLY[cid]
            return ProviderResponse(
                content=reply,
                provider=self.name,
                offline=True,
                category=cid,
                citations=citations,
            )
        return ProviderResponse(content=_FALLBACK, provider=self.name, offline=True)
