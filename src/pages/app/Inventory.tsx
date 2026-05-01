import { useMemo, useState } from "react";
import { useTable } from "@/hooks/useTable";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Minus, AlertTriangle, ShoppingCart, CalendarClock, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { AddItemButton } from "@/components/AddItemButton";
import { InventoryForm } from "@/components/forms/InventoryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Filter = "all" | "low" | "expiring";

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function Inventory() {
  const { data = [], isLoading } = useTable<any>("inventory", { column: "name" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const shoppingList = data.filter((i: any) => Number(i.current_qty) < Number(i.min_threshold));

  async function copyShoppingList() {
    if (shoppingList.length === 0) return;
    const text = shoppingList
      .map((i: any) => `- ${i.name}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Lista copiada para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar a lista");
    }
  }

  const expiringList = data.filter((i: any) => {
    const d = daysUntil(i.expires_at);
    return d !== null && d <= 7;
  });

  const filtered = useMemo(() => {
    let list = data as any[];
    if (filter === "low") list = shoppingList;
    else if (filter === "expiring") list = expiringList;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.category ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [data, filter, query, shoppingList, expiringList]);

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

  async function remove(item: any) {
    const prev = qc.getQueryData<any[]>(["inventory"]);
    qc.setQueriesData({ queryKey: ["inventory"] }, (old: any[] | undefined) =>
      (old ?? []).filter((it) => it.id !== item.id)
    );
    let undone = false;
    toast(`"${item.name}" removido`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          undone = true;
          qc.setQueriesData({ queryKey: ["inventory"] }, (old: any[] | undefined) => {
            const list = Array.isArray(old) ? [...old, item] : [item];
            return list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
          });
        },
      },
      duration: 5000,
    });
    setTimeout(async () => {
      if (undone) return;
      const { error } = await supabase.from("inventory").delete().eq("id", item.id);
      if (error) {
        qc.setQueryData(["inventory"], prev);
        toast.error(error.message);
      }
    }, 5200);
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
    <div className="space-y-3 pb-24">
      {addButton}

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar item ou categoria"
          className="pl-9 h-10 rounded-xl"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="grid grid-cols-3 w-full rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">Todos <span className="ml-1 text-[10px] text-muted-foreground">{data.length}</span></TabsTrigger>
          <TabsTrigger value="low" className="rounded-lg">Faltando <span className="ml-1 text-[10px] text-destructive">{shoppingList.length}</span></TabsTrigger>
          <TabsTrigger value="expiring" className="rounded-lg">Vencendo <span className="ml-1 text-[10px] text-warning">{expiringList.length}</span></TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum item nesta visão.</p>
        </div>
      )}

      {filtered.map((i) => {
        const low = Number(i.current_qty) < Number(i.min_threshold);
        const need = low ? Math.max(0, Number(i.min_threshold) - Number(i.current_qty)) : 0;
        const min = Number(i.min_threshold) || 0;
        const cur = Number(i.current_qty) || 0;
        const pct = min > 0 ? Math.min(100, Math.round((cur / min) * 100)) : 100;
        const exp = daysUntil(i.expires_at);
        const expired = exp !== null && exp < 0;
        const expiringSoon = exp !== null && exp >= 0 && exp <= 7;
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
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-muted-foreground">{i.category}</span>
                  {i.expires_at && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      expired ? "bg-destructive/15 text-destructive"
                      : expiringSoon ? "bg-warning/15 text-warning"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      <CalendarClock className="h-3 w-3" />
                      {expired ? "Vencido" : expiringSoon ? `${exp}d` : formatDate(i.expires_at)}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(i); }} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <Progress value={pct} className={`h-1.5 ${low ? "[&>div]:bg-destructive" : "[&>div]:bg-success"}`} />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[11px] font-medium ${low ? "text-destructive" : "text-muted-foreground"}`}>
                  {low ? `Faltam ${need} ${i.unit}` : "Estoque saudável"} · mín {i.min_threshold}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">Ajustar quantidade</span>
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

      {/* FAB carrinho */}
      <button
        onClick={() => setCartOpen(true)}
        aria-label="Abrir lista de compras"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 flex items-center justify-center"
      >
        <ShoppingCart className="h-6 w-6" />
        {shoppingList.length > 0 && (
          <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center border-2 border-background">
            {shoppingList.length}
          </span>
        )}
      </button>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border/60 max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" /> Lista de compras
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {shoppingList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tudo em ordem! Nenhum item abaixo do mínimo.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {shoppingList.map((i: any) => (
                    <li key={i.id} className="py-2.5 px-3 rounded-xl bg-muted/40">
                      <p className="truncate font-medium text-sm">{i.name}</p>
                      {i.category && (
                        <p className="text-[11px] text-muted-foreground">{i.category}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={copyShoppingList}
                  className="w-full mt-4 rounded-xl"
                  size="lg"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar lista
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

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