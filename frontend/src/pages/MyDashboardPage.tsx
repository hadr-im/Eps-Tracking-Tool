import { DateRangePresetFilter, windowForPreset } from '@/components/dashboard/DateRangePresetFilter';
import type { DatePreset } from '@/components/dashboard/DateRangePresetFilter';
import { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth }              from '@/hooks/useAuth';
import { useMyDashboard }       from '@/hooks/useMyDashboard';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { MemberPicker }         from '@/components/team/MemberPicker';
import { SummaryCards }         from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }    from '@/components/dashboard/StatusFunnelChart';
import { DimensionBreakdownChart } from '@/components/dashboard/DimensionBreakdownChart';
import { GraduationCap, BookOpen } from 'lucide-react';
import { PhaseBreakdownChart }  from '@/components/dashboard/PhaseBreakdownChart';
import { ConversionRates }      from '@/components/dashboard/ConversionRates';
import { PageHeader }           from '@/components/layout/PageHeader';

interface MyDashboardPageProps {
  // If provided, shows a specific member's stats (TL/VP use-case)
  userId?: string;
}

export default function MyDashboardPage({ userId }: MyDashboardPageProps = {}) {
  const { user } = useAuth();

  /*
    Anyone in the department can look at anyone else's dashboard.

    These are aggregate counts — leads contacted, EPs approved — which the
    department already talks about openly, and being able to see them is what
    makes the leaderboard mean anything. CRM access is deliberately NOT part
    of this: the EP endpoints keep their stricter rule, so a member still
    cannot read another member's notes or contact details.

    Suppressed when `userId` is passed, because the page is then already
    embedded inside a view that has its own picker.
  */
  const canBrowseMembers = !userId;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(
    canBrowseMembers ? user?.departmentId ?? null : null,
  );

  // Looking at yourself is the personal dashboard, so the picker falls back to
  // the plain /dashboard/me call rather than asking for your own id.
  const viewingId = userId ?? (selectedMemberId === user?.id ? undefined : selectedMemberId ?? undefined);
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

  const { data, isLoading, isFetching, isError } = useMyDashboard({ memberId: viewingId, window: dateWindow });

  const viewingSelf = !viewingId;
  const viewingName = members.find((m) => m.id === viewingId)?.fullName;

  return (
    <div className="flex flex-col h-full">

      <PageHeader
        title={viewingSelf ? 'My Personal Dashboard' : `${viewingName ?? 'Member'}'s Dashboard`}
        subtitle={
          viewingSelf
            ? 'Your personal EP pipeline performance'
            : "Viewing this member's EP performance stats"
        }
        actions={
          <DateRangePresetFilter
            value={period}
            onChange={setPeriod}
            isRefreshing={isFetching && !isLoading}
            className="h-9 w-44 rounded-lg border border-border bg-card text-xs font-medium"
          />
        }
      />


      {canBrowseMembers && (
        <div className="shrink-0 flex flex-wrap items-center gap-3 border-b bg-background px-4 md:px-6 py-3">
          <label htmlFor="member-picker" className="shrink-0 text-sm font-medium">
            Viewing:
          </label>
          <MemberPicker
            members={members}
            isLoading={membersLoading}
            selectedId={selectedMemberId ?? user?.id ?? null}
            onSelect={(id) => setSelectedMemberId(id)}
            placeholder="Your dashboard"
          />
          <span className="text-xs text-muted-foreground">
            Everyone in your department
          </span>
        </div>
      )}

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
          Where the leads come from. Side by side because they answer the same
          kind of question and are read together when deciding which campuses
          to target next.
        */}
        {/*
          One per row, not side by side. Half a row left the legend a column
          barely wide enough for a single character — "FLSH: Faculte des
          Lettres..." rendered as "F", which identifies nothing.
        */}
        <div className="grid grid-cols-1 gap-6">
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
