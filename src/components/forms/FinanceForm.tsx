import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";

export function FinanceForm({ onDone, initial }: { onDone: () => void; initial?: any }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    description: initial?.description ?? "",
    amount: initial?.amount != null ? String(initial.amount) : "",
    due_date: initial?.due_date ?? todayISO(),
    status: initial?.status ?? "pending",
    category: initial?.category ?? "Contas",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("A descrição é obrigatória");
    setSaving(true);
    const payload = {
      description: form.description.trim(),
      amount: Number(form.amount) || 0,
      due_date: form.due_date || todayISO(),
      status: form.status,
      category: form.category.trim() || "geral",
    };
    const q = isEdit
      ? supabase.from("finances").update(payload).eq("id", initial.id).select().single()
      : supabase.from("finances").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.setQueriesData({ queryKey: ["finances"] }, (old: any[] | undefined) => {
      const base = Array.isArray(old) ? old : [];
      const list = isEdit ? base.map((it) => (it.id === data.id ? data : it)) : [...base, data];
      return list.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
    });
    toast.success(isEdit ? "Despesa atualizada" : "Despesa adicionada");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Descrição">
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Conta de luz" maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor">
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
        </Field>
        <Field label="Vencimento">
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Categoria">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Contas" maxLength={40} />
        </Field>
      </div>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Adicionar despesa"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}