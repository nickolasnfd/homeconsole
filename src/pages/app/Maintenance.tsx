import { useState } from "react";
import { useTable } from "@/hooks/useTable";
import { addFrequencyISO, daysUntil, formatDate, todayISO } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddItemButton } from "@/components/AddItemButton";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Maintenance() {
  const { data = [], isLoading } = useTable<any>("maintenance", { column: "next_due_date" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<"all" | "overdue" | "soon" | "ok" | "done">("all");

  async function complete(m: any) {
    const today = todayISO();
    const isOneTime = m.task_type === "one_time";
    const unit = (m.frequency_unit === "months" ? "months" : "days") as "days" | "months";
    const amount = unit === "months" ? Math.max(1, Math.round((m.frequency_days || 30) / 30)) : (m.frequency_days || 30);
    // Lógica inteligente: se concluiu adiantado (antes do vencimento), mantém o ritmo
    // calculando a partir do vencimento original. Se concluiu atrasado, parte de hoje
    // para evitar acumular atrasos.
    const base = !isOneTime && m.next_due_date && m.next_due_date >= today ? m.next_due_date : today;
    const update = isOneTime
      ? { last_performed_date: today, completed: true }
      : { last_performed_date: today, next_due_date: addFrequencyISO(base, amount, unit), completed: false };
    qc.setQueriesData({ queryKey: ["maintenance"] }, (old: any[] | undefined) =>
      (old ?? []).map((it) => (it.id === m.id ? { ...it, ...update } : it))
    );
    const { error } = await supabase.from("maintenance").update(update).eq("id", m.id);
    if (error) {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      return toast.error(error.message);
    }
    if (isOneTime) {
      toast.success(`${m.title} concluída`);
    } else {
      const wasEarly = m.next_due_date && m.next_due_date > today;
      toast.success(
        `${m.title} concluída • próxima ${formatDate(update.next_due_date as string)}${wasEarly ? " (ritmo mantido)" : ""}`
      );
    }
  }

  async function remove(id: string) {
    const prev = qc.getQueryData<any[]>(["maintenance"]);
    qc.setQueriesData({ queryKey: ["maintenance"] }, (old: any[] | undefined) =>
      (old ?? []).filter((it) => it.id !== id)
    );
    const { error } = await supabase.from("maintenance").delete().eq("id", id);
    if (error) {
      qc.setQueryData(["maintenance"], prev);
      return toast.error(error.message);
    }
  }

  const addButton = (
    <AddItemButton title="Nova tarefa de manutenção" label="Adicionar tarefa">
      {(close) => <MaintenanceForm onDone={close} />}
    </AddItemButton>
  );

  if (isLoading) return <div className="space-y-3">{addButton}{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl shadow-card animate-pulse" />)}</div>;
  if (!data.length) return (
    <div className="space-y-4">
      {addButton}
      <div className="text-center py-12"><p className="font-semibold">Nenhuma tarefa ainda</p><p className="text-sm text-muted-foreground mt-1">Toque em adicionar para programar manutenções recorrentes.</p></div>
    </div>
  );

  const bucket = (m: any): "overdue" | "soon" | "ok" | "done" => {
    const isOneTime = m.task_type === "one_time";
    if (isOneTime && m.completed) return "done";
    const d = daysUntil(m.next_due_date);
    if (d < 0) return "overdue";
    if (d < 7) return "soon";
    return "ok";
  };
  const counts = { overdue: 0, soon: 0, ok: 0, done: 0 } as Record<string, number>;
  data.forEach((m) => { counts[bucket(m)]++; });
  const visible = filter === "all" ? data : data.filter((m) => bucket(m) === filter);

  return (
    <div className="space-y-3">
      {addButton}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid grid-cols-5 w-full h-auto rounded-xl bg-card/60 border border-primary/10 p-1">
          <TabsTrigger value="all" className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20">Todas<span className="ml-1 opacity-60">{data.length}</span></TabsTrigger>
          <TabsTrigger value="overdue" className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20">Atrasadas<span className="ml-1 opacity-60">{counts.overdue}</span></TabsTrigger>
          <TabsTrigger value="soon" className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20">7 dias<span className="ml-1 opacity-60">{counts.soon}</span></TabsTrigger>
          <TabsTrigger value="ok" className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20">Em dia<span className="ml-1 opacity-60">{counts.ok}</span></TabsTrigger>
          <TabsTrigger value="done" className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20">Feitas<span className="ml-1 opacity-60">{counts.done}</span></TabsTrigger>
        </TabsList>
        <TabsContent value={filter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
      {visible.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8 sm:col-span-2 lg:col-span-3">Nenhuma tarefa neste filtro.</p>
      ) : visible.map((m) => {
        const isOneTime = m.task_type === "one_time";
        const isDone = isOneTime && m.completed;
        const days = daysUntil(m.next_due_date);
        const overdue = !isDone && days < 0;
        const critical = !isDone && days < 7;
        const tone = isDone
          ? "bg-muted text-muted-foreground"
          : overdue ? "bg-destructive/10 text-destructive"
          : critical ? "bg-warning/15 text-warning"
          : "bg-success/10 text-success";
        const label = isDone
          ? "Concluída"
          : overdue ? `${Math.abs(days)}d atrasada`
          : days === 0 ? "Vence hoje"
          : `Em ${days}d`;
        const freqLabel = isOneTime
          ? "Única"
          : m.frequency_unit === "months"
            ? `A cada ${Math.max(1, Math.round((m.frequency_days || 30) / 30))} mês(es)`
            : `A cada ${m.frequency_days}d`;
        const barClass =
          isDone ? "status-bar status-bar-muted"
          : overdue ? "status-bar status-bar-red"
          : critical ? "status-bar status-bar-amber"
          : "status-bar status-bar-green";
        return (
          <div
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(m)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditing(m); }}
            className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-3.5 cursor-pointer card-highlight active:scale-[0.99] transition-transform flex gap-3"
          >
            {/* Barra lateral de status */}
            <div className={barClass} />

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="font-body font-semibold text-sm">{m.title}</p>
              {m.description && (
                <p className="font-body text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {m.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`badge ${
                  isDone ? "badge-cyan"
                  : overdue ? "badge-red"
                  : critical ? "badge-amber"
                  : "badge-green"
                }`}>{label}</span>
                <span className="font-body text-[10px] text-muted-foreground">{freqLabel}</span>
                <span className="font-body text-[10px] text-muted-foreground">· {priorityLabel(m.priority_level)}</span>
              </div>
              <p className="font-body text-[10px] text-muted-foreground mt-1.5">
                Próxima: {formatDate(m.next_due_date)}
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-1.5 shrink-0">
              {!isDone && (
                <button
                  onClick={(e) => { e.stopPropagation(); complete(m); }}
                  className="h-8 w-8 rounded-lg bg-success/10 border border-success/25 text-success flex items-center justify-center active:scale-95 transition-all hover:bg-success/20"
                  aria-label="Concluir"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                className="h-8 w-8 rounded-lg bg-card border border-primary/10 text-muted-foreground flex items-center justify-center active:scale-95 transition-all hover:text-destructive hover:border-destructive/20"
                aria-label="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
        </TabsContent>
      </Tabs>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Editar manutenção</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {editing && <MaintenanceForm initial={editing} onDone={() => setEditing(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function priorityLabel(p?: string) {
  if (p === "high") return "alta";
  if (p === "low") return "baixa";
  return "média";
}