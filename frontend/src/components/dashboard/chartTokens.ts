/*
  Shared chart tokens.

  Charts pulled colours from every corner of Tailwind before this — approval
  amber, realised and completed both drawn from the green family, hover set
  to Recharts' default dark grey. These constants keep every chart on the app
  palette and make sure things named "approved" / "completed" / "GV" always
  come out the same colour.
*/

export const CHART_COLORS = {
  blue: 'var(--chart-blue)',
  amber: 'var(--chart-amber)',
  emerald: 'var(--chart-emerald)',
  teal: 'var(--chart-teal)',
  violet: 'var(--chart-violet)',
  rose: 'var(--chart-rose)',
  gv: 'var(--gv)',
  gta: 'var(--gta)',
  gte: 'var(--gte)',
  muted: 'var(--color-muted-foreground)',
} as const;

/*
  One-per-status map used across the whole dashboard (funnel, trends,
  conversion bars, summary KPIs, status pills). The palette progresses from
  cold/neutral to warm to green, so the further a stage sits in the funnel
  the more "done" it looks — no red anywhere, red reads as failure:

    LEAD       neutral   -- inactive
    CONTACTED  blue      -- first touch (AIESEC blue, matches page titles)
    INTERESTED violet    -- warming up
    APPROVED   amber     -- approval granted
    REALIZED   teal      -- exchange started, approaching done
    COMPLETED  emerald   -- fully done, the deepest green
    FINISHED   neutral   -- archived
*/
export const STATUS_COLOR: Record<string, string> = {
  LEAD: CHART_COLORS.muted,
  CONTACTED: CHART_COLORS.blue,
  INTERESTED: CHART_COLORS.violet,
  APPROVED: CHART_COLORS.amber,
  REALIZED: CHART_COLORS.teal,
  COMPLETED: CHART_COLORS.emerald,
  FINISHED: CHART_COLORS.muted,
};

// Product colours match the brand tokens 1:1.
export const PRODUCT_COLOR: Record<string, string> = {
  GV: CHART_COLORS.gv,
  GTA: CHART_COLORS.gta,
  GTE: CHART_COLORS.gte,
};

// Recharts tooltip styling — soft blue tint, matches the row hover elsewhere.
export const TOOLTIP_STYLE: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-card)',
  color: 'var(--color-foreground)',
  boxShadow: '0 4px 12px -4px rgba(0,0,0,0.10)',
};

// Highlight used by Bar/Area hover and the axis cursor, so tables and charts
// share the same soft interaction feel.
export const CHART_HOVER_FILL = 'var(--chart-hover)';
