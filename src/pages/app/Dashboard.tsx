import { useMemo, useState } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatDate } from "@/lib/format";
import { AlertTriangle, Wrench, Package, MessageSquare, Send, ChevronRight, CheckCircle2, SlidersHorizontal, Eye, EyeOff, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { sendTelegramMessage } from "@/lib/telegram";
import { toast } from "sonner";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CARD_SECTIONS = [
  { id: "heroMetrics", label: "Métricas rápidas" },
  { id: "alerts", label: "Alertas ativos" },
  { id: "telegram", label: "Relatório Telegram" },
  { id: "stockHealth", label: "Saúde do estoque" },
  { id: "upcoming", label: "Tarefas próximas" },
  { id: "donut", label: "Gráfico de manutenção" },
] as const;

type CardId = (typeof CARD_SECTIONS)[number]["id"];
const DEFAULT_ORDER: CardId[] = CARD_SECTIONS.map((s) => s.id);

function SortableItem({ id, label, visible, onToggle }: { id: CardId; label: string; visible: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
        {visible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground/40" />
        )}
        <span className={`text-sm font-medium ${!visible ? "text-muted-foreground/50" : ""}`}>{label}</span>
      </div>
      <Switch checked={visible} onCheckedChange={onToggle} />
    </div>
  );
}

