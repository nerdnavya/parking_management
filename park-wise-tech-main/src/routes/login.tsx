import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Nexus Park" }] }),
});

function LoginPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: "/" }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-surface rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-accent)] grid place-items-center glow">
            <Car className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">NEXUS·PARK</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Operations Console</div>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to access the AI parking concierge.</p>

        <button onClick={google} className="w-full mb-4 px-4 py-2.5 rounded-md border border-border hover:border-[color:var(--color-primary)]/50 transition text-sm flex items-center justify-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.37-1.61 4-5.35 4-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.69 3.7 14.55 2.9 12 2.9 6.92 2.9 2.85 6.97 2.85 12s4.07 9.1 9.15 9.1c5.27 0 8.78-3.7 8.78-8.92 0-.6-.07-1.05-.43-2.08z"/></svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or<div className="h-px flex-1 bg-border" /></div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md bg-secondary/60 border border-border outline-none focus:border-[color:var(--color-primary)]/50 text-sm" />
          <input type="password" required minLength={6} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md bg-secondary/60 border border-border outline-none focus:border-[color:var(--color-primary)]/50 text-sm" />
          <button type="submit" disabled={busy} className="w-full px-4 py-2.5 rounded-md bg-[color:var(--color-primary)] text-primary-foreground text-sm font-medium hover:opacity-90 glow transition disabled:opacity-50">
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")} className="mt-4 text-xs text-muted-foreground hover:text-foreground transition w-full text-center">
          {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
        <div className="mt-6 text-center"><Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link></div>
      </div>
    </div>
  );
}
