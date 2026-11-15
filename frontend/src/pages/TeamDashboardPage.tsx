import { DateRangePresetFilter, windowForPreset } from '@/components/dashboard/DateRangePresetFilter';
import type { DatePreset } from '@/components/dashboard/DateRangePresetFilter';
// TeamDashboardPage (Performance dashboard for TL/VP)
// - Shows the caller's own dashboard by default (reuses MyDashboardPage internals)
// - Member picker to switch to any department member's stats
// - "Viewing: [Name]" banner when a member is selected
// - "My Stats" button to reset back to self-view

import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useAuth }              from '@/hooks/useAuth';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useMyDashboard }       from '@/hooks/useMyDashboard';
import { MemberPicker }         from '@/components/team/MemberPicker';
import { SummaryCards }         from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }    from '@/components/dashboard/StatusFunnelChart';
import { DimensionBreakdownChart } from '@/components/dashboard/DimensionBreakdownChart';
import { GraduationCap, BookOpen } from 'lucide-react';
import { PhaseBreakdownChart }  from '@/components/dashboard/PhaseBreakdownChart';
import { ConversionRates }      from '@/components/dashboard/ConversionRates';
import { cn }                    from '@/lib/utils';
import { Button }               from '@/components/ui/button';
import { AlertCircle }          from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { isVpLevel } from '@/types/auth';

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;

  // null = viewing self, string = viewing a specific member
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: allMembers = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);

  // Only show MEMBER-role users — exclude the TL themselves and any VP accounts
  /*
    Team Leaders carry their own EPs, so a VP overseeing the department needs
    to see their pipeline too — leaving them out meant part of the department's
    work was invisible from here. A Team Leader still sees only members, since
    their peers are not theirs to oversee.
  */
  const members = allMembers.filter(
    (m) => m.role === 'MEMBER' || (isVpLevel(user?.role) && m.role === 'TEAM_LEADER'),
  );
  /*
    The period every figure on this page covers. 'all' sends no dates, so the
    default behaviour is unchanged from before the filter existed.
  */
  const [period, setPeriod] = useState<DatePreset>('all');
  const dateWindow = useMemo(() => windowForPreset(period), [period]);
  /*
    With a period chosen the figures count what happened in it, not
    where everyone stands, and the charts word themselves accordingly.
  */
  const isPeriod = period !== 'all';

  const { data, isLoading, isFetching, isError } = useMyDashboard({ memberId: selectedMemberId ?? undefined, window: dateWindow });

  function handleSelectMember(id: string) {
    setSelectedMemberId(id === selectedMemberId ? null : id);
  }

  function handleResetToSelf() {
    setSelectedMemberId(null);
  }

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title="Team Dashboard"
        subtitle="Performance stats for your department"
        actions={
          <DateRangePresetFilter
            value={period}
            onChange={setPeriod}
            isRefreshing={isFetching && !isLoading}
            className="h-9 w-44 rounded-lg border border-border bg-card text-xs font-medium"
          />
        }
      />


      {/* Member picker bar */}
      <div className="shrink-0 px-4 md:px-6 py-3 border-b bg-background flex items-center gap-3 flex-wrap">
          <label htmlFor="member-picker" className="text-sm font-medium shrink-0">
          View stats for:
        </label>
        <MemberPicker
          members={members}
          isLoading={membersLoading}
          selectedId={selectedMemberId}
          onSelect={handleSelectMember}
          placeholder="Select a member…"
        />

        {/* "My Stats" reset button (only shown when a member is selected) */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden flex items-center",
            selectedMemberId ? "w-8 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleResetToSelf}
            aria-label="Clear selection"
            title="Clear selection"
            tabIndex={selectedMemberId ? 0 : -1}
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-6 space-y-6">

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>Failed to load dashboard data. Please refresh the page.</span>
          </div>
        )}

        {/* Summary KPI cards */}
        <SummaryCards summary={data?.summary} isLoading={isLoading} />

        {/* Funnel + Conversion rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatusFunnelChart data={data?.statusFunnel} isLoading={isLoading} isPeriod={isPeriod} />
          <ConversionRates   rates={data?.conversionRates} isLoading={isLoading} isPeriod={isPeriod} />
        </div>

        {/* Phase breakdown */}
        <PhaseBreakdownChart data={data?.phaseBreakdown} isLoading={isLoading} />

        {/*
          Where the leads come from. Side by side: they answer the same kind of
          question and are read together when deciding which campuses to target
          next. The legend drops to one column when the card is narrow, which
          is what made these full-width before.
        */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DimensionBreakdownChart
            title="Universities"
            icon={GraduationCap}
            data={data?.universityBreakdown}
            isLoading={isLoading}
            emptyMessage="No universities recorded yet."
          />
          <DimensionBreakdownChart
            title="Fields of Study"
            icon={BookOpen}
            data={data?.fieldOfStudyBreakdown}
            isLoading={isLoading}
            emptyMessage="No fields of study recorded yet."
          />
        </div>


      </div>
    </div>
  );
}
