/**
 * DeductionCompositionChart — part-to-whole as a single horizontal stacked bar
 * (OPT-UI.3, dataviz skill; the skill-correct replacement for task 1.5.2's
 * "pie chart").
 *
 * Categorical slots are assigned to deduction entities in a FIXED order (the
 * order is the CVD-safety mechanism); entities beyond the six slots fold into
 * "Other" — hues are never generated or cycled. 2px surface gaps separate
 * stacked segments. Legend is always present (≥2 series); values live in the
 * DataRow list right above this chart, which is the relief channel for the
 * sub-3:1 aqua/yellow slots.
 */

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../../utils/currency';
import { CATEGORICAL, CHART_INK, CHART_SURFACE } from './palette';
import type { TaxCalculationResult } from '../../../../shared/types/tax-calculation';

interface DeductionCompositionChartProps {
  result: TaxCalculationResult;
}

export function DeductionCompositionChart({ result }: DeductionCompositionChartProps) {
  const { t } = useTranslation();
  const d = result.deductionBreakdown;

  // FIXED entity → slot mapping. Never reorder by value: color follows the
  // entity, and a changed result must not repaint surviving segments.
  const entities: { key: string; label: string; value: number }[] = [
    { key: 'standard', label: t('taxBreakdown.standardDeduction'), value: d.standardDeduction },
    { key: 's80c', label: t('taxBreakdown.section80C'), value: d.section80C },
    { key: 'hra', label: t('taxBreakdown.hraExemption'), value: d.hra },
    { key: 's80d', label: t('taxBreakdown.section80D'), value: d.section80D },
    { key: 'nps', label: t('taxBreakdown.section80CCD1B'), value: d.section80CCD1B },
    {
      key: 'other',
      label: t('charts.otherDeductions', { defaultValue: 'Other' }),
      value: d.section80E + d.section80G + d.professionalTax,
    },
  ];

  const present = entities
    .map((e, slot) => ({ ...e, color: CATEGORICAL[slot] }))
    .filter((e) => e.value > 0);

  const total = present.reduce((sum, e) => sum + e.value, 0);
  if (total <= 0) return null;

  // Single-row dataset: one key per present entity → one stacked bar.
  const row: Record<string, number | string> = { name: 'deductions' };
  for (const e of present) row[e.key] = e.value;

  return (
    <figure
      aria-label={t('charts.deductionCompositionAria', {
        defaultValue: 'Composition of total deductions by section',
      })}
    >
      <ResponsiveContainer width="100%" height={64}>
        <BarChart data={[row]} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis type="number" hide domain={[0, total]} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            cursor={false}
            formatter={(value, key) => [
              formatIndianCurrency(Number(value)),
              present.find((e) => e.key === key)?.label ?? String(key),
            ]}
            contentStyle={{ fontSize: 13, borderRadius: 8 }}
          />
          {present.map((e) => (
            <Bar
              key={e.key}
              dataKey={e.key}
              stackId="total"
              fill={e.color}
              stroke={CHART_SURFACE}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend — identity is never color-alone; text wears ink tokens */}
      <figcaption>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {present.map((e) => (
            <li key={e.key} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: e.color }}
              />
              <span style={{ color: CHART_INK.secondary }}>
                {e.label}{' '}
                <span style={{ color: CHART_INK.muted }}>
                  ({Math.round((e.value / total) * 100)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
