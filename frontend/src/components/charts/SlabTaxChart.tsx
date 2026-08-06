/**
 * SlabTaxChart — tax per slab as an ordinal-ramp bar chart (OPT-UI.3).
 *
 * Slab order is meaningful (rates ascend), so per the dataviz skill this is an
 * ORDINAL encoding: one hue, light→dark with the rate — the reader sees the
 * progression in the color. The ramp was validated with --ordinal. SlabTable
 * (rendered alongside) is the table view / relief channel; direct ₹ labels top
 * each bar; hover tooltip ships by default.
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatIndianCurrency } from '../../utils/currency';
import { CHART_INK, CHART_SURFACE, ordinalSteps } from './palette';
import type { TaxCalculationResult } from '../../../../shared/types/tax-calculation';

interface SlabTaxChartProps {
  slabWiseTax: TaxCalculationResult['slabWiseTax'];
}

export function SlabTaxChart({ slabWiseTax }: SlabTaxChartProps) {
  const { t } = useTranslation();

  // Only slabs that actually hold income; keep engine order (ascending rate).
  const slabs = slabWiseTax.filter((s) => s.income > 0);
  if (slabs.length === 0) return null;

  const colors = ordinalSteps(slabs.length);
  const data = slabs.map((s, i) => ({
    rate: `${s.rate}%`,
    tax: s.tax,
    income: s.income,
    slab: s.slab,
    color: colors[i],
  }));

  return (
    <figure
      aria-label={t('charts.slabTaxAria', {
        defaultValue: 'Tax charged per income slab, ordered by rate',
      })}
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="25%">
          <XAxis
            dataKey="rate"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_INK.muted, fontSize: 12 }}
          />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            formatter={(value) => [formatIndianCurrency(Number(value)), t('taxBreakdown.taxAmount')]}
            labelFormatter={(label, payload) =>
              (payload?.[0]?.payload as { slab?: string } | undefined)?.slab ?? String(label)
            }
            contentStyle={{ fontSize: 13, borderRadius: 8 }}
          />
          <Bar dataKey="tax" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.rate} fill={d.color} stroke={CHART_SURFACE} strokeWidth={2} />
            ))}
            <LabelList
              dataKey="tax"
              position="top"
              formatter={(v: number) => (v > 0 ? formatIndianCurrency(v) : '')}
              style={{ fill: CHART_INK.secondary, fontSize: 11, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="mt-1 text-center text-xs text-gray-500">
        {t('charts.slabTaxCaption', { defaultValue: 'Darker = higher slab rate' })}
      </figcaption>
    </figure>
  );
}
