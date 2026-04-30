import { useTable } from "@/hooks/useTable";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Finance() {
  const { data = [], isLoading } = useTable<any>("finances", { column: "due_date" });
  const qc = useQueryClient();

  const pending = data.filter((f) => f.status === "pending");
  const paid = data.filter((f) => f.status === "paid");
  const pendingTotal = pending.reduce((s, f) => s + Number(f.amount || 0), 0);
  const paidTotal = paid.reduce((s, f) => s + Number(f.amount || 0), 0);

  async function toggle(f: any) {
    const next = f.status === "paid" ? "pending" : "paid";
    const { error } = await supabase.from("finances").update({ status: next }).eq("id", f.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["finances"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("finances").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["finances"] });
  }

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl shadow-card animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Pendente</p>
          <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(pendingTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{pending.length} contas</p>
        </div>
        <div className="bg-card rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Pago</p>
          <p className="text-xl font-bold text-success mt-1">{formatCurrency(paidTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{paid.length} contas</p>
        </div>
      </div>

      {!data.length ? (
        <div className="text-center py-16">
          <p className="font-semibold">Nenhuma despesa ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Toque em + para registrar uma conta ou despesa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((f) => (
            <div key={f.id} className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-3">
              <button
                onClick={() => toggle(f)}
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  f.status === "paid" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {f.status === "paid" ? "✓" : "!"}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{f.description}</p>
                <p className="text-xs text-muted-foreground">{f.category} • {formatDate(f.due_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{formatCurrency(Number(f.amount))}</p>
                <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive mt-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}