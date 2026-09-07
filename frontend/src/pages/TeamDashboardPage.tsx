// TeamDashboardPage (Performance dashboard for TL/VP)
// - Shows the caller's own dashboard by default (reuses MyDashboardPage internals)
// - Member picker to switch to any department member's stats
// - "Viewing: [Name]" banner when a member is selected
// - "My Stats" button to reset back to self-view

import { useState } from 'react';
import { UserCircle2, X } from 'lucide-react';
import { useAuth }              from '@/hooks/useAuth';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useMyDashboard }       from '@/hooks/useMyDashboard';
import { MemberPicker }         from '@/components/team/MemberPicker';
import { SummaryCards }         from '@/components/dashboard/SummaryCards';
import { StatusFunnelChart }    from '@/components/dashboard/StatusFunnelChart';
import { PhaseBreakdownChart }  from '@/components/dashboard/PhaseBreakdownChart';
import { ConversionRates }      from '@/components/dashboard/ConversionRates';
import { Button }               from '@/components/ui/button';
import { AlertCircle }          from 'lucide-react';

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const departmentId = user?.departmentId ?? null;

  // null = viewing self, string = viewing a specific member
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: members = [], isLoading: membersLoading } = useDepartmentMembers(departmentId);
  const { data, isLoading, isError } = useMyDashboard({ memberId: selectedMemberId ?? undefined });

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  function handleSelectMember(id: string) {
    setSelectedMemberId(id === selectedMemberId ? null : id);
  }

  function handleResetToSelf() {
    setSelectedMemberId(null);
  }

  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="shrink-0 px-4 md:px-6 pt-5 pb-3 border-b bg-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Team Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Performance stats for your department
            </p>
          </div>
        </div>
      </div>

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
        {selectedMemberId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToSelf}
            className="flex items-center gap-1.5"
          >
            <X size={13} />
            Stats
          </Button>
        )}
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
          <StatusFunnelChart data={data?.statusFunnel} isLoading={isLoading} />
          <ConversionRates   rates={data?.conversionRates} isLoading={isLoading} />
        </div>

        {/* Phase breakdown */}
        <PhaseBreakdownChart data={data?.phaseBreakdown} isLoading={isLoading} />

      </div>
    </div>
  );
}
