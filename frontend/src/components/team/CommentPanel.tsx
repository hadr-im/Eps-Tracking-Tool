// CommentPanel — side sheet for viewing and adding comments on a specific EP.
// Opened by clicking the comment icon in a table row.
// Comments appear immediately after adding (React Query cache invalidation).
// TL/VP: can add comments. Read-only for all others (same sheet, just no input).

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button }   from '@/components/ui/button';
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
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

          {!isLoading &&
            comments.map((c) => (
              <div key={c.id} className="space-y-0.5">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {c.fieldName && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                      {c.fieldName}
                    </span>
                  )}
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm leading-relaxed">
                  {c.content}
                </div>
              </div>
            ))}

          <div ref={bottomRef} />
        </div>

        {/* Add comment input (TL/VP only) */}
        {canComment && (
          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t px-5 py-4 flex gap-2 items-end"
          >
            <textarea
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none ring-0 focus:ring-1 focus:ring-ring min-h-[64px] max-h-[120px]"
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              disabled={isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || isSending}
              aria-label="Send comment"
            >
              {isSending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
