import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  BarChart2,
  Users,
  Users2,
  ArrowRightLeft,
  LogOut,
  BadgeCheck,
  Hourglass,
  LayoutDashboard,
  Send,
  UserCheck,
  UserCog,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { brandForDepartment } from '@/lib/productBrand';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Member',
  TEAM_LEADER: 'Team Leader',
  VP: 'Vice President',
};

// Compact codes for the sidebar, where there is no room for the full title.
const ROLE_CODES: Record<string, string> = {
  MEMBER: 'TM',
  TEAM_LEADER: 'TL',
  VP: 'VP',
};

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
  { to: '/team/transitioned-eps', icon: ArrowRightLeft, label: 'Transitioned EPs' },
  { to: '/dispatch',           icon: Send,           label: 'Dispatch'        },
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
        // Hover uses the same filled treatment as the selected state, so the
        // preview lands on exactly the colour the click will produce.
        isActive
          ? 'bg-(--nav-active)/15 text-(--nav-active)'
          : 'text-sidebar-foreground/70 hover:bg-(--nav-active)/10 hover:text-(--nav-active)',
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

// Logout — same shape as NavItem, red only on hover.

function LogoutItem({
  collapsed,
  onLogout,
}: {
  collapsed: boolean;
  onLogout: () => void;
}) {
  const button = (
    <button
      id="nav-logout"
      type="button"
      onClick={onLogout}
      aria-label="Logout"
      className={cn(
        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
        'text-sidebar-foreground/70 hover:bg-destructive/15 hover:text-destructive',
        collapsed && 'justify-center px-2',
      )}
    >
      <LogOut size={18} className="shrink-0" />
      {!collapsed && <span>Logout</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{button}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Logout</TooltipContent>
      </Tooltip>
    );
  }
  return button;
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
  onNavClick?: () => void;
}

export function SidebarBody({ collapsed, onNavClick }: SidebarBodyProps) {
  const { logout, user } = useAuth();
  const isTeam = user?.role === 'TEAM_LEADER' || user?.role === 'VP';
  const brand = brandForDepartment(user?.departmentId);

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
        /* The active nav colour follows the department, so GV/GTA/GTE each
           get their own accent without branching in every NavItem. */
        style={
          {
            '--nav-active': brand?.color ?? 'var(--sidebar-primary)',
          } as React.CSSProperties
        }
      >
        {/* Logo: the department's own mark, sized to fill the sidebar width.
            The programme is already obvious from the artwork, so no caption. */}
        <div className={cn('px-4 py-4', collapsed && 'px-2')}>
          {brand ? (
            /*
              Two artworks: the wordmark for the expanded rail, the compact
              signup mark for the collapsed rail — a wordmark shrunk to 36px
              is unreadable. Kept aligned left so the mark lines up with the
              nav icons below.
            */
            <img
              src={collapsed ? brand.logo : brand.homeLogo}
              alt={brand.label}
              className={cn(
                'object-contain',
                collapsed ? 'h-9 w-9 mx-auto' : 'h-11 w-auto object-left',
              )}
            />
          ) : (
            <div className="h-10 w-full rounded-lg bg-sidebar-primary flex items-center justify-center text-white text-sm font-bold">
              EPs Tracking Tool
            </div>
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
              {/* VP-only items */}
              {user?.role === 'VP' && (
                <>
                  <NavItem
                    to="/global-dashboard"
                    icon={LayoutDashboard}
                    label="Global Dashboard"
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                  <NavItem
                    to="/approvals"
                    icon={UserCheck}
                    label="Requests"
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                  <NavItem
                    to="/members"
                    icon={UserCog}
                    label="Members"
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                </>
              )}
            </>
          )}

        </nav>

        {/* Who is signed in — clickable, opens the profile — then the way out. */}
        <div className="px-2 pb-3 space-y-1">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <NavLink
                  to="/settings"
                  onClick={onNavClick}
                  className="flex justify-center py-1 rounded-lg hover:bg-sidebar-accent/60 transition-colors"
                >
                  <UserAvatar
                    fullName={user?.fullName}
                    email={user?.email}
                    avatarUrl={user?.avatarUrl}
                    className="h-9 w-9"
                  />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {user?.fullName} · {ROLE_LABELS[user?.role ?? ''] ?? ''}
              </TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/settings"
              onClick={onNavClick}
              className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent/70 transition-colors px-2.5 py-2 min-w-0"
            >
              <UserAvatar
                fullName={user?.fullName}
                email={user?.email}
                avatarUrl={user?.avatarUrl}
                className="h-9 w-9"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold truncate">{user?.fullName}</p>
                  {/* Short code beside the name: the sidebar is narrow, and
                      "Vice President" pushed the email onto a third line. */}
                  <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold leading-none bg-(--nav-active)/15 text-(--nav-active)">
                    {ROLE_CODES[user?.role ?? ''] ?? ''}
                  </span>
                </div>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">
                  {user?.email}
                </p>
              </div>
            </NavLink>
          )}

          {/* Logout: shaped exactly like a nav link, so the sidebar reads as
              one list. Only the hover colour marks it out as destructive. */}
          <LogoutItem collapsed={collapsed} onLogout={logout} />
        </div>
      </div>
    </TooltipProvider>
  );
}
