import { useState } from "react";
import { useTable } from "@/hooks/useTable";
import { formatCurrency, formatDate, addFrequencyISO, todayISO } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Repeat, CalendarClock } from "lucide-react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AddItemButton } from "@/components/AddItemButton";
import { FinanceForm } from "@/components/forms/FinanceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Finance() {
  const { data = [], isLoading } = useTable<any>("finances", { column: "due_date" });
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [filter, setFilter] = useState<"current" | "next" | "all">("current");

  // Janela do mês atual e do próximo mês
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const nextMonthDate = new Date(curYear, curMonth + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();

  const inMonth = (iso: string | null | undefined, y: number, m: number) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === y && d.getMonth() === m;
  };

  const currentMonthItems = data.filter((f) => inMonth(f.due_date, curYear, curMonth));
  const pending = currentMonthItems.filter((f) => f.status === "pending");
  const paid = currentMonthItems.filter((f) => f.status === "paid");
  const pendingTotal = pending.reduce((s, f) => s + Number(f.amount || 0), 0);
  const paidTotal = paid.reduce((s, f) => s + Number(f.amount || 0), 0);

  // Próximo mês: despesas já cadastradas + projeção das recorrentes do mês atual
  // Toda despesa recorrente é considerada no próximo mês: se já existir uma ocorrência
  // cadastrada para o próximo mês, conta a real; caso contrário, projeta a partir da
  // ocorrência mais recente da mesma série (agrupada por descrição+categoria).
  const nextMonthExisting = data.filter((f) => inMonth(f.due_date, nextYear, nextMonth));

  // Agrupa recorrentes por "série" (descrição + categoria) e pega a ocorrência mais recente
  const recurringSeries = new Map<string, any>();
  for (const f of data) {
    if (!f.frequency_value) continue;
    const key = `${f.description}__${f.category}`;
    const current = recurringSeries.get(key);
    if (!current || String(f.due_date) > String(current.due_date)) {
      recurringSeries.set(key, f);
    }
  }

  const projectedRecurring: any[] = [];
  for (const [key, f] of recurringSeries) {
    // Se já existe uma ocorrência real cadastrada no próximo mês para esta série, pula
    const alreadyInNext = nextMonthExisting.some(
      (e) => `${e.description}__${e.category}` === key
    );
    if (alreadyInNext) continue;

    const unit = (f.frequency_unit === "months" ? "months" : "days") as "days" | "months";
    const amount = Math.max(1, Number(f.frequency_value) || 1);
    // Avança a data até cair no próximo mês (ou ultrapassá-lo)
    let projectedDue = f.due_date;
    let safety = 0;
    while (
      new Date(projectedDue) < nextMonthDate ||
      !inMonth(projectedDue, nextYear, nextMonth)
    ) {
      const advanced = addFrequencyISO(projectedDue, amount, unit);
      if (advanced === projectedDue) break;
      projectedDue = advanced;
      // Se passamos do próximo mês sem cair nele, paramos
      const d = new Date(projectedDue);
      if (d.getFullYear() > nextYear || (d.getFullYear() === nextYear && d.getMonth() > nextMonth)) {
        break;
      }
      if (++safety > 60) break;
    }
    if (inMonth(projectedDue, nextYear, nextMonth)) {
      projectedRecurring.push({ ...f, due_date: projectedDue, _projected: true });
    }
  }

  const nextMonthItems = [...nextMonthExisting, ...projectedRecurring];
  const nextMonthTotal = nextMonthItems.reduce((s, f) => s + Number(f.amount || 0), 0);
  const nextMonthLabel = nextMonthDate.toLocaleDateString("pt-BR", { month: "long" });

  const visibleItems =
    filter === "current" ? currentMonthItems
    : filter === "next" ? nextMonthItems
    : data;

  async function toggle(f: any) {
    const next = f.status === "paid" ? "pending" : "paid";
    const isRecurring = !!f.frequency_value;
    const today = todayISO();

    qc.setQueriesData({ queryKey: ["finances"] }, (old: any[] | undefined) =>
      (old ?? []).map((it) => (it.id === f.id ? { ...it, status: next, last_paid_date: next === "paid" ? today : it.last_paid_date } : it))
    );
    const { error } = await supabase
      .from("finances")
      .update({ status: next, last_paid_date: next === "paid" ? today : null })
      .eq("id", f.id);
    if (error) {
      qc.invalidateQueries({ queryKey: ["finances"] });
      return toast.error(error.message);
    }

    // Se recorrente e foi marcada como paga, gera a próxima ocorrência a partir do vencimento original
    if (isRecurring && next === "paid") {
      const unit = (f.frequency_unit === "months" ? "months" : "days") as "days" | "months";
      const amount = Math.max(1, Number(f.frequency_value) || 1);
      const nextDue = addFrequencyISO(f.due_date, amount, unit);
      const newRow = {
        description: f.description,
        amount: Number(f.amount) || 0,
        due_date: nextDue,
        status: "pending",
        category: f.category,
        frequency_value: amount,
        frequency_unit: unit,
      };
      const { data: created, error: createErr } = await supabase
        .from("finances")
        .insert(newRow)
        .select()
        .single();
      if (createErr) {
        toast.error("Não foi possível gerar a próxima ocorrência");
      } else {
        qc.setQueriesData({ queryKey: ["finances"] }, (old: any[] | undefined) => {
          const base = Array.isArray(old) ? old : [];
          return [...base, created].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
        });
        toast.success(`Próxima despesa agendada para ${formatDate(nextDue)}`);
      }
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

        {/* Divisor + prévia do próximo mês */}
        <div className="mt-5 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Previsão • {nextMonthLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {nextMonthItems.length} {nextMonthItems.length === 1 ? "despesa" : "despesas"}
                  {projectedRecurring.length > 0 && ` (${projectedRecurring.length} estimada${projectedRecurring.length === 1 ? "" : "s"})`}
                </p>
              </div>
            </div>
            <p className="text-lg font-bold tabular-nums">{formatCurrency(nextMonthTotal)}</p>
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
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="current">Este mês</TabsTrigger>
            <TabsTrigger value="next" className="capitalize">{nextMonthLabel}</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {visibleItems.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8 sm:col-span-2 lg:col-span-3">Nenhuma despesa neste período.</p>
          ) : visibleItems.map((f) => (
            <div
              key={`${f.id}-${f._projected ? "p" : "r"}`}
              role="button"
              tabIndex={0}
              onClick={() => !f._projected && setEditing(f)}
              onKeyDown={(e) => { if (e.key === "Enter" && !f._projected) setEditing(f); }}
              className={`bg-card border border-border/60 rounded-2xl p-4 shadow-card flex items-center gap-3 transition-transform ${f._projected ? "opacity-70 border-dashed" : "cursor-pointer active:scale-[0.997]"}`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); if (!f._projected) toggle(f); }}
                disabled={f._projected}
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  f.status === "paid" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                }`}
              >
                {f.status === "paid" ? "✓" : "!"}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-1.5">
                  {f.description}
                  {f._projected && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Estimada</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>{f.category} • {formatDate(f.due_date)}</span>
                  {f.frequency_value ? (
                    <Repeat className="h-3 w-3 text-primary shrink-0" aria-label="Recorrente" />
                  ) : null}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold tabular-nums">{formatCurrency(Number(f.amount))}</p>
                {!f._projected && (
                  <button onClick={(e) => { e.stopPropagation(); remove(f.id); }} className="text-muted-foreground hover:text-destructive mt-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          </TabsContent>
        </Tabs>
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