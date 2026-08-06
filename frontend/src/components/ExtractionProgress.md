# ExtractionProgress Component

## Overview

The `ExtractionProgress` component displays real-time progress for document extraction using WebSocket connections with automatic reconnection and polling fallback capabilities.

## Features

### Task 2.6.2 - Basic WebSocket Progress Tracking
- Real-time extraction progress via WebSocket
- Stage-based progress display (Textract, PII Detection, Enhancement, Storage)
- Visual progress indicators with percentage completion
- Success and error state handling

### Task 0.11.3 - Reconnection & Polling Fallback
- **Exponential Backoff Reconnection**: Attempts reconnection with delays: 1s, 2s, 4s, 8s, 16s, up to 30s
- **Max Reconnection Attempts**: 3 attempts before falling back to polling
- **Polling Fallback**: Polls `GET /documents/{documentId}` every 3 seconds after failed reconnections
- **Connection Indicators**: 
  - "Reconnecting..." badge with attempt counter (e.g., "Reconnecting... (1/3)")
  - "Using slower update mode" badge when in polling mode
- **Automatic Cleanup**: Properly closes WebSocket connections and stops polling on unmount

## Usage

### Basic Usage

```tsx
import { ExtractionProgress } from '@/components/ExtractionProgress';

function DocumentUploadPage() {
  const [documentId, setDocumentId] = useState<string | null>(null);

  const handleExtractionComplete = (extractedData: unknown) => {
    console.log('Extraction completed:', extractedData);
    // Process the extracted data
  };

  const handleExtractionError = (error: string) => {
    console.error('Extraction failed:', error);
    // Show error to user
  };

  if (!documentId) return null;

  return (
    <ExtractionProgress
      documentId={documentId}
      onComplete={handleExtractionComplete}
      onError={handleExtractionError}
    />
  );
}
```

### With Custom Styling

```tsx
<ExtractionProgress
  documentId="doc-123"
  onComplete={handleComplete}
  onError={handleError}
  className="my-4 max-w-2xl"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `documentId` | `string` | Yes | Unique identifier for the document being processed |
| `onComplete` | `(data: unknown) => void` | No | Callback fired when extraction completes successfully |
| `onError` | `(error: string) => void` | No | Callback fired when extraction fails |
| `className` | `string` | No | Additional CSS classes for styling |

## Extraction Stages

The component displays progress across four stages:

1. **Textract** (0-40%): OCR text and table extraction using Amazon Textract
2. **PII Detection** (40-60%): Identifying personally identifiable information
3. **Enhancement** (60-80%): AI-powered data structuring with Bedrock
4. **Storage** (80-100%): Encrypted storage in DynamoDB

## Connection Modes

### WebSocket Mode (Default)
- Real-time updates via WebSocket connection
- Low latency progress notifications
- Automatically attempts reconnection on disconnect

### Reconnecting Mode
- Shows when WebSocket connection is lost
- Displays attempt counter (1/3, 2/3, 3/3)
- Exponential backoff between attempts

### Polling Mode (Fallback)
- Activates after 3 failed WebSocket reconnection attempts
- Polls document status every 3 seconds
- Shows "Using slower update mode" badge
- Continues until extraction completes or fails

## Requirements Addressed

- **Requirement 2.4**: Display upload progress with percentage completion
- **Requirement 2.4**: Handle network connectivity issues gracefully
- **Requirement 10.5**: Continue functioning when network connectivity is lost
- **Requirement 10.6**: Synchronize when connectivity is restored

## Design Constraints (MEDIUM-5)

This component addresses the MEDIUM-5 design gap:
- Mobile users frequently switch networks causing WebSocket drops
- Implements exponential backoff reconnection (1s, 2s, 4s, max 30s)
- Falls back to polling after 3 failed reconnects
- Shows clear indicators during reconnection and fallback states

## API Integration

### WebSocket Endpoint
- URL: `wss://{API_BASE_URL}/extraction-progress`
- Message Format (Subscribe):
  ```json
  {
    "action": "subscribe",
    "documentId": "doc-123"
  }
  ```
- Message Format (Progress Update):
  ```json
  {
    "documentId": "doc-123",
    "overallProgress": 45,
    "currentStage": "PII Detection",
    "status": "processing",
    "stages": [
      { "name": "Textract", "progress": 100, "status": "completed" },
      { "name": "PII Detection", "progress": 50, "status": "in-progress" },
      { "name": "Enhancement", "progress": 0, "status": "pending" },
      { "name": "Storage", "progress": 0, "status": "pending" }
    ]
  }
  ```

### Polling Endpoint
- URL: `GET {API_BASE_URL}/documents/{documentId}`
- Response: Same format as WebSocket progress update

## Testing

The component includes unit tests covering:
- Initial rendering with pending stages
- Stage progress ranges display
- Custom className support
- Callback function acceptance

Integration tests for WebSocket reconnection and polling would require more complex mocking and should be performed in an E2E testing environment.

## Browser Compatibility

- WebSocket support: All modern browsers (IE 10+)
- Falls back gracefully to polling if WebSocket is unavailable
- Tested with Chrome, Firefox, Safari, and Edge

## Performance Considerations

- WebSocket connection is closed automatically on component unmount
- Polling intervals are cleared to prevent memory leaks
- Progress updates are debounced to avoid excessive re-renders
- Component uses React hooks efficiently with proper dependency arrays

## Future Enhancements

- [ ] Add pause/resume extraction capability
- [ ] Display estimated time remaining
- [ ] Add retry button for failed extractions
- [ ] Support WebSocket authentication with JWT tokens
- [ ] Add i18n support for multi-language labels
