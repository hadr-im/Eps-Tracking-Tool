// Shared mobile card shell used by every EP-related page's mobile view
// (My CRM, Team CRM, Approved, Under Process, Transitioned).
//
// The closed header follows the Dispatch card design (round avatar, bold name,
// "#ID · date" below, status pill + chevron on the right). The expanded body
// is a stack of Sections with InfoRows — one label/value per line — so every
// page renders detail the same way regardless of which fields it shows.

import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

import { UserAvatar } from '@/components/layout/UserAvatar';
import { DateCell } from '@/components/crm/cells/DateCell';
import { cn } from '@/lib/utils';

interface EpMobileCardProps {
  /** Person shown in the avatar + name row. */
  fullName: string;
  /** EP id / hash id / etc. Rendered as "#{id}" in the header sub-line. */
  id: string;
  /** ISO date shown next to the id; usually createdAtExpa. */
  createdAt?: string | null;
  /** Right-side pill (status, direction, phase, …). */
  headerRight?: ReactNode;
  /** Small line under the sub-line, e.g. product name, transition arrow. */
  headerSub?: ReactNode;
  /** Actions rendered as the always-visible footer of the closed card
   *  (comments button, transition dropdown, etc.). */
  footer?: ReactNode;
  /** Optional avatar url, falls back to initials. */
  avatarUrl?: string | null;
  /** Detail body — shown when the card is expanded. */
  children?: ReactNode;
  /** Start expanded (used when there are no extras — footer only). */
  defaultExpanded?: boolean;
  /** Hide the chevron when the body is empty. */
  hideToggle?: boolean;
}

export function EpMobileCard({
  fullName,
  id,
  createdAt,
  headerRight,
  headerSub,
  footer,
  avatarUrl,
  children,
  defaultExpanded = false,
  hideToggle = false,
}: EpMobileCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasBody = !!children;

  return (
    <li className="rounded-xl border bg-card overflow-hidden">
      {/* Closed-state header — same layout on every page */}
      <div className="flex items-start gap-3 px-4 py-3">
        <UserAvatar fullName={fullName} avatarUrl={avatarUrl ?? null} className="h-10 w-10 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-aiesec-blue">
            {fullName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            <span className="tabular-nums">#{id}</span>
            {createdAt && (
              <>
                <span className="mx-1.5">·</span>
                <DateCell value={createdAt} />
              </>
            )}
          </p>
          {headerSub && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">{headerSub}</div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {headerRight}
          {hasBody && !hideToggle && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={expanded ? 'Hide details' : 'Show details'}
              aria-expanded={expanded}
            >
              <ChevronDown
                size={16}
                className={cn('transition-transform', expanded && 'rotate-180')}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expandable body */}
      {hasBody && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60 bg-muted/10 px-4 py-2">
              {children}
            </div>
          </div>
        </div>
      )}

      {/* Always-visible footer (transitions, view comments, etc.) */}
      {footer && (
        <div className="border-t border-border/60 px-4 py-2">
          {footer}
        </div>
      )}
    </li>
  );
}

// Section + InfoRow — the shared "labelled list" used inside every card body.

interface SectionProps {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
}

export function EpSection({ label, icon: Icon, children }: SectionProps) {
  return (
    <div className="py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-aiesec-blue/80 mb-1">
        {Icon && <Icon size={11} className="text-aiesec-blue/70" />}
        {label}
      </p>
      <div className="divide-y divide-border/40">{children}</div>
    </div>
  );
}

interface InfoRowProps {
  label: string;
  icon?: LucideIcon;
  value: ReactNode;
}

export function EpInfoRow({ label, icon: Icon, value }: InfoRowProps) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[12px]">
      <span className="text-muted-foreground shrink-0 flex items-center gap-1">
        {Icon && <Icon size={12} className="text-muted-foreground/70" />}
        {label}
      </span>
      <span className="text-foreground font-medium text-right break-words min-w-0">
        {isEmpty ? <span className="text-muted-foreground">—</span> : value}
      </span>
    </div>
  );
}

// Full-width row for content that shouldn't be crushed into a two-column layout
// (long notes, transition messages). Label sits above, value below.
export function EpBlockRow({
  label,
  icon: Icon,
  value,
}: {
  label: string;
  icon?: LucideIcon;
  value: ReactNode;
}) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className="py-2 text-[12px]">
      <p className="mb-1 flex items-center gap-1 text-muted-foreground">
        {Icon && <Icon size={12} className="text-muted-foreground/70" />}
        {label}
      </p>
      <p className="text-foreground whitespace-pre-wrap break-words">
        {isEmpty ? <span className="text-muted-foreground">—</span> : value}
      </p>
    </div>
  );
}

export function formatEnum(v: string | null | undefined) {
  return v
    ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
}
