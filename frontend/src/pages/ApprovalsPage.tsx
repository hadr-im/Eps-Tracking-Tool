// ApprovalsPage (VP only) — the signup approval queue.
//
// This is the only screen in the app that grants privileges. Each row shows
// what the applicant asked for; the VP can correct any of it before approving,
// because a self-selected role is a claim, not a fact.

import { useMemo, useState } from 'react';
import {
  Check,
  MoreHorizontal,
  Send,
  ShieldCheck,
  UserCog,
  X,
} from 'lucide-react';

import {
  usePendingAccounts,
  useApproveAccount,
  useRejectAccount,
} from '@/hooks/usePendingAccounts';
import { useMembers } from '@/hooks/useMembers';
import { PageHeader } from '@/components/layout/PageHeader';
import { UserAvatar } from '@/components/layout/UserAvatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SoftBadge } from '@/components/ui/soft-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';
import type { PendingAccount } from '@/types/signup';
import type { ManagedMember } from '@/types/members';

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'Vice President',
};

type Tab = 'PENDING' | 'REJECTED';

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const { data: requests = [], isLoading } = usePendingAccounts(tab);

  // Team leaders come from the member list so a VP can correct the applicant's
  // choice without leaving the page.
  const { data: members = [] } = useMembers();
  const teamLeaders = useMemo(
    () => members.filter((m) => m.role === 'TEAM_LEADER' && !m.isDisabled),
    [members],
  );
  const leaderNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.fullName])),
    [members],
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Signup Requests"
        subtitle="Review who is asking to join your department"
        actions={
          !isLoading &&
          requests.length > 0 && (
            <SoftBadge tone={tab === 'PENDING' ? 'amber' : 'neutral'} className="px-3 py-1 text-xs">
              {requests.length} {tab === 'PENDING' ? 'waiting' : 'declined'}
            </SoftBadge>
          )
        }
      />

      {/* Pending / Declined */}
      <div className="shrink-0 px-4 md:px-6 pt-4 flex items-center gap-1">
        {(['PENDING', 'REJECTED'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t
                ? 'bg-aiesec-blue text-white'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t === 'PENDING' ? 'Pending' : 'Declined'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 md:px-6 py-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <HeadCell>Applicant</HeadCell>
                    <HeadCell>Requested</HeadCell>
                    <HeadCell>Team Leader</HeadCell>
                    <HeadCell>Submitted</HeadCell>
                    <HeadCell className="text-right pr-4">Actions</HeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((account) => (
                    <RequestRow
                      key={account.id}
                      account={account}
                      tab={tab}
                      teamLeaders={teamLeaders}
                      leaderNameById={leaderNameById}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden space-y-3">
              {requests.map((account) => (
                <RequestCard
                  key={account.id}
                  account={account}
                  tab={tab}
                  teamLeaders={teamLeaders}
                  leaderNameById={leaderNameById}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function HeadCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead
      className={cn(
        'h-10 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShieldCheck size={22} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">
        {tab === 'PENDING' ? 'Nothing to review' : 'Nothing declined'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {tab === 'PENDING'
          ? 'New signup requests for your department will appear here.'
          : 'Requests you decline show up here, so you can undo a decision.'}
      </p>
    </div>
  );
}

/*
  One request.

  Approving with no overrides grants exactly what was asked for — the common
  case, and a single click. The menu carries the corrections for when the
  applicant picked wrong.
*/
function RequestCard({
  account,
  tab,
  teamLeaders,
  leaderNameById,
}: {
  account: PendingAccount;
  tab: Tab;
  teamLeaders: ManagedMember[];
  leaderNameById: Map<string, string>;
}) {
  const approve = useApproveAccount();
  const reject = useRejectAccount();
  const [open, setOpen] = useState(false);

  const requestedRole = account.requested?.role ?? 'MEMBER';
  const requestedLeaderId = account.requested?.teamLeaderId ?? null;
  const isBusy = approve.isPending || reject.isPending;

  const approveAs = (overrides: Parameters<typeof approve.mutate>[0]['overrides']) =>
    approve.mutate({ userId: account.id, overrides });

  const submitted = new Date(account.createdAt).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short',
  });

  return (
    <li className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        <UserAvatar fullName={account.fullName} email={account.email} avatarUrl={account.avatarUrl} className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-aiesec-blue truncate">{account.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
        </div>
      </div>

      {/* Info rows */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Requested</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="font-medium">{ROLE_LABELS[requestedRole]}</span>
            {account.requested?.isDispatcher && <SoftBadge tone="dispatcher">Dispatcher</SoftBadge>}
          </div>
        </div>
        {requestedRole === 'MEMBER' && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Team Leader</span>
            <span className="font-medium">
              {requestedLeaderId ? (leaderNameById.get(requestedLeaderId) ?? '—') : 'Not sure yet'}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Submitted</span>
          <span className="font-medium">{submitted}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t bg-muted/10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => approveAs({})}
          disabled={isBusy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-aiesec-blue px-3 py-2 text-xs font-semibold text-white hover:bg-aiesec-blue/90 transition-colors disabled:opacity-50"
        >
          <Check size={13} />
          {tab === 'PENDING' ? 'Approve' : 'Approve anyway'}
        </button>

        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            aria-label={`More actions for ${account.fullName}`}
            disabled={isBusy}
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <MoreHorizontal size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Approve as</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => approveAs({ role: 'MEMBER', isDispatcher: false })}>
              <UserCog /> Member
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => approveAs({ role: 'TEAM_LEADER' })}>
              <UserCog /> Team Leader
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => approveAs({ role: 'TEAM_LEADER', isDispatcher: true })}>
              <Send /> Team Leader + dispatcher
            </DropdownMenuItem>
            {teamLeaders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>As a member under</DropdownMenuLabel>
                {teamLeaders.map((tl) => (
                  <DropdownMenuItem key={tl.id} onClick={() => approveAs({ role: 'MEMBER', teamLeaderId: tl.id })}>
                    <UserCog /> {tl.fullName}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {tab === 'PENDING' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => reject.mutate({ userId: account.id, reason: null })}>
                  <X /> Decline request
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function RequestRow({
  account,
  tab,
  teamLeaders,
  leaderNameById,
}: {
  account: PendingAccount;
  tab: Tab;
  teamLeaders: ManagedMember[];
  leaderNameById: Map<string, string>;
}) {
  const approve = useApproveAccount();
  const reject = useRejectAccount();
  const [open, setOpen] = useState(false);

  const requestedRole = account.requested?.role ?? 'MEMBER';
  const requestedLeaderId = account.requested?.teamLeaderId ?? null;
  const isBusy = approve.isPending || reject.isPending;

  const approveAs = (overrides: Parameters<typeof approve.mutate>[0]['overrides']) =>
    approve.mutate({ userId: account.id, overrides });

  const submitted = new Date(account.createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });

  return (
    <TableRow>
      {/* Applicant */}
      <TableCell className="py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            fullName={account.fullName}
            email={account.email}
            avatarUrl={account.avatarUrl}
            className="h-9 w-9"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{account.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">{account.email}</p>
          </div>
        </div>
      </TableCell>

      {/* Requested */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">{ROLE_LABELS[requestedRole]}</span>
          {account.requested?.isDispatcher && (
            <SoftBadge tone="dispatcher">Dispatcher</SoftBadge>
          )}
        </div>
      </TableCell>

      {/* Team Leader they picked */}
      <TableCell className="text-sm text-muted-foreground">
        {requestedRole === 'MEMBER'
          ? (requestedLeaderId ? (leaderNameById.get(requestedLeaderId) ?? '—') : 'Not sure yet')
          : '—'}
      </TableCell>

      {/* Submitted */}
      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
        {submitted}
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-4">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => approveAs({})}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-aiesec-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-aiesec-blue/90 transition-colors disabled:opacity-50"
          >
            <Check size={13} />
            {tab === 'PENDING' ? 'Approve' : 'Approve anyway'}
          </button>

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
              aria-label={`More actions for ${account.fullName}`}
              disabled={isBusy}
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuLabel>Approve as</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => approveAs({ role: 'MEMBER', isDispatcher: false })}
              >
                <UserCog />
                Member
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => approveAs({ role: 'TEAM_LEADER' })}>
                <UserCog />
                Team Leader
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => approveAs({ role: 'TEAM_LEADER', isDispatcher: true })}
              >
                <Send />
                Team Leader + dispatcher
              </DropdownMenuItem>

              {teamLeaders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>As a member under</DropdownMenuLabel>
                  {teamLeaders.map((tl) => (
                    <DropdownMenuItem
                      key={tl.id}
                      onClick={() => approveAs({ role: 'MEMBER', teamLeaderId: tl.id })}
                    >
                      <UserCog />
                      {tl.fullName}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {tab === 'PENDING' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => reject.mutate({ userId: account.id, reason: null })}
                  >
                    <X />
                    Decline request
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
