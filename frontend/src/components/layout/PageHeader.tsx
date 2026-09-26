// PageHeader — the title block every authenticated page opens with.
//
// One component so the pages cannot drift apart: same spacing, same type
// scale, same blue title. Replaces the uppercase eyebrow each page used to
// render above its heading.

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  // Right-hand slot: a count badge, a filter, an action button
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'shrink-0 border-b border-border/60 bg-card pl-4 pr-4 md:px-6 pt-5 pb-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-aiesec-blue leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
