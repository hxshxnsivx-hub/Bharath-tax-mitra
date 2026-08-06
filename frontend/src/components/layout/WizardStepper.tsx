/**
 * WizardStepper Component
 *
 * Horizontal step progress indicator for multi-step wizards.
 * - Completed steps show a green checkmark.
 * - Current step is highlighted in blue with a ring.
 * - On narrow screens (< 640px) shows "Step X of Y" text instead of full bar.
 */

import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  /** Emoji or short text icon, e.g. "👤" */
  icon: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
}

export function WizardStepper({ steps, currentStepIndex, onStepClick }: WizardStepperProps) {
  const totalSteps = steps.length;

  return (
    <nav aria-label="Tax filing progress">
      {/* ── Mobile compact view (< sm) ── */}
      <div className="sm:hidden flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <span className="text-xs text-gray-500">{steps[currentStepIndex]?.label}</span>
      </div>

      {/* ── Desktop / tablet step indicators ── */}
      <ol className="hidden sm:flex items-start" aria-label="Steps">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = !!onStepClick && (isCompleted || isCurrent);

          return (
            <li
              key={step.id}
              className="flex-1 flex flex-col items-center relative"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Connector line (between steps) */}
              {index < totalSteps - 1 && (
                <span
                  className={`absolute top-4 left-1/2 w-full h-0.5 -translate-y-1/2 ${
                    isCompleted ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                  style={{ left: '50%' }}
                />
              )}

              {/* Step circle */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick && onStepClick(index)}
                aria-label={`${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                className={`
                  relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                  ${isCompleted
                    ? 'bg-green-500 text-white focus-visible:ring-green-500'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 focus-visible:ring-blue-500'
                    : 'bg-gray-200 text-gray-500 cursor-default focus-visible:ring-gray-400'
                  }
                  ${isClickable ? 'cursor-pointer hover:opacity-90' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" aria-hidden="true" strokeWidth={3} />
                ) : (
                  <span aria-hidden="true">{step.icon}</span>
                )}
              </button>

              {/* Step label */}
              <span
                className={`mt-1.5 text-xs text-center leading-tight truncate max-w-[64px] ${
                  isCurrent ? 'text-blue-600 font-semibold' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Progress bar (shown on all sizes) */}
      <div
        className="w-full bg-gray-200 h-1.5 rounded-full mt-2"
        role="progressbar"
        aria-valuenow={currentStepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStepIndex + 1} of ${totalSteps}`}
      >
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </nav>
  );
}

export default WizardStepper;
