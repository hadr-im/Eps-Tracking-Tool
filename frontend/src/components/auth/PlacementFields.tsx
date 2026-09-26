// PlacementFields — step 2 of signup, shared by the email and Google flows.
//
// Collects where the applicant says they belong: department, position, and
// then either their Team Leader (members) or the dispatcher flag (TLs).
// Nothing selected here is granted; a VP confirms it before it takes effect.

import { Loader2 } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Field, PasswordInput } from '@/components/auth/AuthFormFields';
import { useDepartments, useTeamLeaders } from '@/hooks/useSignupOptions';
import { cn } from '@/lib/utils';
import { productBrand } from '@/lib/productBrand';
import type { UserRole } from '@/types/auth';
import type { PlacementValue } from '@/types/signup';

// Department label: product logo on the left, name in the product's colour.
function DepartmentOption({ name, product }: { name: string; product: string }) {
  const brand = productBrand(product);
  return (
    <span className="flex items-center gap-2.5">
      {brand && <img src={brand.logo} alt="" className="h-5 w-5 shrink-0 object-contain" />}
      <span className="text-[15px] font-semibold" style={brand ? { color: brand.color } : undefined}>
        {name}
      </span>
    </span>
  );
}

const ROLE_LABELS: Record<UserRole, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'Vice President',
};

const ROLE_ORDER: UserRole[] = ['MEMBER', 'TEAM_LEADER', 'VP'];

// Sentinel for "I don't know yet" — Select cannot hold a null value.
const NO_TEAM_LEADER = '__none__';

interface PlacementFieldsProps {
  value: PlacementValue;
  onChange: (next: PlacementValue) => void;
  // Field-level messages, keyed by the PlacementValue field they belong to
  errors?: Partial<Record<keyof PlacementValue, string>>;
}

