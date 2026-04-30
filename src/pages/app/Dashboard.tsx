import { useMemo } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { AlertTriangle, Package, Wallet, Wrench, ArrowUp, ArrowDown } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
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
      const key = d.toLocaleDateString("pt-BR", { month: "short" });
      map.set(key, 0);
    }
    (finances.data ?? []).forEach((f) => {
      const d = new Date(f.due_date);
      const key = d.toLocaleDateString("pt-BR", { month: "short" });
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(f.amount || 0));
    });
    return Array.from(map, ([month, total]) => ({ month, total }));
  }, [finances.data]);

  return (
    <div className="space-y-5">
      <Section title="Despesas mensais" subtitle="Últimos 6 meses">
        <div className="h-48 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="hsl(var(--muted-foreground))" width={32} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#cyanFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <StockHealthCard
        total={(inventory.data ?? []).length}
        lowCount={lowStock.length}
      />

      <div className="-mx-4 px-4 overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-3 pb-1">
          <SummaryCard
            to="/maintenance"
            icon={<Wrench className="h-5 w-5" />}
            label="Manutenções críticas"
            value={criticalMaint.length}
            total={(maintenance.data ?? []).length}
            hint={criticalMaint.length ? `${criticalMaint[0].title} • vence ${formatDate(criticalMaint[0].next_due_date)}` : "Tudo em dia"}
            tone={criticalMaint.length ? "danger" : "success"}
          />
          <SummaryCard
            to="/finance"
            icon={<Wallet className="h-5 w-5" />}
            label="Contas pendentes"
            value={pendingBills.length}
            total={(finances.data ?? []).length}
            hint={pendingBills.length ? `${formatCurrency(pendingTotal)} em aberto` : "Nada a pagar"}
            tone={pendingBills.length ? "danger" : "success"}
          />
          <SummaryCard
            to="/inventory"
            icon={<Package className="h-5 w-5" />}
            label="Alertas de estoque baixo"
            value={lowStock.length}
            total={(inventory.data ?? []).length}
            hint={lowStock.length ? `${lowStock[0].name} abaixo do mínimo` : "Estoque saudável"}
            tone={lowStock.length ? "warning" : "success"}
          />
        </div>
      </div>

      {criticalMaint.length > 0 && (
        <Section title="Tarefas próximas" subtitle="Próximos 7 dias">
          <div className="space-y-2">
            {criticalMaint.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-card rounded-2xl p-3 shadow-card">
                <div>
                  <p className="font-semibold text-sm">{m.title}</p>
                  <p className="text-xs text-muted-foreground">Vence {formatDate(m.next_due_date)}</p>
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

function SummaryCard({ to, icon, label, value, total, hint, tone }: {
  to: string; icon: React.ReactNode; label: string; value: number; total: number; hint: string;
  tone: "success" | "warning" | "danger";
}) {
  const ring =
    tone === "danger" ? "bg-destructive/10 text-destructive" :
    tone === "warning" ? "bg-warning/15 text-warning" :
    "bg-success/15 text-success";
  const stroke =
    tone === "danger" ? "hsl(var(--destructive))" :
    tone === "warning" ? "hsl(var(--warning))" :
    "hsl(var(--success))";
  return (
    <Link
      to={to}
      className="snap-start shrink-0 w-[85%] bg-card border border-border/60 rounded-2xl p-4 shadow-card active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center gap-3">
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${ring}`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
        <HalfMoonGauge value={value} total={total} stroke={stroke} />
      </div>
      <p className="text-xs text-muted-foreground mt-2 truncate">{hint}</p>
    </Link>
  );
}

function HalfMoonGauge({ value, total, stroke }: { value: number; total: number; stroke: string }) {
  const ratio = total > 0 ? Math.min(1, value / total) : 0;
  const pct = Math.round(ratio * 100);
  // Semicircle: radius 30, stroke 7, viewBox 76x42
  const r = 30;
  const cx = 38;
  const cy = 36;
  const circumference = Math.PI * r; // half circle length
  const dash = circumference * ratio;
  return (
    <div className="relative shrink-0" style={{ width: 76, height: 44 }} aria-label={`${value} de ${total}`}>
      <svg width={76} height={44} viewBox="0 0 76 44">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={7}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: "stroke-dasharray 400ms ease" }}
        />
      </svg>
      <span className="absolute inset-x-0 bottom-0 text-center text-[10px] font-semibold tabular-nums text-muted-foreground">
        {pct}%
      </span>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border/60 rounded-[22px] p-4 shadow-card">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function InventoryMiniChart({ data }: { data: any[] }) {
  if (!data.length) return <p className="text-xs text-muted-foreground py-4 text-center">Nenhum item ainda.</p>;
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
                className={`h-full rounded-full ${low ? "bg-destructive" : "bg-gradient-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StockHealthCard({ total, lowCount }: { total: number; lowCount: number }) {
  const pct = total > 0 ? Math.round((lowCount / total) * 100) : 0;
  let level: "good" | "attention" | "critical" = "good";
  if (pct > 50) level = "critical";
  else if (pct >= 20) level = "attention";

  const cfg = {
    good: {
      label: "Bom nível",
      desc: "Estoque saudável",
      tone: "bg-success/15 text-success border-success/30",
      bar: "bg-success",
      dot: "bg-success",
    },
    attention: {
      label: "Atenção",
      desc: "Alguns itens precisam de reposição",
      tone: "bg-warning/15 text-warning border-warning/30",
      bar: "bg-warning",
      dot: "bg-warning",
    },
    critical: {
      label: "Crítico",
      desc: "Muitos itens em falta",
      tone: "bg-destructive/10 text-destructive border-destructive/30",
      bar: "bg-destructive",
      dot: "bg-destructive",
    },
  }[level];

  return (
    <Link
      to="/inventory"
      className="block bg-card border border-border/60 rounded-[22px] p-4 shadow-card active:scale-[0.99] transition-transform"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">Níveis de estoque</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{lowCount}/{total} em falta</span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground py-2 text-center">Nenhum item cadastrado.</p>
      ) : (
        <>
          <div className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${cfg.tone}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot} shadow-[0_0_0_3px_hsl(var(--background))]`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">{cfg.label}</p>
              <p className="text-[11px] opacity-80 truncate">{cfg.desc}</p>
            </div>
            <span className="text-base font-bold tabular-nums">{pct}%</span>
          </div>

          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-success/70" style={{ width: "20%" }} />
            <div className="h-full bg-warning/70" style={{ width: "30%" }} />
            <div className="h-full bg-destructive/70" style={{ width: "50%" }} />
          </div>
          <div className="relative mt-1 h-3">
            <div
              className="absolute -top-[7px] h-3 w-0.5 bg-foreground rounded-full"
              style={{ left: `calc(${Math.min(100, pct)}% - 1px)` }}
              aria-hidden
            />
          </div>

          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Bom &lt;20%</span>
            <span>Atenção 20-50%</span>
            <span>Crítico &gt;50%</span>
          </div>
        </>
      )}
    </Link>
  );
}