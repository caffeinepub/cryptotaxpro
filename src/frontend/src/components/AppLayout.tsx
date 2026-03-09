import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUserProfile } from "../hooks/useQueries";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    ocid: "nav.dashboard.link",
  },
  {
    path: "/transactions",
    label: "Transactions",
    icon: ArrowLeftRight,
    ocid: "nav.transactions.link",
  },
  {
    path: "/reports",
    label: "Tax Reports",
    icon: FileText,
    ocid: "nav.reports.link",
  },
  {
    path: "/harvesting",
    label: "Harvesting",
    icon: Scissors,
    ocid: "nav.harvesting.link",
  },
  {
    path: "/pricing",
    label: "Pricing",
    icon: CreditCard,
    ocid: "nav.pricing.link",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
    ocid: "nav.settings.link",
  },
  {
    path: "/metrics",
    label: "Metrics",
    icon: Activity,
    ocid: "nav.metrics.link",
  },
];

const planColors: Record<string, string> = {
  free: "text-muted-foreground",
  newbie: "text-blue-400",
  hodler: "text-primary",
  trader: "text-yellow-400",
};

const planLabels: Record<string, string> = {
  free: "Free Plan",
  newbie: "Newbie",
  hodler: "Hodler",
  trader: "Trader",
};

function shortenPrincipal(principal: string): string {
  if (principal.length <= 11) return principal;
  return `${principal.slice(0, 5)}...${principal.slice(-3)}`;
}

export function AppLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: profile } = useUserProfile();
  const plan = profile?.plan ?? "free";
  const { identity, clear } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 border border-primary/40">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight font-display">
              CryptoTaxPro
            </span>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">
              Tax Year 2025
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ path, label, icon: Icon, ocid }) => {
            const isActive = currentPath === path;
            return (
              <Link
                key={path}
                to={path}
                data-ocid={ocid}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 group",
                  isActive
                    ? "bg-primary/15 text-primary font-medium border border-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 text-primary opacity-60" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Plan badge + user identity at bottom */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/pricing"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors group"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 border border-primary/30">
              <Zap className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-xs font-semibold truncate",
                  planColors[plan] ?? "text-muted-foreground",
                )}
              >
                {planLabels[plan] ?? plan}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {plan === "free" ? "Upgrade for reports" : "Active"}
              </p>
            </div>
          </Link>

          {/* User principal + sign out */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent/50">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex-shrink-0">
              <User className="w-3 h-3 text-primary" />
            </div>
            <p className="flex-1 text-xs text-muted-foreground font-mono truncate min-w-0">
              {principal ? shortenPrincipal(principal) : "Anonymous"}
            </p>
            <Button
              data-ocid="nav.signout.button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3 h-3" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-1">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              Built with caffeine.ai
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
