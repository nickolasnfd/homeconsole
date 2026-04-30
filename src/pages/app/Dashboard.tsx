import { useMemo } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { AlertTriangle, Package, Wallet, Wrench } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const inventory = useTable<any>("inventory", { column: "name" });
  const maintenance = useTable<any>("maintenance", { column: "next_due_date" });
  const finances = useTable<any>("finances", { column: "due_date" });

  const lowStock = (inventory.data ?? []).filter((i) => Number(i.current_qty) < Number(i.min_threshold));
  const criticalMaint = (maintenance.data ?? []).filter((m) => daysUntil(m.next_due_date) < 7);
  const pendingBills = (finances.data ?? []).filter((f) => f.status === "pending");
  const pendingTotal = pendingBills.reduce((s, f) => s + Number(f.amount || 0), 0);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      map.set(key, 0);
    }
    (finances.data ?? []).forEach((f) => {
      const d = new Date(f.due_date);
      const key = d.toLocaleDateString("en-US", { month: "short" });
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(f.amount || 0));
    });
    return Array.from(map, ([month, total]) => ({ month, total }));
  }, [finances.data]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3">
        <SummaryCard
          to="/maintenance"
          icon={<Wrench className="h-5 w-5" />}
          label="Critical Maintenance"
          value={criticalMaint.length}
          hint={criticalMaint.length ? `${criticalMaint[0].title} • due ${formatDate(criticalMaint[0].next_due_date)}` : "All caught up"}
          tone={criticalMaint.length ? "danger" : "success"}
        />
        <SummaryCard
          to="/inventory"
          icon={<Package className="h-5 w-5" />}
          label="Low Stock Alerts"
          value={lowStock.length}
          hint={lowStock.length ? `${lowStock[0].name} below threshold` : "Stock is healthy"}
          tone={lowStock.length ? "warning" : "success"}
        />
        <SummaryCard
          to="/finance"
          icon={<Wallet className="h-5 w-5" />}
          label="Pending Bills"
          value={pendingBills.length}
          hint={pendingBills.length ? `${formatCurrency(pendingTotal)} outstanding` : "Nothing due"}
          tone={pendingBills.length ? "danger" : "success"}
        />
      </div>

      <Section title="Monthly expenses" subtitle="Last 6 months">
        <div className="h-44 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" width={32} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {monthly.map((_, i) => (
                  <Cell key={i} fill="hsl(var(--primary))" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Inventory levels" subtitle="Top 5 items">
        <InventoryMiniChart data={(inventory.data ?? []).slice(0, 5)} />
      </Section>

      {criticalMaint.length > 0 && (
        <Section title="Upcoming tasks" subtitle="Next 7 days">
          <div className="space-y-2">
            {criticalMaint.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-card rounded-2xl p-3 shadow-card">
                <div>
                  <p className="font-semibold text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(m.next_due_date)}</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function SummaryCard({ to, icon, label, value, hint, tone }: {
  to: string; icon: React.ReactNode; label: string; value: number; hint: string;
  tone: "success" | "warning" | "danger";
}) {
  const ring =
    tone === "danger" ? "bg-destructive/10 text-destructive" :
    tone === "warning" ? "bg-warning/15 text-warning" :
    "bg-success/10 text-success";
  return (
    <Link to={to} className="block bg-card rounded-2xl p-4 shadow-card active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${ring}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 truncate">{hint}</p>
    </Link>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl p-4 shadow-card">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function InventoryMiniChart({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-xs text-muted-foreground py-4 text-center">No items yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((i) => {
        const ratio = i.min_threshold > 0 ? Math.min(2, Number(i.current_qty) / Number(i.min_threshold)) : 1;
        const pct = Math.min(100, ratio * 50);
        const low = Number(i.current_qty) < Number(i.min_threshold);
        return (
          <div key={i.id}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium truncate pr-2">{i.name}</span>
              <span className="text-muted-foreground tabular-nums">{i.current_qty} {i.unit}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${low ? "bg-destructive" : "bg-success"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}