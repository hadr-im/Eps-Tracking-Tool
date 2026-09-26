// Full-height shell for all authenticated routes
// Desktop (md+): persistent collapsible sidebar + scrollable main area
// Mobile (<md): sidebar hidden, opened as a Sheet overlay via hamburger button

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarBody } from '@/components/layout/Sidebar';
import { AppHeader } from '@/components/layout/AppHeader';

export function AppLayout() {
  // Desktop: collapsed (icon-only) vs. expanded sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Mobile: sheet open state
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* Desktop sidebar (md+) */}
      <aside className="relative hidden md:block shrink-0 border-r border-sidebar-border transition-all duration-200">
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/*
        Mobile sidebar. Driven by state rather than a SheetTrigger, so this
        Sheet does not have to wrap the page content — nesting the page inside
        it made every dialog opened from a page a *nested* dialog, which
        suppressed their backdrops (the comments drawer opened undimmed).
      */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-64! p-0 border-r">
          <SidebarBody collapsed={false} onNavClick={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content: fixed header, scrolling page below it */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          onOpenNav={() => setSheetOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
