// AppHeader — the thin bar above every authenticated page.
//
// Holds the things that belong to the session rather than the page: who is
// signed in, and the theme toggle. Sits above the scroll area so it stays put
// while the page below it scrolls.

import { useNavigate } from "react-router-dom";
import { LogOut, Menu, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useState, useEffect } from "react";

import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/layout/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-md font-medium text-muted-foreground tracking-wide">
      {time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Africa/Algiers",
      })}
    </span>
  );
}

/*
  First word only, capitalised. People sign up with a lower-case name more
  often than not, and "Hello, selim" looks like a bug rather than a greeting.
*/
function firstName(fullName: string | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

interface AppHeaderProps {
  onOpenNav: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppHeader({
  onOpenNav,
  collapsed,
  onToggleCollapse,
}: AppHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="shrink-0 h-16 border-b border-border/60 bg-card flex items-center gap-3 pl-4 pr-4 md:pl-0 md:pr-6 relative">
      {/* Mobile: open the nav drawer */}
      <button
        type="button"
        id="mobile-menu-btn"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Desktop: collapse the sidebar */}
      <div className="hidden md:flex items-center justify-center h-full border-r border-border/60 px-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="h-6 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Greeting — Pacifico brand font, left side */}
      <p
        className="text-2xl leading-none hidden sm:block shrink-0 pb-1"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Hello, {firstName(user?.fullName)}
      </p>

      {/* Center: live clock */}
      <div className="absolute left-1/2 -translate-x-1/2 select-none">
        <LiveClock />
      </div>

      <div className="flex-1" />

      {/* Identity: avatar only. Name and role live in the menu behind it. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="rounded-full ring-offset-2 ring-offset-card hover:ring-2 hover:ring-border transition-all"
        >
          <UserAvatar
            fullName={user?.fullName}
            email={user?.email}
            avatarUrl={user?.avatarUrl}
            className="h-9 w-9"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent className="min-w-56">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <UserAvatar
              fullName={user?.fullName}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              className="h-9 w-9"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <User />
            My profile
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
            <LogOut />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
