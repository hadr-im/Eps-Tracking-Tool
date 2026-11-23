/*
  Copy a value to the clipboard.

  Exists for the mobile cards, where an email or a phone number is something
  you need *in another app* — the dialler, WhatsApp, a mail client. Selecting
  text by hand on a phone is fiddly at the best of times, and these sit inside
  a card that expands and collapses on tap, so a long-press to select tends to
  toggle the card instead.

  The tick and the toast say the same thing twice on purpose. The tick is
  where the finger already is, so it is seen; the toast survives the finger
  covering the button, and names what was copied, which matters when there
  are two of these a line apart and they look alike.
*/

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  /** The text put on the clipboard. Nothing renders when this is empty. */
  value: string | null | undefined;
  /** What was copied, for the toast and the label: "Email", "Phone". */
  label: string;
  className?: string;
}

// Long enough to be noticed, short enough that the button is ready again
// before the next tap.
const TICK_MS = 1600;

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A card can be collapsed, or the list refiltered, while the tick is
  // showing; without this the timer fires into an unmounted component.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const text = value?.trim();
  if (!text) return null;

  async function copy() {
    try {
      /*
        navigator.clipboard needs a secure context. The app is served over
        HTTPS so this is the normal path, but a phone browser can still
        refuse it — in a webview, or with clipboard permission denied — and
        the old execCommand route is what keeps those working.
      */
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text!);
      } else {
        const el = document.createElement('textarea');
        el.value = text!;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('copy rejected');
      }

      setCopied(true);
      toast.success(`${label} copied`, { description: text });

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), TICK_MS);
    } catch {
      // Silence here would look identical to success, so say so.
      toast.error(`Could not copy the ${label.toLowerCase()}`);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        // The row sits inside a card that expands on tap.
        e.stopPropagation();
        void copy();
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
      className={cn(
        /*
          36px of touch target around a 13px icon. The icon is small so it
          sits beside 12px text without crowding it, but a target that size
          is below what a thumb can hit reliably, so the padding carries it.
        */
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
        'text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground active:bg-muted',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        copied && 'text-emerald-600 hover:text-emerald-600',
        className,
      )}
    >
      {copied ? (
        <Check size={13} strokeWidth={2.6} aria-hidden />
      ) : (
        <Copy size={13} strokeWidth={2.2} aria-hidden />
      )}
    </button>
  );
}