export function PlacementFields({ value, onChange, errors = {} }: PlacementFieldsProps) {
  const {
    data: departments = [],
    isLoading: loadingDepartments,
    isError: departmentsFailed,
    refetch: refetchDepartments,
  } = useDepartments();
  const { data: teamLeaders = [], isLoading: loadingTeamLeaders } = useTeamLeaders(
    value.requestedDepartmentId || null,
  );

  const selectedDepartment = departments.find((d) => d.id === value.requestedDepartmentId);

  // A department can only have one VP, so once it has one there is nothing to
  // apply for — drop the option rather than let someone pick a dead end.
  const availableRoles = ROLE_ORDER.filter(
    (role) => role !== 'VP' || !selectedDepartment?.hasVp,
  );
  const dispatcherTaken = selectedDepartment?.hasDispatcher ?? false;

  // Changing department invalidates the Team Leader picked under the old one,
  // and may invalidate the position itself if the new one already has a VP.
  function handleDepartmentChange(departmentId: string): void {
    const department = departments.find((d) => d.id === departmentId);
    const roleStillValid = !(value.requestedRole === 'VP' && department?.hasVp);

    onChange({
      ...value,
      requestedDepartmentId: departmentId,
      requestedTeamLeaderId: null,
      requestedRole: roleStillValid ? value.requestedRole : '',
      vpSetupCode: roleStillValid ? value.vpSetupCode : '',
      // The slot is gone, so never carry a dispatcher request into it.
      requestedIsDispatcher: department?.hasDispatcher ? false : value.requestedIsDispatcher,
    });
  }

  // Switching position clears the fields that only apply to the other one.
  function handleRoleChange(role: UserRole): void {
    onChange({
      ...value,
      requestedRole: role,
      requestedTeamLeaderId: role === 'MEMBER' ? value.requestedTeamLeaderId : null,
      requestedIsDispatcher: role === 'TEAM_LEADER' ? value.requestedIsDispatcher : false,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Department */}
      <Field id="department" label="Department" error={errors.requestedDepartmentId}>
        {loadingDepartments ? (
          <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            Loading departments…
          </div>
        ) : departmentsFailed ? (
          // Never strand the form on a dead lookup — the whole signup depends
          // on this list, so offer a way out.
          <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 px-3 py-2">
            <p className="text-xs text-destructive">Couldn't load departments.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetchDepartments()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Select
            value={value.requestedDepartmentId}
            onValueChange={(val) => val && handleDepartmentChange(val)}
          >
            <SelectTrigger id="department" className="w-full">
              <SelectValue placeholder="Select your department">
                {(val) => {
                  const d = departments.find((dep) => dep.id === val);
                  return d ? <DepartmentOption name={d.name} product={d.product} /> : 'Select your department';
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {departments.map((d, i) => (
                <SelectItem
                  key={d.id}
                  value={d.id}
                  label={d.name}
                  // Faint hairline between options (not above the first one)
                  className={cn('py-2.5', i > 0 && 'border-t border-border/50')}
                >
                  <DepartmentOption name={d.name} product={d.product} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      {/* Position — only once a department is chosen, since the rules below depend on it */}
      {value.requestedDepartmentId && (
        <Field id="role" label="Your position" error={errors.requestedRole}>
          <Select
            value={value.requestedRole}
            onValueChange={(val) => val && handleRoleChange(val as UserRole)}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select your position">
                {(val) => (val ? ROLE_LABELS[val as UserRole] : 'Select your position')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role} label={ROLE_LABELS[role]}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDepartment?.hasVp && (
            <p className="text-xs text-muted-foreground">
              {selectedDepartment.name} already has a VP, so that position is
              not available.
            </p>
          )}
        </Field>
      )}

      {/* Member: which Team Leader they report to */}
      {value.requestedRole === 'MEMBER' && (
        <Field id="teamLeader" label="Your Team Leader" error={errors.requestedTeamLeaderId}>
          {loadingTeamLeaders ? (
            <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              Loading team leaders…
            </div>
          ) : (
            <>
              <Select
                value={value.requestedTeamLeaderId ?? NO_TEAM_LEADER}
                onValueChange={(val) =>
                  onChange({
                    ...value,
                    requestedTeamLeaderId: val === NO_TEAM_LEADER ? null : (val as string),
                  })
                }
              >
                <SelectTrigger id="teamLeader" className="w-full">
                  <SelectValue>
                    {(val) =>
                      !val || val === NO_TEAM_LEADER
                        ? "I don't know yet"
                        : (teamLeaders.find((tl) => tl.id === val)?.fullName ?? String(val))
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamLeaders.map((tl) => (
                    <SelectItem key={tl.id} value={tl.id} label={tl.fullName}>
                      {tl.fullName}
                    </SelectItem>
                  ))}
                  <SelectItem value={NO_TEAM_LEADER} label="I don't know yet">
                    I don't know yet
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {teamLeaders.length === 0
                  ? "No team leaders in this department yet — your VP will assign you to one."
                  : "Not sure? Leave it and your VP will assign you."}
              </p>
            </>
          )}
        </Field>
      )}

      {/* Team Leader: the one dispatcher per department */}
      {value.requestedRole === 'TEAM_LEADER' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5 rounded-lg border p-3">
            <Checkbox
              id="isDispatcher"
              checked={value.requestedIsDispatcher}
              onCheckedChange={(checked) =>
                onChange({ ...value, requestedIsDispatcher: checked === true })
              }
              disabled={dispatcherTaken}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="isDispatcher"
                className={cn(
                  'text-sm font-medium',
                  dispatcherTaken ? 'text-muted-foreground' : 'cursor-pointer',
                )}
              >
                I am the dispatcher
              </Label>
              <p className="text-xs text-muted-foreground">
                {dispatcherTaken
                  ? `${selectedDepartment?.name ?? 'This department'} already has a dispatcher, so this cannot be requested.`
                  : 'The dispatcher assigns incoming EPs to members. Only one Team Leader per department can hold this.'}
              </p>
            </div>
          </div>
          {errors.requestedIsDispatcher && (
            <p className="text-xs text-destructive">{errors.requestedIsDispatcher}</p>
          )}
        </div>
      )}

      {/* VP: the setup code stands in for the approval a VP cannot give themselves */}
      {value.requestedRole === 'VP' && (
        <>
          <Field id="vpSetupCode" label="VP setup code" error={errors.vpSetupCode}>
            <PasswordInput
              id="vpSetupCode"
              placeholder="Enter your VP setup code"
              autoComplete="off"
              aria-invalid={!!errors.vpSetupCode}
              value={value.vpSetupCode}
              onChange={(e) => onChange({ ...value, vpSetupCode: e.target.value })}
            />
          </Field>
          <p className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            {selectedDepartment
              ? `You are signing up as the VP of ${selectedDepartment.name}. A department can only have one VP.`
              : 'A department can only have one VP.'}{' '}
            With the correct code your account is active straight away — no
            approval needed.
          </p>
        </>
      )}
    </div>
  );
}
