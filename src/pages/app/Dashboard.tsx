import { useMemo, useState } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { AlertTriangle, Wrench, Package, Receipt, MessageSquare, Send } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { sendTelegramMessage } from "@/lib/telegram";
import { toast } from "sonner";

export default function Dashboard() {
  const inventory = useTable<any>("inventory", { column: "name" });
  const maintenance = useTable<any>("maintenance", { column: "next_due_date" });
  const finances = useTable<any>("finances", { column: "due_date" });
  const [sendingReport, setSendingReport] = useState(false);

  const lowStock = (inventory.data ?? []).filter((i) => Number(i.current_qty) < Number(i.min_threshold));
  const criticalMaint = (maintenance.data ?? []).filter((m) => daysUntil(m.next_due_date) < 7);
  const overdueMaint = (maintenance.data ?? []).filter((m) => !m.completed && daysUntil(m.next_due_date) < 0);
  const today = new Date();
  const pendingThisMonth = (finances.data ?? []).filter((f) => {
    if (f.status !== "pending") return false;
    const d = new Date(f.due_date);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  });
  const alerts = [
    overdueMaint.length > 0 && { to: "/maintenance", icon: Wrench, tone: "destructive" as const, label: `${overdueMaint.length} manutenç${overdueMaint.length === 1 ? "ão atrasada" : "ões atrasadas"}` },
    lowStock.length > 0 && { to: "/inventory", icon: Package, tone: "warning" as const, label: `${lowStock.length} ${lowStock.length === 1 ? "item em falta" : "itens em falta"}` },
    pendingThisMonth.length > 0 && { to: "/finance", icon: Receipt, tone: "primary" as const, label: `${pendingThisMonth.length} ${pendingThisMonth.length === 1 ? "conta pendente" : "contas pendentes"} este mês` },
  ].filter(Boolean) as { to: string; icon: any; tone: "destructive" | "warning" | "primary"; label: string }[];

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

  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    try {
      let text = `🏠 *CENTRAL RESIDENCIAL - STATUS GERAL*\n\n`;

      // 1. Finance Section
      if (pendingThisMonth.length > 0) {
        text += `🚨 *Finanças (Contas Pendentes):*\n`;
        pendingThisMonth.forEach((f) => {
          text += `• ${f.description}: _${formatCurrency(f.amount)}_ (Vence: ${formatDate(f.due_date)})\n`;
        });
        text += `\n`;
      } else {
        text += `🟢 *Finanças:* Todas as contas do mês estão pagas!\n\n`;
      }

      // 2. Inventory Section
      if (lowStock.length > 0) {
        text += `📦 *Estoque (Itens em Falta):*\n`;
        lowStock.forEach((i) => {
          text += `• ${i.name}: falta ${Number(i.min_threshold) - Number(i.current_qty)} ${i.unit} (Mín: ${i.min_threshold})\n`;
        });
        text += `\n`;
      } else {
        text += `🟢 *Estoque:* Nível de suprimentos saudável!\n\n`;
      }

      // 3. Maintenance Section
      const pendingTasks = (maintenance.data ?? []).filter((m) => !m.completed);
      if (pendingTasks.length > 0) {
        text += `🔧 *Manutenção (Tarefas Pendentes):*\n`;
        pendingTasks.forEach((m) => {
          const days = daysUntil(m.next_due_date);
          const statusText = days < 0 ? `🚨 ${Math.abs(days)}d atrasada` : days === 0 ? `⚠️ vence hoje` : `📅 em ${days}d`;
          text += `• ${m.title}: _${statusText}_\n`;
        });
      } else {
        text += `🟢 *Manutenção:* Nenhuma tarefa pendente!\n`;
      }

      await sendTelegramMessage(text);
      toast.success("Relatório de status enviado para o Telegram!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar relatório para o Telegram.");
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="space-y-5">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => {
            const Icon = a.icon;
            const toneCls =
              a.tone === "destructive" ? "bg-destructive/10 text-destructive border-destructive/30"
              : a.tone === "warning" ? "bg-warning/15 text-warning border-warning/30"
              : "bg-primary/10 text-primary border-primary/30";
            return (
              <Link key={i} to={a.to} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${toneCls} active:scale-[0.99] transition-transform`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold flex-1 min-w-0 truncate">{a.label}</span>
                <span className="text-xs opacity-70">Ver →</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Relatório Telegram Quick Action */}
      <div className="flex items-center justify-between gap-3 bg-card/40 backdrop-blur-md border border-border/60 rounded-[22px] p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">Relatório Telegram</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Envie o status residencial consolidado para seu celular</p>
          </div>
        </div>
        <button
          onClick={handleSendTelegramReport}
          disabled={sendingReport}
          className="h-8 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <Send className="h-3.5 w-3.5" />
          {sendingReport ? "Enviando..." : "Enviar"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
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
        </div>

        <div className="space-y-5">
          <StockHealthCard
            total={(inventory.data ?? []).length}
            lowCount={lowStock.length}
          />

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

        <div className="space-y-5">
          <MaintenanceDonutCard items={maintenance.data ?? []} />
        </div>
      </div>
    </div>
  );
}

function MaintenanceDonutCard({ items }: { items: any[] }) {
  const buckets = useMemo(() => {
    let overdue = 0, soon = 0, ok = 0, done = 0;
    items.forEach((m) => {
      if (m.completed) { done++; return; }
      const d = daysUntil(m.next_due_date);
      if (d < 0) overdue++;
      else if (d < 7) soon++;
      else ok++;
    });
    return { overdue, soon, ok, done };
  }, [items]);

  const total = items.length;
  const segments = [
    { key: "overdue", label: "Atrasadas", value: buckets.overdue, color: "hsl(var(--destructive))" },
    { key: "soon", label: "Próximas (7 dias)", value: buckets.soon, color: "hsl(var(--warning))" },
    { key: "ok", label: "Em dia", value: buckets.ok, color: "hsl(var(--primary))" },
    { key: "done", label: "Concluídas", value: buckets.done, color: "hsl(var(--success))" },
  ];

  // Donut math
  const size = 132;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;

  let offset = 0;
  const arcs = segments.map((s) => {
    const frac = total > 0 ? s.value / total : 0;
    const dash = frac * C;
    const arc = {
      ...s,
      dasharray: `${dash} ${C - dash}`,
      dashoffset: -offset,
    };
    offset += dash;
    return arc;
  });

  const headline = buckets.overdue > 0
    ? { label: "Atrasadas", value: buckets.overdue, tone: "text-destructive" }
    : buckets.soon > 0
    ? { label: "Próximas", value: buckets.soon, tone: "text-warning" }
    : { label: "Em dia", value: buckets.ok, tone: "text-success" };

  return (
    <Link
      to="/maintenance"
      className="block bg-card border border-border/60 rounded-[22px] p-4 shadow-card active:scale-[0.99] transition-transform"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Manutenções
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{total} no total</span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma manutenção cadastrada.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: size, height: size }} aria-label="Distribuição de manutenções por status">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
              {arcs.map((a) => a.value > 0 && (
                <circle
                  key={a.key}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={stroke}
                  strokeDasharray={a.dasharray}
                  strokeDashoffset={a.dashoffset}
                  strokeLinecap="butt"
                  style={{ transition: "stroke-dasharray 400ms ease" }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold tabular-nums leading-none ${headline.tone}`}>{headline.value}</span>
              <span className="text-[10px] text-muted-foreground mt-1">{headline.label}</span>
            </div>
          </div>

          <ul className="flex-1 min-w-0 space-y-1.5">
            {segments.map((s) => {
              const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
              return (
                <li key={s.key} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="flex-1 min-w-0 truncate text-muted-foreground">{s.label}</span>
                  <span className="font-semibold tabular-nums">{s.value}</span>
                  <span className="text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Link>
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