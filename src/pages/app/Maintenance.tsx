import { useTable } from "@/hooks/useTable";
import { addDaysISO, daysUntil, formatDate, todayISO } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Maintenance() {
  const { data = [], isLoading } = useTable<any>("maintenance", { column: "next_due_date" });
  const qc = useQueryClient();

  async function complete(m: any) {
    const today = todayISO();
    const next = addDaysISO(today, m.frequency_days || 30);
    const { error } = await supabase.from("maintenance")
      .update({ last_performed_date: today, next_due_date: next }).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success(`${m.title} concluída`);
    qc.invalidateQueries({ queryKey: ["maintenance"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("maintenance").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["maintenance"] });
  }

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-card rounded-2xl shadow-card animate-pulse" />)}</div>;
  if (!data.length) return <div className="text-center py-16"><p className="font-semibold">Nenhuma tarefa ainda</p><p className="text-sm text-muted-foreground mt-1">Toque em + para programar manutenções recorrentes.</p></div>;

  return (
    <div className="space-y-3">
      {data.map((m) => {
        const days = daysUntil(m.next_due_date);
        const overdue = days < 0;
        const critical = days < 7;
        const tone =
          overdue ? "bg-destructive/10 text-destructive" :
          critical ? "bg-warning/15 text-warning" :
          "bg-success/10 text-success";
        const label = overdue ? `${Math.abs(days)}d atrasada` : days === 0 ? "Vence hoje" : `Em ${days}d`;
        return (
          <div key={m.id} className="bg-card rounded-2xl p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{m.title}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tone}`}>{label}</span>
                  <span className="text-xs text-muted-foreground">A cada {m.frequency_days}d</span>
                  <span className="text-xs text-muted-foreground">• {priorityLabel(m.priority_level)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Próxima: {formatDate(m.next_due_date)}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => complete(m)} className="h-9 w-9 rounded-xl bg-success text-success-foreground active:scale-95 flex items-center justify-center" aria-label="Concluir">
                  <CheckCircle2 className="h-4 w-4" />
                </button>
                <button onClick={() => remove(m.id)} className="h-9 w-9 rounded-xl bg-muted text-muted-foreground active:scale-95 flex items-center justify-center" aria-label="Excluir">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function priorityLabel(p?: string) {
  if (p === "high") return "alta";
  if (p === "low") return "baixa";
  return "média";
}