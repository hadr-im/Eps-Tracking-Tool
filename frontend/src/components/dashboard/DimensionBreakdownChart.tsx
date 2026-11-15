/*
  Where the department's leads come from — by university, or by field of study.

  A note on the form: these lists are long (33 universities, 45 fields), and a
  pie past about six slices turns its tail into slivers nobody can rank. That
  is handled by showing only the top slices and folding the rest into one
  "Other", and by putting the share on every legend row so the numbers can be
  read even where the geometry cannot. Ranked bars compare more precisely and
  are a drop-in swap if that is ever wanted.

  Colour here carries identity, so it is categorical: a fixed order of hues,
  assigned by position and never cycled. The palette was checked with the
  validator rather than by eye — all eight pass the lightness band, chroma
  floor, colourblind separation and the normal-vision floor on this surface.
  Several sit under 3:1 contrast against the card, which is why every slice is
  named in the legend rather than identified by colour alone.
*/

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTokens';
import type { DimensionCount } from '@/types/dashboard';

/*
  Validated with the palette checker against this card's surface:
    lightness band  PASS    chroma floor  PASS
    CVD separation  PASS (worst adjacent dE 17.0, deutan)
    normal vision   PASS (worst adjacent dE 25.5)
    contrast        WARN — relieved by the named legend below

  Fixed order, assigned by slice position. Dark mode has no toggle in this app
  today; if one is added these need re-validating against the dark surface
  rather than being reused, since a palette that passes on white often fails
  on near-black.
*/
const SLICE_COLORS = [
  '#037EF3', // brand blue
  '#F59E0B', // amber
  '#7C3AED', // violet
  '#10B981', // emerald
  '#BE123C', // deep rose
  '#0CB9C1', // teal
  '#A16207', // bronze
  '#F472B6', // pink
] as const;

interface DimensionBreakdownChartProps {
  title: string;
  icon: React.ElementType;
  data?: DimensionCount[];
  isLoading: boolean;
  // Slices before the remainder is folded into "Other".
  topN?: number;
  emptyMessage?: string;
  // Caption under the title; the count line is used when this is absent.
  subtitle?: string;
  /*
    A colour for a given label, where the set of labels is known in advance
    and fixed — tracking phases, for instance. Positional assignment is right
    for universities, where the list is open-ended and the order is the
    ranking, but wrong for a closed set: a phase that empties out would hand
    its hue to the next one along and repaint every slice after it.
  */
  colorFor?: (label: string) => string | undefined;
}

/*
  Most universities are stored as "CODE: Full Name", and the code is what
  people actually say. But several share a code — "EPI: Sousse" and "EPI:
  École Polytechnique Internationale Privée de Sousse" are different entries —
  so a bare code would print the same label twice and make two slices
  indistinguishable. Codes are therefore only used where they are unique
  within the set being drawn.
*/
function buildLabels(labels: string[]): Map<string, string> {
  const codeOf = (l: string) => {
    const head = l.split(':')[0]!.trim();
    return head && head !== l && head.length <= 12 ? head : null;
  };

  const counts = new Map<string, number>();
  for (const l of labels) {
    const c = codeOf(l);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  const out = new Map<string, string>();
  for (const l of labels) {
    const c = codeOf(l);
    const unique = c !== null && counts.get(c) === 1;
    const short = unique ? c! : l;
    out.set(l, short.length > 30 ? `${short.slice(0, 29)}…` : short);
  }
  return out;
}

export function DimensionBreakdownChart({
  title,
  icon: Icon,
  data,
  isLoading,
  topN = 8,
  emptyMessage = 'Nothing recorded yet.',
  subtitle,
  colorFor,
}: DimensionBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card className="border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const rows = [...(data ?? [])].sort((a, b) => b.count - a.count);
  const isEmpty = rows.length === 0;

  const top = rows.slice(0, topN);
  const tail = rows.slice(topN);
  const tailTotal = tail.reduce((sum, r) => sum + r.count, 0);
  const total = rows.reduce((sum, r) => sum + r.count, 0);

  const shortFor = buildLabels(top.map((r) => r.label));

  const slices = [
    ...top.map((r, i) => ({
      name: shortFor.get(r.label) ?? r.label,
      full: r.label,
      value: r.count,
      color: colorFor?.(r.label) ?? SLICE_COLORS[i % SLICE_COLORS.length]!,
    })),
    // Kept rather than dropped, so the slices still add up to the whole.
    ...(tailTotal > 0
      ? [{
          name: `Other (${tail.length})`,
          full: `${tail.length} more, ${tailTotal} leads between them`,
          value: tailTotal,
          color: CHART_COLORS.muted,
        }]
      : []),
  ];

  const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={15} className="text-muted-foreground" />
          {title}
        </CardTitle>
        {!isEmpty && (
          <p className="text-[11px] text-muted-foreground">
            {subtitle ?? `${rows.length} in total across ${total} leads`}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isEmpty ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <Icon size={36} className="text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          /*
            Sized against the card, not the screen.

            This chart sits full-width on one page and two-to-a-row on
            another, so a screen-width breakpoint gets it wrong on one of
            them every time: `lg:grid-cols-2` on the legend meant two columns
            whenever the *window* was wide, including when that window held
            two half-width cards, which is exactly where the names have no
            room and "FLSH: Faculte des Lettres..." collapses to "F". A
            container query asks the only question that matters — how much
            room does this card have.
          */
          <div className="@container flex flex-col items-center gap-4 @md:flex-row @md:items-start">
            <ResponsiveContainer width="100%" height={260} className="@md:max-w-70">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={110}
                  /*
                    A gap in the card's own colour between slices, so adjacent
                    fills read as separate shapes rather than one band of
                    colour — the thing that makes a many-slice pie unreadable.
                  */
                  paddingAngle={2}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {slices.map((s) => (
                    <Cell key={s.full} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => {
                    const n = Number(value ?? 0);
                    return [`${n} lead${n === 1 ? '' : 's'} (${share(n)}%)`, ''];
                  }}
                  labelFormatter={(_, payload) =>
                    payload?.[0] ? (payload[0].payload as (typeof slices)[0]).full : ''
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            {/*
              The legend carries the names and the figures, not just swatches.
              Several of these hues sit below 3:1 against the card, so colour
              alone cannot be what tells one slice from another — and on a pie
              this long the small slices have nowhere to print a label.
            */}
            <ul className="grid w-full min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-1 @3xl:grid-cols-2">
              {slices.map((s) => (
                <li key={s.full} className="flex items-center gap-2 text-xs" title={s.full}>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.name}</span>
                  <span className="shrink-0 tabular-nums font-medium">{s.value}</span>
                  <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                    {share(s.value)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
