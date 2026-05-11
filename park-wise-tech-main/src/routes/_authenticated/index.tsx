import { createFileRoute } from "@tanstack/react-router";
import { Activity, Car, CircleDollarSign, LogOut, MapPin, Radio, Search, Settings, Shield, TrendingUp, Zap } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Nexus Park — Smart Parking Operations" },
      { name: "description", content: "Real-time parking space management, occupancy analytics, and dynamic pricing for modern cities." },
    ],
  }),
});

type Status = "free" | "occupied" | "reserved" | "ev";

const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  free: { label: "Available", cls: "border-[color:var(--color-primary)]/40 bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]", dot: "bg-[color:var(--color-primary)]" },
  occupied: { label: "Occupied", cls: "border-destructive/40 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  reserved: { label: "Reserved", cls: "border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/10 text-[color:var(--color-warning)]", dot: "bg-[color:var(--color-warning)]" },
  ev: { label: "EV Charging", cls: "border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/10 text-[color:var(--color-accent)]", dot: "bg-[color:var(--color-accent)]" },
};

const SPOTS: { id: string; status: Status }[] = [
  ["A1","free"],["A2","occupied"],["A3","free"],["A4","reserved"],["A5","free"],["A6","occupied"],["A7","ev"],["A8","free"],
  ["B1","occupied"],["B2","occupied"],["B3","free"],["B4","occupied"],["B5","reserved"],["B6","free"],["B7","free"],["B8","occupied"],
  ["C1","free"],["C2","ev"],["C3","occupied"],["C4","free"],["C5","free"],["C6","reserved"],["C7","occupied"],["C8","free"],
  ["D1","reserved"],["D2","free"],["D3","occupied"],["D4","ev"],["D5","free"],["D6","occupied"],["D7","free"],["D8","free"],
].map(([id, status]) => ({ id: id as string, status: status as Status }));

