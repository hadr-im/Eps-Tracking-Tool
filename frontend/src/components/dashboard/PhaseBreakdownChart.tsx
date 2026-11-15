/*
  Where the EPs being tracked currently sit.

  Drawn by the same component as the university and field breakdowns, rather
  than by its own copy of a donut. The old one gave the legend a strip under
  the chart, which on a wide card meant a ring floating in the middle of a
  mostly empty box — the chart occupied about a third of the height it took
  up. Sharing the component puts the legend beside the ring, so the card is
  the size of what it draws, and the three breakdowns on the page read as one
  thing rather than three.

  The colours are fixed per phase, not assigned by rank. Phases are a closed
  set of nine, and they empty and refill as work moves: with positional
  colours, the day nobody was "Waiting for CV" every slice after it changed
  hue, which makes two screenshots a week apart impossible to compare.
*/

import { PieChart as PieChartIcon } from 'lucide-react';
import { DimensionBreakdownChart } from './DimensionBreakdownChart';
import { CHART_COLORS } from './chartTokens';
import type { PhaseCount } from '@/types/dashboard';

// Human-readable phase labels — mirrors TrackingPhaseCell.
const PHASE_LABELS: Record<string, string> = {
  WAITING_FOR_ANSWER:        'Waiting for Answer',
  EP_NOT_RESPONDING:         'Not Responding',
  EXPLAINING_AIESEC:         'Explaining AIESEC',
  LOOKING_FOR_OPPORTUNITIES: 'Looking for Opportunities',
  HAVING_INTERVIEW:          'Having Interview',
  WILL_SIGN_CONTRACT:        'Will Sign Contract',
  CONTRACT_SIGNED:           'Contract Signed',
  WAITING_FOR_CV:            'Waiting for CV',
  NOT_INTERESTED_ANYMORE:    'Not Interested',
};

/*
  One hue per phase, keyed by the label the reader sees.

  Hues from the same eight-step categorical set the other breakdowns use, so
  the three charts belong to one palette. They are ordered here by how far
  along the conversation is — first contact in blue, through the warm middle,
  to green once a contract is signed — and the two dead ends are the ones
  that carry weight: a stalled EP in deep rose, a lost one in grey, because
  those are the two a Team Leader is scanning for.
*/
const PHASE_COLOR: Record<string, string> = {
  'Waiting for Answer':        '#037EF3', // brand blue
  'Explaining AIESEC':         '#7C3AED', // violet
  'Looking for Opportunities': '#0CB9C1', // teal
  'Having Interview':          '#F472B6', // pink
  'Waiting for CV':            '#A16207', // bronze
  'Will Sign Contract':        '#F59E0B', // amber
  'Contract Signed':           '#10B981', // emerald
  'Not Responding':            '#BE123C', // deep rose — stalled
  'Not Interested':            CHART_COLORS.muted, // a dead end, drawn as one
};

interface PhaseBreakdownChartProps {
  data?: PhaseCount[];
  isLoading: boolean;
}

export function PhaseBreakdownChart({ data, isLoading }: PhaseBreakdownChartProps) {
  const rows = (data ?? [])
    .filter((d) => d.count > 0)
    .map((d) => ({ label: PHASE_LABELS[d.phase] ?? d.phase, count: d.count }));

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <DimensionBreakdownChart
      title="Tracking Phase Breakdown"
      icon={PieChartIcon}
      data={rows}
      isLoading={isLoading}
      // All nine fit; nothing is ever folded into "Other".
      topN={9}
      subtitle={`${total} EP${total === 1 ? '' : 's'} being tracked`}
      colorFor={(label) => PHASE_COLOR[label]}
      emptyMessage="No tracking phases set yet. Start updating your EPs to see this chart."
    />
  );
}
