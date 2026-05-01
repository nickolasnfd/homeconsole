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

export default function Maintenance() {
  const { data = [], isLoading } = useTable<any>("maintenance", { column: "next_due_date" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

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

  return (
    <div className="space-y-3">
      {addButton}
      {data.map((m) => {
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
        return (
          <div
            key={m.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(m)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditing(m); }}
            className="bg-card border border-border/60 rounded-2xl p-4 shadow-card cursor-pointer active:scale-[0.997] transition-transform"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{m.title}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tone}`}>{label}</span>
                  <span className="text-xs text-muted-foreground">{freqLabel}</span>
                  <span className="text-xs text-muted-foreground">• {priorityLabel(m.priority_level)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Próxima: {formatDate(m.next_due_date)}</p>
              </div>
              <div className="flex flex-col gap-2">
                {!isDone && (
                  <button onClick={(e) => { e.stopPropagation(); complete(m); }} className="h-9 w-9 rounded-xl bg-success text-success-foreground active:scale-95 flex items-center justify-center" aria-label="Concluir">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); remove(m.id); }} className="h-9 w-9 rounded-xl bg-muted text-muted-foreground active:scale-95 flex items-center justify-center" aria-label="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
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