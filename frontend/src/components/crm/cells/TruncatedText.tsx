import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Truncated one-line text with a hover popup. Any table cell that can hold a
// long value (email, university, source, notes, transition note, …) renders
// its content through this so the row stays tidy while the full text is one
// hover away.

interface TruncatedTextProps {
  value: string | null | undefined;
  className?: string;
  emptyPlaceholder?: React.ReactNode;
}

const DEFAULT_EMPTY = <span className="text-muted-foreground">—</span>;

export function TruncatedText({
  value,
  className,
  emptyPlaceholder = DEFAULT_EMPTY,
}: TruncatedTextProps) {
  const [hover, setHover] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState({ left: 0, top: 0 });
  const popupRef = useRef<HTMLDivElement | null>(null);

  // After the popup mounts, measure it and flip to the left side of the cursor
  // if placing it on the right would push it past the viewport edge — otherwise
  // long notes in the last column render half off-screen.
  useLayoutEffect(() => {
    if (!hover || !popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const OFFSET = 12;
    const wouldOverflowRight = cursor.x + OFFSET + rect.width > window.innerWidth - 8;
    const left = wouldOverflowRight
      ? Math.max(8, cursor.x - OFFSET - rect.width)
      : cursor.x + OFFSET;
    const wouldOverflowBottom = cursor.y + 16 + rect.height > window.innerHeight - 8;
    const top = wouldOverflowBottom
      ? Math.max(8, cursor.y - 8 - rect.height)
      : cursor.y + 16;
    setPlacement({ left, top });
  }, [hover, cursor]);

  if (!value) return <>{emptyPlaceholder}</>;

  return (
    <>
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
        className={
          className ??
          'text-xs max-w-50 block truncate whitespace-nowrap overflow-hidden text-center mx-auto'
        }
      >
        {value}
      </span>

      {hover && createPortal(
        <div
          ref={popupRef}
          role="tooltip"
          className="pointer-events-none fixed z-[9999] w-max max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground shadow-lg shadow-black/10 whitespace-pre-wrap break-words"
          style={{ left: placement.left, top: placement.top }}
        >
          {value}
        </div>,
        document.body,
      )}
    </>
  );
}
