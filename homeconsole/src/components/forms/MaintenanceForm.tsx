import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { addFrequencyISO, todayISO } from "@/lib/format";
import { toast } from "sonner";

export function MaintenanceForm({ onDone, initial }: { onDone: () => void; initial?: any }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    task_type: initial?.task_type ?? "recurring",
    frequency_amount: String(
      initial?.frequency_unit === "months"
        ? Math.max(1, Math.round((initial?.frequency_days ?? 30) / 30))
        : initial?.frequency_days ?? 30
    ),
    frequency_unit: initial?.frequency_unit ?? "days",
    last_performed_date: initial?.last_performed_date ?? todayISO(),
    priority_level: initial?.priority_level ?? "medium",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("O título é obrigatório");
    setSaving(true);
    const isOneTime = form.task_type === "one_time";
    const amount = Math.max(1, Number(form.frequency_amount) || 1);
    const unit = (form.frequency_unit === "months" ? "months" : "days") as "days" | "months";
    const freqDays = unit === "months" ? amount * 30 : amount;
    const base = form.last_performed_date || todayISO();
    const next_due_date = isOneTime ? base : addFrequencyISO(base, amount, unit);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      task_type: isOneTime ? "one_time" : "recurring",
      frequency_days: freqDays,
      frequency_unit: isOneTime ? "days" : unit,
      last_performed_date: isOneTime ? null : form.last_performed_date || null,
      next_due_date,
      priority_level: form.priority_level,
    };
    if (!isEdit) payload.completed = false;
    const q = isEdit
      ? supabase.from("maintenance").update(payload).eq("id", initial.id).select().single()
      : supabase.from("maintenance").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.setQueriesData({ queryKey: ["maintenance"] }, (old: any[] | undefined) => {
      const base = Array.isArray(old) ? old : [];
      const list = isEdit ? base.map((it) => (it.id === data.id ? data : it)) : [...base, data];
      return list.sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)));
    });
    toast.success(isEdit ? "Tarefa atualizada" : "Tarefa de manutenção adicionada");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Título da tarefa">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Trocar filtro do ar-condicionado" maxLength={80} />
      </Field>
      <Field label="Descrição (opcional)">
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
      </Field>
      <Field label="Tipo de tarefa">
        <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recurring">Recorrente</SelectItem>
            <SelectItem value="one_time">Única (sem repetição)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {form.task_type === "recurring" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="A cada">
              <Input type="number" min="1" value={form.frequency_amount} onChange={(e) => setForm({ ...form, frequency_amount: e.target.value })} />
            </Field>
            <Field label="Unidade">
              <Select value={form.frequency_unit} onValueChange={(v) => setForm({ ...form, frequency_unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Dias</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Última vez">
            <Input type="date" value={form.last_performed_date} onChange={(e) => setForm({ ...form, last_performed_date: e.target.value })} />
          </Field>
        </>
      ) : (
        <Field label="Data prevista">
          <Input type="date" value={form.last_performed_date} onChange={(e) => setForm({ ...form, last_performed_date: e.target.value })} />
        </Field>
      )}
      <Field label="Prioridade">
        <Select value={form.priority_level} onValueChange={(v) => setForm({ ...form, priority_level: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Adicionar tarefa"}
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