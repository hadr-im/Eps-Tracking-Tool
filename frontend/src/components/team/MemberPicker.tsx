// MemberPicker 
// Used in both TeamCrmPage and TeamDashboardPage

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DepartmentMember } from '@/services/departmentService';

interface MemberPickerProps {
  members: DepartmentMember[];
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (memberId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MemberPicker({
  members,
  isLoading = false,
  selectedId,
  onSelect,
  placeholder = 'Select a member…',
  disabled = false,
}: MemberPickerProps) {
  if (isLoading) {
    return <Skeleton className="h-9 w-52" />;
  }

  return (
    <Select value={selectedId ?? ''} onValueChange={(val) => val && onSelect(val)} disabled={disabled}>
      <SelectTrigger 
        id="member-picker" 
        className={cn(
          "w-52 transition-all duration-300 ease-in-out",
          selectedId && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0"
        )}
      >
        <SelectValue placeholder={placeholder}>
          {(val) => (val ? members.find((m) => m.id === val)?.fullName ?? val : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id} label={m.fullName}>
            {m.fullName}
          </SelectItem>
        ))}
        {members.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            No members found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
