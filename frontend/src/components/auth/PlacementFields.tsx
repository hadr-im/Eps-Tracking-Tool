// PlacementFields — step 2 of signup, shared by the email and Google flows.
//
// Collects where the applicant says they belong: department, position, and
// then their Team Leader (members only).
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
import { Field, PasswordInput } from '@/components/auth/AuthFormFields';
import {
  useDepartments,
  useTeamLeaders,
  usePositionAvailability,
} from '@/hooks/useSignupOptions';
import { cn } from '@/lib/utils';
import { productBrand } from '@/lib/productBrand';
import type { UserRole } from '@/types/auth';
import type { PlacementValue } from '@/types/signup';
import { isVpLevel, canSwitchDepartment } from '@/types/auth';

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
  LCP: 'LC President',
  ADMIN: 'Admin',
};

// Which secret each privileged role is gated behind.
const SETUP_CODE_LABEL: Partial<Record<UserRole, string>> = {
  VP: 'VP',
  LCP: 'LCP',
  ADMIN: 'Admin',
};

const ROLE_ORDER: UserRole[] = ['MEMBER', 'TEAM_LEADER', 'VP', 'LCP', 'ADMIN'];

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
  const { data: positions } = usePositionAvailability();
  const { data: teamLeaders = [], isLoading: loadingTeamLeaders } = useTeamLeaders(
    value.requestedDepartmentId || null,
  );


  /*
    A position that cannot be granted is dropped rather than offered and then
    refused on submit.

    LCP and admin are one per installation. VP is one per department, so it
    survives as long as a single department is still without one — which
    department that is gets handled below, where taken ones are disabled.

    While the lookup is in flight nothing is hidden: briefly showing an option
    that turns out to be taken is better than briefly hiding one that is free,
    since the first is corrected by the server and the second looks like the
    position does not exist.
  */
  const someDepartmentNeedsAVp = departments.length === 0 || departments.some((d) => !d.hasVp);

  const availableRoles = ROLE_ORDER.filter((role) => {
    if (role === 'LCP') return !positions?.lcpTaken;
    if (role === 'ADMIN') return !positions?.adminTaken;
    if (role === 'VP') return someDepartmentNeedsAVp;
    return true;
  });

  // A department that already has a VP is a dead end for someone applying as
  // one, so it is shown as unavailable rather than silently failing on submit.
  const departmentTaken = (d: { hasVp?: boolean }) =>
    value.requestedRole === 'VP' && !!d.hasVp;

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
    });
  }

  /*
    Switching position clears the fields that only apply to the other one.

    An LCP belongs to no department — they oversee all of them and pick which
    to supervise after signing in — so choosing it drops any department already
    selected rather than leaving a value the server would reject.
  */
  function handleRoleChange(role: UserRole): void {
    onChange({
      ...value,
      requestedRole: role,
      requestedDepartmentId: canSwitchDepartment(role) ? '' : value.requestedDepartmentId,
      requestedTeamLeaderId: role === 'MEMBER' ? value.requestedTeamLeaderId : null,
      vpSetupCode: isVpLevel(role) ? value.vpSetupCode : '',
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        Position comes first. The department field below depends on it: an LCP
        is asked for no department at all, so the role has to be known before
        it can be drawn.
      */}
      {(
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

        </Field>
      )}

      {/* Department — an LCP has none, so the field is not shown at all */}
      {!canSwitchDepartment(value.requestedRole as UserRole) && (
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
                  disabled={departmentTaken(d)}
                  // Faint hairline between options (not above the first one)
                  className={cn('py-2.5', i > 0 && 'border-t border-border/50')}
                >
                  <DepartmentOption name={d.name} product={d.product} />
                  {departmentTaken(d) && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      has a VP
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/*
        The setup code stands in for an approval these two roles cannot be
        given: a department's first VP has nobody above them to approve it,
        and an LCP has nobody above them at all. The codes are separate
        secrets — see assertValidSetupCode on the server.
      */}
      {isVpLevel(value.requestedRole as UserRole) && (
        <>
          <Field
            id="vpSetupCode"
            label={`${SETUP_CODE_LABEL[value.requestedRole as UserRole] ?? 'VP'} setup code`}
            error={errors.vpSetupCode}
          >
            <PasswordInput
              id="vpSetupCode"
              placeholder={`Enter your ${SETUP_CODE_LABEL[value.requestedRole as UserRole] ?? 'VP'} setup code`}
              autoComplete="off"
              aria-invalid={!!errors.vpSetupCode}
              value={value.vpSetupCode}
              onChange={(e) => onChange({ ...value, vpSetupCode: e.target.value })}
            />
          </Field>
        </>
      )}
    </div>
  );
}
