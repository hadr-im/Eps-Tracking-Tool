// CommentPanel — side sheet for viewing and adding comments on a specific EP.
// Opened by clicking the comment icon in a table row.
// Comments appear immediately after adding (React Query cache invalidation).
// TL/VP: can add comments. Read-only for all others (same sheet, just no input).

import { useState, useRef, useEffect } from 'react';
import { ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/layout/UserAvatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useComments }   from '@/hooks/useComments';
import { useAddComment } from '@/hooks/useAddComment';
import type { Ep } from '@/types/ep';

interface CommentPanelProps {
  ep: Ep | null;           // null = panel is closed
  canComment: boolean;     // true for TL/VP, false for MEMBER
  onClose: () => void;
}

export function CommentPanel({ ep, canComment, onClose }: CommentPanelProps) {
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: comments = [], isLoading } = useComments(ep?.id ?? null);
  const { mutate: addComment, isPending: isSending } = useAddComment();

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  // Clear draft when panel closes
  useEffect(() => {
    if (!ep) setDraft('');
  }, [ep]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !ep) return;

    addComment(
      { epId: ep.id, payload: { content } },
      { onSuccess: () => setDraft('') },
    );
  }

  return (
    <Sheet open={!!ep} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="flex flex-col w-full sm:max-w-md gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare size={16} className="text-muted-foreground" />
            Comments
          </SheetTitle>
          {ep && (
            <SheetDescription className="text-xs text-muted-foreground truncate">
              {ep.fullName}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && comments.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <MessageSquare size={28} className="text-muted-foreground/30" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">No comments yet.</p>
              {canComment && (
                <p className="text-xs text-muted-foreground">Be the first to leave a note.</p>
              )}
            </div>
          )}

          {/* Flat rows: label left, timestamp right, text below, each entry
              closed off by a hairline. Cards made a short note look heavier
              than it is and stacked badly once there were several. */}
          {!isLoading &&
            comments.map((c) => (
              <div key={c.id} className="border-b pb-3 last:border-b-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <UserAvatar
                    fullName={c.authorName ?? undefined}
                    avatarUrl={c.authorAvatarUrl}
                    className="h-6 w-6 shrink-0 text-[9px]"
                  />
                  <span className="text-xs font-semibold text-foreground truncate flex-1">
                    {c.authorName ?? 'Unknown'}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word pl-8">
                  {c.content}
                </p>
              </div>
            ))}

          <div ref={bottomRef} />
        </div>

        {/* Add comment (TL/VP only).
            The send control sits inside the field, divided off by a rule, so
            the composer reads as one object instead of a box plus a button. */}
        {canComment && (
          <form onSubmit={handleSubmit} className="shrink-0 border-t px-5 py-3">
            <div className="flex items-stretch rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
              <textarea
                className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none min-h-10 max-h-28"
                placeholder="Add a comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={1}
                disabled={isSending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!draft.trim() || isSending}
                aria-label="Send comment"
                className="shrink-0 border-l px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors rounded-r-lg disabled:opacity-40 disabled:pointer-events-none"
              >
                {isSending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
              </button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
