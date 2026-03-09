import { Toaster } from "@/components/ui/sonner";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";
import { AuthGuard } from "./components/AuthGuard";
import { Dashboard } from "./pages/Dashboard";
import { Harvesting } from "./pages/Harvesting";
import { Login } from "./pages/Login";
import { Metrics } from "./pages/Metrics";
import { Pricing } from "./pages/Pricing";
import { Settings } from "./pages/Settings";
import { TaxReports } from "./pages/TaxReports";
import { Transactions } from "./pages/Transactions";

// Root Route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.012 240)",
            border: "1px solid oklch(0.28 0.018 240)",
            color: "oklch(0.92 0.01 200)",
          },
        }}
      />
      <Outlet />
    </>
  ),
});

// Login Route (outside auth guard)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

// Auth Guard Route
const authGuardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "auth-guard",
  component: AuthGuard,
});

// Layout Route (nested under auth guard)
const layoutRoute = createRoute({
  getParentRoute: () => authGuardRoute,
  id: "layout",
  component: AppLayout,
});

// Index redirect (under layout)
const indexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/dashboard",
  component: Dashboard,
});

const transactionsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/transactions",
  component: Transactions,
});

const reportsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/reports",
  component: TaxReports,
});

const harvestingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/harvesting",
  component: Harvesting,
});

const pricingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/pricing",
  component: Pricing,
});

const settingsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/settings",
  component: Settings,
});

const metricsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/metrics",
  component: Metrics,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  authGuardRoute.addChildren([
    layoutRoute.addChildren([
      indexRoute,
      dashboardRoute,
      transactionsRoute,
      reportsRoute,
      harvestingRoute,
      pricingRoute,
      settingsRoute,
      metricsRoute,
    ]),
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
