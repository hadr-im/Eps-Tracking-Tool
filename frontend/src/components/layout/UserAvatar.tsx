// UserAvatar — a Google profile picture when there is one, initials otherwise.

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/*
  First letter of the first and last word: "selim boudaga" -> "SB".
  Falls back to the email's first character so the circle is never empty.
*/
export function initialsFor(fullName: string | undefined, email?: string | null): string {
  const words = (fullName ?? '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return (email ?? '?').charAt(0).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();

  return (words[0]!.charAt(0) + words[words.length - 1]!.charAt(0)).toUpperCase();
}

interface UserAvatarProps {
  fullName?: string;
  email?: string | null;
  avatarUrl?: string | null;
  className?: string;
}

export function UserAvatar({ fullName, email, avatarUrl, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('h-9 w-9 shrink-0', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? ''} referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-aiesec-blue/10 text-aiesec-blue text-xs font-semibold">
        {initialsFor(fullName, email)}
      </AvatarFallback>
    </Avatar>
  );
}