function Index() {
  const total = SPOTS.length;
  const occupied = SPOTS.filter(s => s.status === "occupied").length;
  const occupancy = Math.round((occupied / total) * 100);

  return (
    <div className="min-h-screen text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur-xl bg-background/60">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 rounded-md bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-accent)] grid place-items-center glow">
              <Car className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide">NEXUS<span className="text-[color:var(--color-primary)]">·</span>PARK</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Operations Console</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {["Overview","Lots","Reservations","Pricing","Sensors"].map((n,i) => (
              <a key={n} className={`px-3 py-1.5 rounded-md transition-colors ${i===0 ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>{n}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/60 border border-border text-sm text-muted-foreground w-64">
              <Search className="h-3.5 w-3.5" />
              <input placeholder="Search lots, spots, plates…" className="bg-transparent outline-none w-full placeholder:text-muted-foreground/70" />
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Sign out" className="h-9 w-9 grid place-items-center rounded-md bg-secondary/60 border border-border hover:border-[color:var(--color-primary)]/40">
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-primary)] opacity-75 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--color-primary)]" /></span>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Hero / status */}
        <section className="relative overflow-hidden rounded-2xl card-surface p-8 bg-grid">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[color:var(--color-primary)]/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[color:var(--color-primary)]">
                <Radio className="h-3 w-3" /> Downtown · District 04
              </div>
              <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
                Reclaim the curb. <span className="text-gradient">In real time.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Live occupancy across 12 lots, 1,284 sensors, and dynamic pricing tuned every 60 seconds.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2.5 rounded-md bg-[color:var(--color-primary)] text-primary-foreground text-sm font-medium hover:opacity-90 glow transition">Open dispatch</button>
              <button className="px-4 py-2.5 rounded-md border border-border text-sm hover:border-[color:var(--color-primary)]/50 transition">Export report</button>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: "Occupancy", value: `${occupancy}%`, delta: "+4.2%", color: "text-[color:var(--color-primary)]" },
            { icon: Car, label: "Active Spots", value: `${occupied}/${total}`, delta: "live", color: "text-[color:var(--color-accent)]" },
            { icon: CircleDollarSign, label: "Revenue · Today", value: "$12,480", delta: "+8.1%", color: "text-[color:var(--color-warning)]" },
            { icon: TrendingUp, label: "Avg. Turnover", value: "47 min", delta: "-3 min", color: "text-[color:var(--color-primary)]" },
          ].map(({ icon: Icon, label, value, delta, color }) => (
            <div key={label} className="card-surface rounded-xl p-5 hover:border-[color:var(--color-primary)]/30 transition group">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{delta} vs last hour</div>
            </div>
          ))}
        </section>

        {/* AI Concierge */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)]">AI Concierge</div>
              <h2 className="text-xl font-medium mt-1">Talk to your parking network</h2>
            </div>
            <div className="text-xs text-muted-foreground">Natural-language search · booking · forecasts · pricing rationale</div>
          </div>
          <ChatPanel />
        </section>

        {/* Grid: map + side */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Spot grid */}
          <div className="lg:col-span-2 card-surface rounded-2xl p-6 relative overflow-hidden scanline">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lot 04 · Level 2</div>
                <div className="text-lg font-medium">Sensor grid</div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {(Object.keys(STATUS) as Status[]).map(k => (
                  <div key={k} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${STATUS[k].dot}`} /> {STATUS[k].label}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-8 gap-2.5">
              {SPOTS.map(s => {
                const st = STATUS[s.status];
                return (
                  <div key={s.id} className={`relative aspect-[3/4] rounded-md border ${st.cls} grid place-items-center text-[10px] font-mono transition hover:scale-[1.04] cursor-pointer`}>
                    <span className="absolute top-1 left-1 opacity-60">{s.id}</span>
                    {s.status === "free" && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)] pulse-ring" />}
                    {s.status === "ev" && <Zap className="h-3 w-3" />}
                    {s.status === "occupied" && <Car className="h-3 w-3 opacity-80" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> 219 Mission St · 32 spots</div>
              <div className="font-mono">last sync 00:00:02</div>
            </div>
          </div>

          {/* Live activity */}
          <div className="space-y-6">
            <div className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">Live activity</div>
                <Activity className="h-4 w-4 text-[color:var(--color-primary)]" />
              </div>
              <ul className="space-y-3 text-sm">
                {[
                  { plate: "8KQR·240", action: "Entered B5", time: "12s", tone: "warning" },
                  { plate: "3FX·1187", action: "Paid $4.20", time: "44s", tone: "primary" },
                  { plate: "EV·9921", action: "Charging C2", time: "1m", tone: "accent" },
                  { plate: "7TB·552", action: "Exited A2", time: "2m", tone: "muted" },
                  { plate: "9LM·018", action: "Reserved D1", time: "3m", tone: "warning" },
                ].map((a, i) => (
                  <li key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${a.tone === "primary" ? "bg-[color:var(--color-primary)]" : a.tone === "accent" ? "bg-[color:var(--color-accent)]" : a.tone === "warning" ? "bg-[color:var(--color-warning)]" : "bg-muted-foreground"}`} />
                    <span className="font-mono text-xs text-muted-foreground">{a.plate}</span>
                    <span className="flex-1">{a.action}</span>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">Dynamic pricing</div>
                <Shield className="h-4 w-4 text-[color:var(--color-accent)]" />
              </div>
              <div className="text-4xl font-semibold tracking-tight">$<span className="text-gradient">5.40</span><span className="text-base text-muted-foreground"> /hr</span></div>
              <div className="mt-1 text-xs text-muted-foreground">Surge tier 2 · demand high</div>
              <div className="mt-5 h-20 flex items-end gap-1.5">
                {[30,42,55,48,70,82,95,88,72,60,78,90].map((v,i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[color:var(--color-primary)]/20 to-[color:var(--color-primary)]" style={{ height: `${v}%` }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>06:00</span><span>12:00</span><span>18:00</span><span>00:00</span>
              </div>
            </div>
          </div>
        </section>

        <footer className="pt-6 pb-10 text-center text-xs text-muted-foreground">
          Nexus·Park · 12 lots online · operating in 4 districts
        </footer>
      </main>
    </div>
  );
}
