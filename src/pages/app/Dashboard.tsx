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
      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-card border border-border/60 shadow-elevated p-5">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo do mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{formatCurrency(pendingTotal + finances.data?.filter((f:any)=>f.status==="paid").reduce((s:number,f:any)=>s+Number(f.amount||0),0) || 0)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center">
              <ArrowUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-bold tabular-nums">{formatCurrency((finances.data ?? []).filter((f:any)=>f.status==="paid").reduce((s:number,f:any)=>s+Number(f.amount||0),0))}</p>
              <p className="text-[10px] text-muted-foreground">Pago</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-destructive/15 flex items-center justify-center">
              <ArrowDown className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(pendingTotal)}</p>
              <p className="text-[10px] text-muted-foreground">Pendente</p>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-card border border-border/60 rounded-[22px] p-3 shadow-card">
        <div className="flex items-baseline justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold">Status geral</h2>
          <span className="text-[11px] text-muted-foreground">Toque para ver</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <MiniStat
            to="/maintenance"
            icon={<Wrench className="h-3.5 w-3.5" />}
            label="Manut."
            value={criticalMaint.length}
            total={(maintenance.data ?? []).length}
            tone={criticalMaint.length ? "danger" : "success"}
          />
          <MiniStat
            to="/inventory"
            icon={<Package className="h-3.5 w-3.5" />}
            label="Estoque"
            value={lowStock.length}
            total={(inventory.data ?? []).length}
            tone={lowStock.length ? "warning" : "success"}
          />
          <MiniStat
            to="/finance"
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="Contas"
            value={pendingBills.length}
            total={(finances.data ?? []).length}
            tone={pendingBills.length ? "danger" : "success"}
          />
        </div>
      </section>

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

      <Section title="Níveis de estoque" subtitle="Top 5 itens">
        <InventoryMiniChart data={(inventory.data ?? []).slice(0, 5)} />
      </Section>

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

function MiniStat({ to, icon, label, value, total, tone }: {
  to: string; icon: React.ReactNode; label: string; value: number; total: number;
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
      className="flex flex-col items-center gap-1 rounded-2xl p-2 active:scale-[0.97] transition-transform"
    >
      <div className="relative">
        <HalfMoonGauge value={value} total={total} stroke={stroke} />
        <div className={`absolute left-1/2 -translate-x-1/2 top-1 h-6 w-6 rounded-full flex items-center justify-center ${ring}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold leading-none tabular-nums">{value}</span>
        <span className="text-[10px] text-muted-foreground">/{total}</span>
      </div>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
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