// MembersPage (VP only) — managing people after they have joined.
//
// Signup and approval only cover day one. Roles move every term: members
// become Team Leaders, the dispatcher hands over, people switch teams and
// leave. This is where all of that happens.

import { useMemo, useState } from 'react';
import {
  MoreHorizontal,
  Send,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users2,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useMembers, useUpdateMemberAccess } from '@/hooks/useMembers';
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
import type { ManagedMember } from '@/types/members';

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'Vice President',
};

export default function MembersPage() {
  const { user } = useAuth();
  const { data: members = [], isLoading } = useMembers();

  const teamLeaders = useMemo(
    () => members.filter((m) => m.role === 'TEAM_LEADER' && !m.isDisabled),
    [members],
  );
  const byId = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const activeCount = members.filter((m) => !m.isDisabled).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Manage Your Department"
        subtitle="Change roles, move people between teams, hand over the dispatcher"
        actions={
          !isLoading && (
            <SoftBadge tone="green" className="px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {activeCount} active
            </SoftBadge>
          )
        }
      />

      <div className="flex-1 overflow-auto px-4 md:px-6 py-5">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHeadCell>Member</TableHeadCell>
                    <TableHeadCell>Position</TableHeadCell>
                    <TableHeadCell>Team Leader</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell className="text-right pr-4">Actions</TableHeadCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      teamLeaders={teamLeaders}
                      leaderName={
                        member.teamLeaderId
                          ? (byId.get(member.teamLeaderId)?.fullName ?? '—')
                          : null
                      }
                      isSelf={member.id === user?.id}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="md:hidden space-y-3">
              {members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  teamLeaders={teamLeaders}
                  leaderName={
                    member.teamLeaderId
                      ? (byId.get(member.teamLeaderId)?.fullName ?? '—')
                      : null
                  }
                  isSelf={member.id === user?.id}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function TableHeadCell({
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users2 size={22} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">No members yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Approved accounts will appear here.
      </p>
    </div>
  );
}

function MemberCard({
  member,
  teamLeaders,
  leaderName,
  isSelf,
}: {
  member: ManagedMember;
  teamLeaders: ManagedMember[];
  leaderName: string | null;
  isSelf: boolean;
}) {
  const update = useUpdateMemberAccess();
  const [open, setOpen] = useState(false);

  const locked = isSelf || member.role === 'VP';
  const apply = (changes: Parameters<typeof update.mutate>[0]['changes']) =>
    update.mutate({ userId: member.id, changes });
  const assignableLeaders = teamLeaders.filter((tl) => tl.id !== member.id);

  const dropdownContent = (
    <DropdownMenuContent>
      <DropdownMenuLabel>Position</DropdownMenuLabel>
      {member.role === 'MEMBER' ? (
        <DropdownMenuItem onClick={() => apply({ role: 'TEAM_LEADER' })}>
          <UserPlus /> Promote to Team Leader
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => apply({ role: 'MEMBER' })}>
          <UserMinus /> Make a Member
        </DropdownMenuItem>
      )}
      {member.role === 'TEAM_LEADER' && (
        <DropdownMenuItem onClick={() => apply({ isDispatcher: !member.isDispatcher })}>
          <Send /> {member.isDispatcher ? 'Remove as dispatcher' : 'Make dispatcher'}
        </DropdownMenuItem>
      )}
      {member.role === 'MEMBER' && assignableLeaders.length > 0 && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Team Leader</DropdownMenuLabel>
          {assignableLeaders.map((tl) => (
            <DropdownMenuItem key={tl.id} onClick={() => apply({ teamLeaderId: tl.id })} disabled={tl.id === member.teamLeaderId}>
              <UserCog /> {tl.fullName}
            </DropdownMenuItem>
          ))}
          {member.teamLeaderId && (
            <DropdownMenuItem onClick={() => apply({ teamLeaderId: null })}>
              <UserMinus /> Unassign
            </DropdownMenuItem>
          )}
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant={member.isDisabled ? 'default' : 'destructive'}
        onClick={() => apply({ isDisabled: !member.isDisabled })}
      >
        <UserMinus /> {member.isDisabled ? 'Re-enable account' : 'Disable account'}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  return (
    <li className={cn('rounded-xl border bg-card overflow-hidden', member.isDisabled && 'opacity-60')}>
      {/* Header — avatar + name/email + action menu */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/20">
        <UserAvatar fullName={member.fullName} email={member.email} avatarUrl={member.avatarUrl} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-aiesec-blue truncate">{member.fullName}</span>
            {isSelf && <SoftBadge tone="blue">You</SoftBadge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
        </div>
        {locked ? (
          <span className="shrink-0 text-muted-foreground" title={isSelf ? 'Your account' : 'Locked'}>
            <ShieldCheck size={15} />
          </span>
        ) : (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
              aria-label={`Actions for ${member.fullName}`}
              disabled={update.isPending}
              className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>
            {dropdownContent}
          </DropdownMenu>
        )}
      </div>

      {/* Info rows */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Position</span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className="font-medium">{ROLE_LABELS[member.role]}</span>
            {member.isDispatcher && <SoftBadge tone="dispatcher">Dispatcher</SoftBadge>}
          </div>
        </div>
        {member.role === 'MEMBER' && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Team Leader</span>
            <span className="font-medium">{leaderName ?? 'Unassigned'}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Status</span>
          {member.isDisabled ? (
            <SoftBadge tone="neutral">Disabled</SoftBadge>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/*
  One row. Every change is applied immediately from the actions menu rather
  than staged behind a Save button — each action is a single, reversible step,
  so a confirm step would only add friction.
*/
function MemberRow({
  member,
  teamLeaders,
  leaderName,
  isSelf,
}: {
  member: ManagedMember;
  teamLeaders: ManagedMember[];
  leaderName: string | null;
  isSelf: boolean;
}) {
  const update = useUpdateMemberAccess();
  const [open, setOpen] = useState(false);

  // A VP manages everyone except themselves — demoting or disabling your own
  // account would leave the department with no VP and no way to appoint one.
  const locked = isSelf || member.role === 'VP';

  const apply = (changes: Parameters<typeof update.mutate>[0]['changes']) =>
    update.mutate({ userId: member.id, changes });

  const assignableLeaders = teamLeaders.filter((tl) => tl.id !== member.id);

  return (
    <TableRow className={cn(member.isDisabled && 'opacity-55')}>
      {/* Member */}
      <TableCell className="py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            fullName={member.fullName}
            email={member.email}
            avatarUrl={member.avatarUrl}
            className="h-9 w-9"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold truncate">{member.fullName}</span>
              {isSelf && (
                <SoftBadge tone="blue">You</SoftBadge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>
      </TableCell>

      {/* Position */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">{ROLE_LABELS[member.role]}</span>
          {member.isDispatcher && (
            <SoftBadge tone="dispatcher">Dispatcher</SoftBadge>
          )}
        </div>
      </TableCell>

      {/* Team Leader */}
      <TableCell className="text-sm text-muted-foreground">
        {member.role === 'MEMBER' ? (leaderName ?? 'Unassigned') : '—'}
      </TableCell>

      {/* Status */}
      <TableCell>
        {member.isDisabled ? (
          <SoftBadge tone="neutral">Disabled</SoftBadge>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right pr-4">
        {locked ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            title={
              isSelf
                ? 'You cannot change your own access'
                : 'A VP account cannot be changed here'
            }
          >
            <ShieldCheck size={13} />
            Locked
          </span>
        ) : (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger
              aria-label={`Actions for ${member.fullName}`}
              disabled={update.isPending}
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              <MoreHorizontal size={16} />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuLabel>Position</DropdownMenuLabel>
              {member.role === 'MEMBER' ? (
                <DropdownMenuItem onClick={() => apply({ role: 'TEAM_LEADER' })}>
                  <UserPlus />
                  Promote to Team Leader
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => apply({ role: 'MEMBER' })}>
                  <UserMinus />
                  Make a Member
                </DropdownMenuItem>
              )}

              {member.role === 'TEAM_LEADER' && (
                <DropdownMenuItem
                  onClick={() => apply({ isDispatcher: !member.isDispatcher })}
                >
                  <Send />
                  {member.isDispatcher ? 'Remove as dispatcher' : 'Make dispatcher'}
                </DropdownMenuItem>
              )}

              {member.role === 'MEMBER' && assignableLeaders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Team Leader</DropdownMenuLabel>
                  {assignableLeaders.map((tl) => (
                    <DropdownMenuItem
                      key={tl.id}
                      onClick={() => apply({ teamLeaderId: tl.id })}
                      disabled={tl.id === member.teamLeaderId}
                    >
                      <UserCog />
                      {tl.fullName}
                    </DropdownMenuItem>
                  ))}
                  {member.teamLeaderId && (
                    <DropdownMenuItem onClick={() => apply({ teamLeaderId: null })}>
                      <UserMinus />
                      Unassign
                    </DropdownMenuItem>
                  )}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={member.isDisabled ? 'default' : 'destructive'}
                onClick={() => apply({ isDisabled: !member.isDisabled })}
              >
                <UserMinus />
                {member.isDisabled ? 'Re-enable account' : 'Disable account'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
