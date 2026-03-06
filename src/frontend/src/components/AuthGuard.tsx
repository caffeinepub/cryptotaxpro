import { Navigate, Outlet } from "@tanstack/react-router";
import { Loader2, TrendingUp } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function AuthGuard() {
  const { identity, isInitializing } = useInternetIdentity();

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 border border-primary/30">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading CryptoTaxPro...</span>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}
