import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Bottom-right on desktop, top-center on phones — a bottom toast on a small
// screen collides with the on-screen keyboard and the thumb zone.
const MOBILE_QUERY = '(max-width: 640px)';

function useToastPosition(): ToasterProps['position'] {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile ? 'top-center' : 'bottom-right';
}

function Toaster({ ...props }: ToasterProps) {
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');
  const position = useToastPosition();

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      position={position}
      gap={8}
      toastOptions={{
        classNames: {
          toast: [
            'group/toast',
            'flex items-center gap-3',
            'w-full rounded-2xl border border-border/60',
            'bg-card px-4 py-3',
            'shadow-none!',         
            'text-sm font-medium text-foreground',
          ].join(' '),
          title: 'text-sm font-semibold leading-tight',
          description: 'text-xs text-muted-foreground mt-0.5',
          icon: [
            'shrink-0 flex items-center justify-center',
            'h-7 w-7 rounded-full',
            'group-data-[type=success]/toast:bg-sidebar-primary/10 group-data-[type=success]/toast:text-sidebar-primary',
            'group-data-[type=error]/toast:bg-destructive/10 group-data-[type=error]/toast:text-destructive',
            'group-data-[type=warning]/toast:bg-amber-500/10 group-data-[type=warning]/toast:text-amber-600',
            'group-data-[type=info]/toast:bg-blue-500/10 group-data-[type=info]/toast:text-blue-600',
          ].join(' '),
          closeButton: [
            'ml-auto shrink-0 opacity-40 hover:opacity-100 transition-opacity',
            'h-5 w-5 rounded-full flex items-center justify-center',
          ].join(' '),
          actionButton: 'text-xs font-semibold text-sidebar-primary hover:underline ml-auto',
          cancelButton: 'text-xs text-muted-foreground ml-auto',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
