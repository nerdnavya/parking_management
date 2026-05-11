import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  }
  return <Outlet />;
}
