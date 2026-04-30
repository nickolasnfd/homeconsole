import { useState } from "react";
import { useTable } from "@/hooks/useTable";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AddItemButton } from "@/components/AddItemButton";
import { FinanceForm } from "@/components/forms/FinanceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Finance() {
  const { data = [], isLoading } = useTable<any>("finances", { column: "due_date" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const pending = data.filter((f) => f.status === "pending");
  const paid = data.filter((f) => f.status === "paid");
  const pendingTotal = pending.reduce((s, f) => s + Number(f.amount || 0), 0);
  const paidTotal = paid.reduce((s, f) => s + Number(f.amount || 0), 0);

  async function toggle(f: any) {
    const next = f.status === "paid" ? "pending" : "paid";
    qc.setQueriesData({ queryKey: ["finances"] }, (old: any[] | undefined) =>
      (old ?? []).map((it) => (it.id === f.id ? { ...it, status: next } : it))
    );
    const { error } = await supabase.from("finances").update({ status: next }).eq("id", f.id);
    if (error) {
      qc.invalidateQueries({ queryKey: ["finances"] });
      return toast.error(error.message);
    }
  }

  async function remove(id: string) {
    const prev = qc.getQueryData<any[]>(["finances"]);
    qc.setQueriesData({ queryKey: ["finances"] }, (old: any[] | undefined) =>
      (old ?? []).filter((it) => it.id !== id)
    );
    const { error } = await supabase.from("finances").delete().eq("id", id);
    if (error) {
      qc.setQueryData(["finances"], prev);
      return toast.error(error.message);
    }
  }

  if (isLoading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-card rounded-2xl shadow-card animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <AddItemButton title="Nova despesa" label="Adicionar despesa">
        {(close) => <FinanceForm onDone={close} />}
      </AddItemButton>

      {/* Hero balance card */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-card border border-border/60 shadow-elevated p-5">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-2xl" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo do mês</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{formatCurrency(pendingTotal + paidTotal)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center">
              <ArrowUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(paidTotal)}</p>
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

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground font-medium">Pendente</p>
          <p className="text-xl font-bold text-destructive mt-1">{formatCurrency(pendingTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{pending.length} contas</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-card">
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
            <div
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => setEditing(f)}
              onKeyDown={(e) => { if (e.key === "Enter") setEditing(f); }}
              className="bg-card border border-border/60 rounded-2xl p-4 shadow-card flex items-center gap-3 cursor-pointer active:scale-[0.997] transition-transform"
            >
              <button
                onClick={(e) => { e.stopPropagation(); toggle(f); }}
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
                <button onClick={(e) => { e.stopPropagation(); remove(f.id); }} className="text-muted-foreground hover:text-destructive mt-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Editar despesa</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {editing && <FinanceForm initial={editing} onDone={() => setEditing(null)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}