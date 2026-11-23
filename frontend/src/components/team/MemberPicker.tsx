// MemberPicker 
// Used in both TeamCrmPage and TeamDashboardPage

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSearchInput,
  SelectTrigger,
  SelectValue,
  matchesQuery,
} from '@/components/ui/select';
import { SEARCH_THRESHOLD } from '@/components/filters/FilterSelect';
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
  variant?: 'solid' | 'outline';
  className?: string;
}

export function MemberPicker({
  members,
  isLoading = false,
  selectedId,
  onSelect,
  placeholder = 'Select a member…',
  disabled = false,
  variant = 'solid',
  className,
}: MemberPickerProps) {
  // A department runs to 25 members, so the list is scrolled rather than read.
  const [query, setQuery] = useState('');
  const showSearch = members.length > SEARCH_THRESHOLD;
  const visible = query ? members.filter((m) => matchesQuery(m.fullName, query)) : members;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-52", className)} />;
  }

  return (
    <Select
      value={selectedId ?? ''}
      onValueChange={(val) => val && onSelect(val)}
      disabled={disabled}
      onOpenChange={(open) => { if (!open) setQuery(''); }}
    >
      <SelectTrigger 
        id="member-picker" 
        className={cn(
          "transition-all duration-300 ease-in-out",
          !className && "w-52", 
          variant === 'solid' && selectedId && "bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary focus:ring-0",
          variant === 'outline' && "border bg-transparent text-center border-border justify-center",
          className
        )}
      >
        <SelectValue placeholder={placeholder} className={cn(variant === 'outline' && "justify-center text-center")}>
          {(val) => (val ? members.find((m) => m.id === val)?.fullName ?? val : placeholder)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {showSearch && (
          <SelectSearchInput value={query} onChange={setQuery} placeholder="Search members…" />
        )}

        {visible.map((m) => (
          <SelectItem key={m.id} value={m.id} label={m.fullName}>
            {m.fullName}
          </SelectItem>
        ))}

        {visible.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            {query ? `Nothing matches “${query}”` : 'No members found'}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
