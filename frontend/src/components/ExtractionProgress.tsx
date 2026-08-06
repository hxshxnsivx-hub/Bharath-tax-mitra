/**
 * Extraction Progress Component
 * 
 * Displays real-time extraction progress for uploaded documents via WebSocket.
 * Shows stage updates, handles reconnection, and falls back to polling on failure.
 * 
 * Task 2.6.2: Basic WebSocket progress tracking
 * Task 0.11.3: WebSocket reconnection with polling fallback
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, AlertCircle, WifiOff, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractionStage {
  name: 'Textract' | 'PII Detection' | 'Enhancement' | 'Storage';
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface ExtractionProgressData {
  documentId: string;
  overallProgress: number; // 0-100
  currentStage: ExtractionStage['name'];
  stages: ExtractionStage[];
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  extractedData?: unknown;
}

export type ConnectionMode = 'websocket' | 'polling' | 'disconnected';

interface ExtractionProgressProps {
  documentId: string;
  onComplete?: (data: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
}

// ─── Reconnection Configuration ──────────────────────────────────────────────

const RECONNECT_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s (max 30s not needed as only 3 attempts)
const MAX_RECONNECT_ATTEMPTS = 3;
const POLLING_INTERVAL = 3000; // 3 seconds

// ─── Component ───────────────────────────────────────────────────────────────

export const ExtractionProgress: React.FC<ExtractionProgressProps> = ({
  documentId,
  onComplete,
  onError,
  className = '',
}) => {
  const [progress, setProgress] = useState<ExtractionProgressData>({
    documentId,
    overallProgress: 0,
    currentStage: 'Textract',
    stages: [
      { name: 'Textract', progress: 0, status: 'pending' },
      { name: 'PII Detection', progress: 0, status: 'pending' },
      { name: 'Enhancement', progress: 0, status: 'pending' },
      { name: 'Storage', progress: 0, status: 'pending' },
    ],
    status: 'processing',
  });

  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // ─── Polling Fallback ──────────────────────────────────────────────────────

  const pollDocumentStatus = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      updateProgressFromData(data);

      // Stop polling if extraction is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
        
        if (data.status === 'completed' && onComplete) {
          onComplete(data.extractedData);
        } else if (data.status === 'failed' && onError) {
          onError(data.errorMessage || 'Extraction failed');
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling even on error - temporary network issues shouldn't stop it
    }
    // stopPolling intentionally omitted (mutual recursion with polling lifecycle) —
    // reconciliation of this component is owned by OPT-P2.5 / task 0.11.3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, onComplete, onError]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    console.log('[ExtractionProgress] Starting polling fallback');
    setConnectionMode('polling');
    
    // Poll immediately, then every 3 seconds
    pollDocumentStatus();
    pollingIntervalRef.current = setInterval(pollDocumentStatus, POLLING_INTERVAL);
  }, [pollDocumentStatus]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ─── WebSocket Connection ──────────────────────────────────────────────────

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Stop polling if switching back to WebSocket
    stopPolling();

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/extraction-progress`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;

        console.log('[ExtractionProgress] WebSocket connected');
        setConnectionMode('websocket');
        setReconnectAttempt(0);
        setIsReconnecting(false);

        // Subscribe to document updates
        ws.send(JSON.stringify({
          action: 'subscribe',
          documentId,
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          updateProgressFromData(data);

          // Handle completion
          if (data.status === 'completed' && onComplete) {
            onComplete(data.extractedData);
          } else if (data.status === 'failed' && onError) {
            onError(data.errorMessage || 'Extraction failed');
          }
        } catch (error) {
          console.error('[ExtractionProgress] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[ExtractionProgress] WebSocket error:', error);
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;

        console.log('[ExtractionProgress] WebSocket closed:', event.code, event.reason);
        setConnectionMode('disconnected');

        // Only attempt reconnection if not manually closed and extraction is still in progress
        if (!event.wasClean && progress.status === 'processing') {
          attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[ExtractionProgress] Failed to create WebSocket:', error);
      setConnectionMode('disconnected');
      attemptReconnect();
    }
    // attemptReconnect intentionally omitted (mutual recursion with connect) —
    // reconciliation of this component is owned by OPT-P2.5 / task 0.11.3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, onComplete, onError, stopPolling, progress.status]);

  // ─── Reconnection Logic ────────────────────────────────────────────────────

  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;

    const attempt = reconnectAttempt;

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[ExtractionProgress] Max reconnection attempts reached, falling back to polling');
      startPolling();
      return;
    }

    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    console.log(`[ExtractionProgress] Reconnecting in ${delay}ms (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    setIsReconnecting(true);
    setReconnectAttempt(attempt + 1);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectWebSocket();
    }, delay);
  }, [reconnectAttempt, connectWebSocket, startPolling]);

  // ─── Progress Update ───────────────────────────────────────────────────────

  const updateProgressFromData = (data: Partial<ExtractionProgressData>) => {
    setProgress((prev) => ({
      ...prev,
      ...data,
      stages: data.stages || prev.stages,
    }));
  };

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    // Start with WebSocket connection
    connectWebSocket();

    return () => {
      mountedRef.current = false;

      // Cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      stopPolling();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket, stopPolling]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const getStageProgressRange = (stageName: ExtractionStage['name']): [number, number] => {
    const ranges: Record<ExtractionStage['name'], [number, number]> = {
      'Textract': [0, 40],
      'PII Detection': [40, 60],
      'Enhancement': [60, 80],
      'Storage': [80, 100],
    };
    return ranges[stageName];
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Extracting Document Data
        </h3>
        
        {/* Connection Mode Badge */}
        {connectionMode === 'polling' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm font-medium">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Using slower update mode</span>
          </div>
        )}
        
        {isReconnecting && connectionMode === 'disconnected' && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Reconnecting... ({reconnectAttempt}/{MAX_RECONNECT_ATTEMPTS})</span>
          </div>
        )}
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-semibold text-gray-900">{progress.overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
      </div>

      {/* Stage Details */}
      <div className="space-y-4">
        {progress.stages.map((stage) => {
          const [minProgress, maxProgress] = getStageProgressRange(stage.name);
          const isActive = stage.status === 'in-progress';
          const isCompleted = stage.status === 'completed';
          const isFailed = stage.status === 'failed';

          return (
            <div key={stage.name} className="flex items-start gap-3">
              {/* Stage Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {isActive && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
                {isCompleted && (
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {isFailed && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {stage.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full bg-gray-200" />
                )}
              </div>

              {/* Stage Info */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' :
                    isCompleted ? 'text-green-600' :
                    isFailed ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {stage.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {minProgress}% - {maxProgress}%
                  </span>
                </div>

                {/* Stage Progress Bar */}
                {(isActive || isCompleted) && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {progress.status === 'failed' && progress.errorMessage && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">
                Extraction Failed
              </h4>
              <p className="text-sm text-red-700">{progress.errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {progress.status === 'completed' && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900">
                Extraction Complete
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Your document has been processed successfully.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionProgress;
