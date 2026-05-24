import { useMemo, useState } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatDate } from "@/lib/format";
import { AlertTriangle, Wrench, Package, MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { sendTelegramMessage } from "@/lib/telegram";
import { toast } from "sonner";

export default function Dashboard() {
  const inventory = useTable<any>("inventory", { column: "name" });
  const maintenance = useTable<any>("maintenance", { column: "next_due_date" });
  const [sendingReport, setSendingReport] = useState(false);

  const lowStock = (inventory.data ?? []).filter(
    (i) => Number(i.current_qty) < Number(i.min_threshold)
  );
  const criticalMaint = (maintenance.data ?? []).filter(
    (m) => daysUntil(m.next_due_date) < 7
  );
  const overdueMaint = (maintenance.data ?? []).filter(
    (m) => !m.completed && daysUntil(m.next_due_date) < 0
  );

  const alerts = [
    overdueMaint.length > 0 && {
      to: "/maintenance",
      tone: "red" as const,
      label: `${overdueMaint.length} manutenç${overdueMaint.length === 1 ? "ão atrasada" : "ões atrasadas"}`,
    },
    lowStock.length > 0 && {
      to: "/inventory",
      tone: "amber" as const,
      label: `${lowStock.length} ${lowStock.length === 1 ? "item em falta" : "itens em falta"}`,
    },
  ].filter(Boolean) as { to: string; tone: "red" | "amber"; label: string }[];

  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    try {
      let text = `🏠 *CENTRAL RESIDENCIAL - STATUS GERAL*\n\n`;
      if (lowStock.length > 0) {
        text += `📦 *Estoque (Itens em Falta):*\n`;
        lowStock.forEach((i) => {
          text += `• ${i.name}: falta ${Number(i.min_threshold) - Number(i.current_qty)} ${i.unit} (Mín: ${i.min_threshold})\n`;
        });
        text += `\n`;
      } else {
        text += `🟢 *Estoque:* Nível de suprimentos saudável!\n\n`;
      }
      const pendingTasks = (maintenance.data ?? []).filter((m) => !m.completed);
      if (pendingTasks.length > 0) {
        text += `🔧 *Manutenção (Tarefas Pendentes):*\n`;
        pendingTasks.forEach((m) => {
          const days = daysUntil(m.next_due_date);
          const statusText =
            days < 0 ? `🚨 ${Math.abs(days)}d atrasada`
            : days === 0 ? `⚠️ vence hoje`
            : `📅 em ${days}d`;
          text += `• ${m.title}: _${statusText}_\n`;
        });
      } else {
        text += `🟢 *Manutenção:* Nenhuma tarefa pendente!\n`;
      }
      await sendTelegramMessage(text);
      toast.success("Relatório enviado para o Telegram!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar relatório.");
    } finally {
      setSendingReport(false);
    }
  };

  const invTotal = (inventory.data ?? []).length;
  const maintData = maintenance.data ?? [];

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              to={a.to}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 active:scale-[0.99] transition-transform ${
                a.tone === "red"
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-warning/10 border-warning/20 text-warning"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  a.tone === "red"
                    ? "bg-destructive shadow-[0_0_6px_hsl(0_100%_64%)]"
                    : "bg-warning"
                }`}
              />
              <span className="font-body text-sm font-medium flex-1 min-w-0 truncate">
                {a.label}
              </span>
              <span className="font-body text-xs opacity-60">›</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Estoque"
          value={invTotal}
          sub={lowStock.length > 0 ? `${lowStock.length} abaixo do mínimo` : "todos em ordem"}
          tone={lowStock.length > 0 ? "red" : "cyan"}
          pct={invTotal > 0 ? Math.round((lowStock.length / invTotal) * 100) : 0}
          to="/inventory"
        />
        <MaintStatCard items={maintData} />
      </div>

      {/* Relatório Telegram */}
      <div className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <MessageSquare className="h-4 w-4 text-sky-400" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-foreground">Relatório Telegram</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">
            Status consolidado para o celular
          </p>
        </div>
        <button
          onClick={handleSendTelegramReport}
          disabled={sendingReport}
          className="h-8 px-3.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400 font-body text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          {sendingReport ? "..." : "Enviar"}
        </button>
      </div>

      {/* Tarefas críticas */}
      {criticalMaint.length > 0 && (
        <div className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight space-y-1">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Próximas 7 dias
            </h2>
            <span className="label-upper text-muted-foreground">{criticalMaint.length} tarefa{criticalMaint.length !== 1 ? "s" : ""}</span>
          </div>
          {criticalMaint.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-t border-primary/5 first:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-medium truncate">{m.title}</p>
                <p className="font-body text-[11px] text-muted-foreground">
                  Vence {formatDate(m.next_due_date)}
                </p>
              </div>
              <AlertTriangle className="h-3.5 w-3.5 text-warning ml-3 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, tone, pct, to,
}: {
  label: string; value: number; sub: string;
  tone: "cyan" | "red" | "amber"; pct: number; to: string;
}) {
  const valueColor =
    tone === "red" ? "text-destructive"
    : tone === "amber" ? "text-warning"
    : "text-primary";
  const barColor =
    tone === "red" ? "bg-destructive"
    : tone === "amber" ? "bg-warning"
    : "bg-primary";

  return (
    <Link
      to={to}
      className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight block active:scale-[0.98] transition-transform"
    >
      <p className="label-upper text-muted-foreground mb-2">{label}</p>
      <p className={`font-display text-4xl font-bold leading-none ${valueColor}`}>{value}</p>
      <p className="font-body text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>
      <div className="mt-3 h-[3px] bg-primary/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, pct || (value > 0 ? 100 : 0))}%` }}
        />
      </div>
    </Link>
  );
}

function MaintStatCard({ items }: { items: any[] }) {
  const { overdue, soon, ok, done } = useMemo(() => {
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

  const headline =
    overdue > 0 ? { value: overdue, label: "Atrasadas", cls: "text-destructive" }
    : soon > 0  ? { value: soon,   label: "Em breve",  cls: "text-warning" }
    : { value: ok, label: "Em dia", cls: "text-success" };

  return (
    <Link
      to="/maintenance"
      className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight block active:scale-[0.98] transition-transform"
    >
      <p className="label-upper text-muted-foreground mb-2">Manutenção</p>
      <p className={`font-display text-4xl font-bold leading-none ${headline.cls}`}>
        {headline.value}
      </p>
      <p className="font-body text-[11px] text-muted-foreground mt-1.5">{headline.label}</p>
      <div className="mt-3 flex gap-1">
        {overdue > 0 && (
          <div
            className="h-[3px] rounded-full bg-destructive"
            style={{ flex: overdue }}
          />
        )}
        {soon > 0 && (
          <div className="h-[3px] rounded-full bg-warning" style={{ flex: soon }} />
        )}
        {ok > 0 && (
          <div className="h-[3px] rounded-full bg-success" style={{ flex: ok }} />
        )}
        {done > 0 && (
          <div
            className="h-[3px] rounded-full bg-muted-foreground/30"
            style={{ flex: done }}
          />
        )}
        {items.length === 0 && (
          <div className="h-[3px] rounded-full bg-primary/5 flex-1" />
        )}
      </div>
    </Link>
  );
}
