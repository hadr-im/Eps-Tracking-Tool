/*
  A department's name in its own colour.

  Identity, not rank: GV is the same red whether it is first or last, and
  whether it sits beside the other two or alone. The fill is a mix of the
  same token rather than a second hand-picked colour, so a department can
  never end up with a pill and a bar that disagree.

  The name is always printed. Several of these hues sit under 3:1 against
  the card, and a colour nobody can name is not an identifier.
*/

import { departmentColor, departmentTint } from '@/lib/departmentColor';
import { cn } from '@/lib/utils';

interface DepartmentBadgeProps {
  department: string | null | undefined;
  className?: string;
}

export function DepartmentBadge({ department, className }: DepartmentBadgeProps) {
  if (!department) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
        className,
      )}
      style={{
        color: departmentColor(department),
        backgroundColor: departmentTint(department, 12),
      }}
    >
      {department}
    </span>
  );
}
