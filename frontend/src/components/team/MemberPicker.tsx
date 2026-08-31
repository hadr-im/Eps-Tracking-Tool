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
import type { DepartmentMember } from '@/services/departmentService';

interface MemberPickerProps {
  members: DepartmentMember[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (memberId: string) => void;
  placeholder?: string;
}

export function MemberPicker({
  members,
  isLoading,
  selectedId,
  onSelect,
  placeholder = 'Select a member…',
}: MemberPickerProps) {
  if (isLoading) {
    return <Skeleton className="h-9 w-52" />;
  }

  return (
    <Select value={selectedId ?? ''} onValueChange={onSelect}>
      <SelectTrigger id="member-picker" className="w-52">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
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
