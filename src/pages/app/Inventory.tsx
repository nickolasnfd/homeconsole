import { useState } from "react";
import { useTable } from "@/hooks/useTable";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Minus, AlertTriangle } from "lucide-react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { AddItemButton } from "@/components/AddItemButton";
import { InventoryForm } from "@/components/forms/InventoryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Inventory() {
  const { data = [], isLoading } = useTable<any>("inventory", { column: "name" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const shoppingList = data.filter((i: any) => Number(i.current_qty) < Number(i.min_threshold));

  async function adjust(id: string, current: number, delta: number) {
    const next = Math.max(0, Number(current) + delta);
    qc.setQueriesData({ queryKey: ["inventory"] }, (old: any[] | undefined) =>
      (old ?? []).map((it) => (it.id === id ? { ...it, current_qty: next } : it))
    );
    const { error } = await supabase.from("inventory").update({ current_qty: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    }
  }

  async function remove(id: string) {
    const prev = qc.getQueryData<any[]>(["inventory"]);
    qc.setQueriesData({ queryKey: ["inventory"] }, (old: any[] | undefined) =>
      (old ?? []).filter((it) => it.id !== id)
    );
    const { error } = await supabase.from("inventory").delete().eq("id", id);
    if (error) {
      qc.setQueryData(["inventory"], prev);
      return toast.error(error.message);
    }
    toast.success("Item removido");
  }

  const addButton = (
    <AddItemButton title="Novo item de estoque" label="Adicionar item">
      {(close) => <InventoryForm onDone={close} />}
    </AddItemButton>
  );

  if (isLoading) return <div className="space-y-3">{addButton}<Skeleton /></div>;
  if (!data.length) return (
    <div className="space-y-4">
      {addButton}
      <Empty title="Nenhum item ainda" body="Toque em adicionar para criar seu primeiro item." />
    </div>
  );

  return (
    <div className="space-y-3">
      {addButton}
      {shoppingList.length > 0 && (
        <Alert variant="destructive" className="rounded-2xl border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {shoppingList.length === 1
              ? "1 item abaixo do mínimo"
              : `${shoppingList.length} itens abaixo do mínimo`}
          </AlertTitle>
          <AlertDescription>
            Veja a lista de compras abaixo com a quantidade exata a comprar.
          </AlertDescription>
        </Alert>
      )}
      {data.map((i) => {
        const low = Number(i.current_qty) < Number(i.min_threshold);
        const need = low ? Math.max(0, Number(i.min_threshold) - Number(i.current_qty)) : 0;
        return (
          <div
            key={i.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditing(i)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditing(i); }}
            className={`bg-card border rounded-2xl p-4 shadow-card cursor-pointer active:scale-[0.997] transition-transform ${low ? "border-destructive/50" : "border-border/60"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{i.name}</p>
                  {low && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {i.category}{i.expires_at ? ` • val ${formatDate(i.expires_at)}` : ""}
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(i.id); }} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${low ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                {low ? `Faltam ${need} ${i.unit}` : "Saudável"} • mín {i.min_threshold}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); adjust(i.id, i.current_qty, -1); }} className="h-8 w-8 rounded-lg bg-muted active:scale-95 flex items-center justify-center">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-bold tabular-nums w-16 text-center">{i.current_qty} <span className="text-xs font-normal text-muted-foreground">{i.unit}</span></span>
                <button onClick={(e) => { e.stopPropagation(); adjust(i.id, i.current_qty, 1); }} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground active:scale-95 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-2 px-1">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Lista de compras</h2>
        </div>
        {shoppingList.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-card text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum item abaixo do mínimo. Tudo em ordem!
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-card">
            <p className="text-xs text-muted-foreground mb-3">
              {shoppingList.length} {shoppingList.length === 1 ? "item precisa ser comprado" : "itens precisam ser comprados"}
            </p>
            <ul className="space-y-1.5">
              {shoppingList.map((i: any) => {
                const need = Math.max(0, Number(i.min_threshold) - Number(i.current_qty));
                return (
                  <li key={i.id} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        atual {i.current_qty} {i.unit} • mín {i.min_threshold}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary tabular-nums shrink-0 ml-2">
                      comprar {need} {i.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-card border-border/60">
          <DialogHeader>
            <DialogTitle>Editar item</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {editing && (
              <InventoryForm initial={editing} onDone={() => setEditing(null)} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Skeleton() {
  return <div className="space-y-3">{[...Array(3)].map((_, i) => (
    <div key={i} className="h-24 bg-card rounded-2xl shadow-card animate-pulse" />
  ))}</div>;
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16">
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{body}</p>
    </div>
  );
}