export default function Dashboard() {
  const inventory = useTable<any>("inventory", { column: "name" });
  const maintenance = useTable<any>("maintenance", { column: "next_due_date" });
  const [sendingReport, setSendingReport] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [hiddenCards, setHiddenCards] = useLocalStorage<CardId[]>("dashboard:hidden_cards", []);
  const [cardOrder, setCardOrder] = useLocalStorage<CardId[]>("dashboard:card_order", DEFAULT_ORDER);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const isVisible = (id: CardId) => !hiddenCards.includes(id);
  const toggleCard = (id: CardId) =>
    setHiddenCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as CardId);
      const newIndex = cardOrder.indexOf(over.id as CardId);
      setCardOrder(arrayMove(cardOrder, oldIndex, newIndex));
    }
  };

  const lowStock = (inventory.data ?? []).filter((i) => Number(i.current_qty) < Number(i.min_threshold));
  const criticalMaint = (maintenance.data ?? []).filter((m) => !m.completed && daysUntil(m.next_due_date) < 7);
  const overdueMaint = (maintenance.data ?? []).filter((m) => !m.completed && daysUntil(m.next_due_date) < 0);
  const okMaint = (maintenance.data ?? []).filter((m) => !m.completed && daysUntil(m.next_due_date) >= 7);

  const alerts = [
    overdueMaint.length > 0 && { to: "/maintenance", icon: Wrench, tone: "destructive" as const, label: `${overdueMaint.length} manutenç${overdueMaint.length === 1 ? "ão atrasada" : "ões atrasadas"}` },
    lowStock.length > 0 && { to: "/inventory", icon: Package, tone: "warning" as const, label: `${lowStock.length} ${lowStock.length === 1 ? "item em falta" : "itens em falta"}` },
  ].filter(Boolean) as { to: string; icon: any; tone: "destructive" | "warning" | "primary"; label: string }[];

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
    <div className="space-y-5 animate-fade-up">
      {/* Personalizar button */}
      <div className="flex justify-end">
        <button
          onClick={() => setCustomizing(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted/40 cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Personalizar
          {hiddenCards.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
              {hiddenCards.length}
            </span>
          )}
        </button>
      </div>

      {cardOrder.map((id) => {
        if (!isVisible(id)) return null;
        switch (id) {
          case "heroMetrics":
            return (
              <HeroMetrics
                key={id}
                lowStock={lowStock.length}
                overdue={overdueMaint.length}
                critical={criticalMaint.length}
                ok={okMaint.length}
              />
            );
          case "alerts":
            if (alerts.length === 0) return null;
            return (
              <div key={id} className="space-y-2">
                {alerts.map((a, i) => {
                  const Icon = a.icon;
                  const toneCls =
                    a.tone === "destructive"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-warning/10 text-warning border-warning/30";
                  const iconBg = a.tone === "destructive" ? "bg-destructive/15" : "bg-warning/15";
                  return (
                    <Link
                      key={i}
                      to={a.to}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${toneCls} active:scale-[0.99] transition-all hover:shadow-card`}
                    >
                      <div className={`h-8 w-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </div>
                      <span className="text-sm font-semibold flex-1 min-w-0 truncate">{a.label}</span>
                      <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
                    </Link>
                  );
                })}
              </div>
            );
          case "telegram":
            return (
              <div key={id} className="flex items-center justify-between gap-3 bg-gradient-hero border border-primary/10 rounded-[22px] p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Relatório Telegram</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Status residencial consolidado</p>
                  </div>
                </div>
                <button
                  onClick={handleSendTelegramReport}
                  disabled={sendingReport}
                  className="h-9 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingReport ? "Enviando..." : "Enviar"}
                </button>
              </div>
            );
          case "stockHealth":
            return (
              <StockHealthCard
                key={id}
                total={(inventory.data ?? []).length}
                lowCount={lowStock.length}
              />
            );
          case "upcoming":
            if (criticalMaint.length === 0) return null;
            return (
              <Section key={id} title="Tarefas próximas" subtitle="Próximos 7 dias">
                <div className="space-y-2">
                  {criticalMaint.slice(0, 3).map((m) => {
                    const days = daysUntil(m.next_due_date);
                    const isOverdue = days < 0;
                    return (
                      <div key={m.id} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/15" : "bg-warning/15"}`}>
                          <AlertTriangle className={`h-4 w-4 ${isOverdue ? "text-destructive" : "text-warning"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {isOverdue ? `${Math.abs(days)}d atrasada` : days === 0 ? "Vence hoje" : `Em ${days}d`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            );
          case "donut":
            return <MaintenanceDonutCard key={id} items={maintenance.data ?? []} />;
          default:
            return null;
        }
      })}

      {/* Sheet de personalização */}
      <Sheet open={customizing} onOpenChange={setCustomizing}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border/60 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-2">
            <SheetTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Personalizar painel
            </SheetTitle>
            <p className="text-xs text-muted-foreground">Arraste para reordenar · alterne para mostrar/ocultar</p>
          </SheetHeader>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 py-2">
                {cardOrder.map((id) => {
                  const section = CARD_SECTIONS.find((s) => s.id === id);
                  if (!section) return null;
                  return (
                    <SortableItem
                      key={id}
                      id={id}
                      label={section.label}
                      visible={isVisible(id)}
                      onToggle={() => toggleCard(id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          <div className="border-t border-border/40 pt-3 mt-2 flex gap-2">
            {hiddenCards.length > 0 && (
              <button
                onClick={() => setHiddenCards([])}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer text-center"
              >
                Mostrar tudo
              </button>
            )}
            <button
              onClick={() => { setCardOrder(DEFAULT_ORDER); }}
              className="flex-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer text-center"
            >
              Ordem padrão
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HeroMetrics({ lowStock, overdue, critical, ok }: { lowStock: number; overdue: number; critical: number; ok: number }) {
  const metrics = [
    {
      label: "Em falta",
      value: lowStock,
      to: "/inventory",
      icon: Package,
      tone: lowStock > 0 ? "text-destructive" : "text-success",
      bg: lowStock > 0 ? "bg-destructive/10" : "bg-success/10",
    },
    {
      label: "Atrasadas",
      value: overdue,
      to: "/maintenance",
      icon: Wrench,
      tone: overdue > 0 ? "text-destructive" : "text-success",
      bg: overdue > 0 ? "bg-destructive/10" : "bg-success/10",
    },
    {
      label: "Em 7 dias",
      value: critical,
      to: "/maintenance",
      icon: AlertTriangle,
      tone: critical > 0 ? "text-warning" : "text-success",
      bg: critical > 0 ? "bg-warning/10" : "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {metrics.map((m) => (
        <Link
          key={m.label}
          to={m.to}
          className="bg-card border border-border/60 rounded-2xl p-3.5 shadow-card active:scale-[0.97] transition-all hover:shadow-elevated hover:border-primary/20 flex flex-col gap-2.5"
        >
          <div className={`h-8 w-8 rounded-xl ${m.bg} flex items-center justify-center`}>
            <m.icon className={`h-4 w-4 ${m.tone}`} strokeWidth={2.2} />
          </div>
          <div>
            <p className={`text-2xl font-bold tabular-nums leading-none ${m.tone}`}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{m.label}</p>
          </div>
        </Link>
      ))}
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
    { key: "soon", label: "Próximas (7d)", value: buckets.soon, color: "hsl(var(--warning))" },
    { key: "ok", label: "Em dia", value: buckets.ok, color: "hsl(var(--primary))" },
    { key: "done", label: "Concluídas", value: buckets.done, color: "hsl(var(--success))" },
  ];

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
    const arc = { ...s, dasharray: `${dash} ${C - dash}`, dashoffset: -offset };
    offset += dash;
    return arc;
  });

  const headline =
    buckets.overdue > 0
      ? { label: "Atrasadas", value: buckets.overdue, tone: "text-destructive" }
      : buckets.soon > 0
      ? { label: "Próximas", value: buckets.soon, tone: "text-warning" }
      : total === 0
      ? { label: "Sem tarefas", value: 0, tone: "text-muted-foreground" }
      : { label: "Em dia", value: buckets.ok, tone: "text-success" };

  return (
    <Link
      to="/maintenance"
      className="block bg-card border border-border/60 rounded-[22px] p-4 shadow-card active:scale-[0.99] transition-all hover:shadow-elevated hover:border-primary/20"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          Manutenções
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{total} no total</span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground/50">
          <CheckCircle2 className="h-8 w-8" />
          <p className="text-xs text-muted-foreground">Nenhuma manutenção cadastrada.</p>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
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
              <span className="text-[10px] text-muted-foreground mt-1 text-center px-2">{headline.label}</span>
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
      dot: "bg-success",
    },
    attention: {
      label: "Atenção",
      desc: "Alguns itens precisam de reposição",
      tone: "bg-warning/15 text-warning border-warning/30",
      dot: "bg-warning",
    },
    critical: {
      label: "Crítico",
      desc: "Muitos itens em falta",
      tone: "bg-destructive/10 text-destructive border-destructive/30",
      dot: "bg-destructive",
    },
  }[level];

  return (
    <Link
      to="/inventory"
      className="block bg-card border border-border/60 rounded-[22px] p-4 shadow-card active:scale-[0.99] transition-all hover:shadow-elevated hover:border-primary/20"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold">Níveis de estoque</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">{lowCount}/{total} em falta</span>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-2 text-muted-foreground/50">
          <Package className="h-8 w-8" />
          <p className="text-xs text-muted-foreground">Nenhum item cadastrado.</p>
        </div>
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
              className="absolute -top-[7px] h-3 w-0.5 bg-foreground rounded-full transition-all duration-500"
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
