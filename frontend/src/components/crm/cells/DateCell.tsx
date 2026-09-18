interface DateCellProps {
  value: string | null;
  /** Show full datetime (default: date only) */
  withTime?: boolean;
}

export function DateCell({ value, withTime = false }: DateCellProps) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;

  try {
    const date = new Date(value);
    const day = date.getDate().toString().padStart(2, '0');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let formatted = `${day} ${month} ${year}`;

    if (withTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      formatted += `, ${hours}:${minutes}`;
    }

    return <span className="whitespace-nowrap text-xs tabular-nums">{formatted}</span>;
  } catch {
    return <span className="text-muted-foreground text-xs">{value}</span>;
  }
}
