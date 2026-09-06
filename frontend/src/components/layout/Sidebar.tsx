import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  BarChart2,
  Users,
  Users2,
  ArrowRightLeft,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Hourglass,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// Nav section definitions (Team section gated by role in the render)

const PERSONAL_NAV = [
  { to: '/crm',       icon: LayoutGrid, label: 'My CRM'      },
  { to: '/dashboard', icon: BarChart2,  label: 'My Dashboard' },
];

const TEAM_NAV = [
  { to: '/team/crm',           icon: Users,         label: 'Team CRM'        },
  { to: '/team/dashboard',     icon: Users2,         label: 'Team Dashboard'  },
  { to: '/team/approved-eps',  icon: BadgeCheck,     label: 'Approved EPs'    },
  { to: '/team/under-process', icon: Hourglass,      label: 'Under Process'   },
  { to: '/dispatch',           icon: ArrowRightLeft, label: 'Dispatch'        },
];

const BOTTOM_NAV = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// NavItem 

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon: Icon, label, collapsed, onClick }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  const link = (
    <NavLink
      to={to}
      onClick={onClick}
      id={`nav-${to.replace('/', '')}`}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground/70',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// Section label (hidden when collapsed)

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35 select-none">
      {label}
    </p>
  );
}

// Sidebar body

interface SidebarBodyProps {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavClick?: () => void;
}

export function SidebarBody({ collapsed, onToggleCollapse, onNavClick }: SidebarBodyProps) {
  const { logout, user } = useAuth();
  const isTeam = user?.role === 'TEAM_LEADER' || user?.role === 'VP';

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200',
          collapsed ? 'w-15' : 'w-55',
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-2.5 px-4 py-5', collapsed && 'justify-center px-2')}>
          <div className="h-8 w-8 shrink-0 rounded-full bg-sidebar-primary flex items-center justify-center text-white text-sm font-bold">
            E
          </div>
          {!collapsed && (
            <span className="font-bold text-sm tracking-tight leading-none">
              EPs Tracker
            </span>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">

          {/* Personal section */}
          <SectionLabel label="Personal" collapsed={collapsed} />
          {PERSONAL_NAV.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavClick} />
          ))}

          {/* Team section (TL / VP only) */}
          {isTeam && (
            <>
              {!collapsed && <Separator className="bg-sidebar-border my-2" />}
              <SectionLabel label="Team" collapsed={collapsed} />
              {TEAM_NAV.map((item) => (
                <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavClick} />
              ))}
            </>
          )}

          {/* Settings section */}
          {!collapsed && <Separator className="bg-sidebar-border my-2" />}
          <SectionLabel label="Other" collapsed={collapsed} />
          {BOTTOM_NAV.map((item) => (
            <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onNavClick} />
          ))}

        </nav>

        <Separator className="bg-sidebar-border" />

        {/* User + Logout */}
        <div className={cn('px-2 py-3 space-y-1', collapsed && 'flex flex-col items-center')}>
          {!collapsed && user && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <p className="text-xs font-semibold truncate">{user.fullName}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger>
              <Button
                id="nav-logout"
                variant="ghost"
                size="sm"
                onClick={logout}
                className={cn(
                  'w-full justify-start gap-2 text-xs text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10',
                  collapsed && 'justify-center px-2',
                )}
              >
                <LogOut size={15} />
                {!collapsed && 'Logout'}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs">Logout</TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Collapse toggle (desktop only) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-50 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-card shadow-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}
