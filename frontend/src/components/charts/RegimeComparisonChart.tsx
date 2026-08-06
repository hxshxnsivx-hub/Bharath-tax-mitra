/**
 * RegimeComparisonChart — emphasis-form bar chart (OPT-UI.3, dataviz skill).
 *
 * Form: "one series is the point, the rest are context" → the recommended
 * regime wears the focus hue, the other recedes to gray. Direct ₹ labels on
 * both marks (identity is never color-alone); axes are recessive; hover
 * tooltip ships by default. The metric cards beside this chart are the
 * numeric relief channel.
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
import { CHART_INK, CHART_SURFACE, EMPHASIS } from './palette';
import type { RegimeComparisonResult } from '../../../../shared/types/tax-calculation';

interface RegimeComparisonChartProps {
  comparison: RegimeComparisonResult;
}

export function RegimeComparisonChart({ comparison }: RegimeComparisonChartProps) {
  const { t } = useTranslation();

  const data = [
    {
      key: 'old',
      name: t('regimeComparison.oldRegime'),
      tax: comparison.oldRegime.totalTaxLiability,
    },
    {
      key: 'new',
      name: t('regimeComparison.newRegime'),
      tax: comparison.newRegime.totalTaxLiability,
    },
  ];

  return (
    <figure
      aria-label={t('charts.regimeComparisonAria', {
        defaultValue: 'Total tax liability under old vs new regime',
      })}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 24, right: 16, left: 16, bottom: 0 }} barSize={48}>
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: CHART_INK.secondary, fontSize: 13 }}
          />
          {/* Values are direct-labeled — hide the y axis, keep the scale honest at 0 */}
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            formatter={(value) => [formatIndianCurrency(Number(value)), t('taxSummary.taxLiability')]}
            contentStyle={{ fontSize: 13, borderRadius: 8 }}
          />
          <Bar dataKey="tax" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.key === comparison.recommendedRegime ? EMPHASIS.focus : EMPHASIS.context}
                stroke={CHART_SURFACE}
                strokeWidth={2}
              />
            ))}
            {/* Direct labels wear ink, never the series color */}
            <LabelList
              dataKey="tax"
              position="top"
              formatter={(v: number) => formatIndianCurrency(v)}
              style={{ fill: CHART_INK.primary, fontSize: 13, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <figcaption className="mt-1 text-center text-xs text-gray-500">
        {t('charts.regimeComparisonCaption', {
          defaultValue: 'Highlighted bar = recommended regime',
        })}
      </figcaption>
    </figure>
  );
}
