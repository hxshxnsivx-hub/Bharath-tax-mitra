/**
 * ChatView (placeholder)
 *
 * Non-critical view, loaded lazily so its JS stays out of the initial chunk.
 * Requirements: 10.8, 19.4, 19.7 | Compliance: Low-bandwidth accessibility
 */

export default function ChatView() {
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
