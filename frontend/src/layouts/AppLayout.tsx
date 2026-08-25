// Full-height shell for all authenticated routes
// Desktop (md+): persistent collapsible sidebar + scrollable main area
// Mobile (<md): sidebar hidden, opened as a Sheet overlay via hamburger button

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarBody } from '@/components/layout/Sidebar';

export function AppLayout() {
  // Desktop: collapsed (icon-only) vs. expanded sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Mobile: sheet open state
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">

      {/* Desktop sidebar (md+) */}
      <aside className="relative hidden md:block shrink-0 border-r border-sidebar-border transition-all duration-200">
        <SidebarBody
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* Mobile sidebar (Sheet overlay) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            id="mobile-menu-btn"
            variant="ghost"
            size="icon"
            className="fixed left-3 top-3 z-40 md:hidden h-9 w-9 rounded-lg border bg-card shadow-sm"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-55 p-0 border-r">
          <SidebarBody
            collapsed={false}
            onNavClick={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Top padding on mobile to clear the hamburger button */}
        <div className="h-full pt-14 md:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
