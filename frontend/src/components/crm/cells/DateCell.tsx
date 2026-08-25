interface DateCellProps {
  value: string | null;
  /** Show full datetime (default: date only) */
  withTime?: boolean;
}

export function DateCell({ value, withTime = false }: DateCellProps) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;

  try {
    const date = new Date(value);
    const formatted = withTime
      ? date.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
    return <span className="whitespace-nowrap text-xs tabular-nums">{formatted}</span>;
  } catch {
    return <span className="text-muted-foreground text-xs">{value}</span>;
  }
}
