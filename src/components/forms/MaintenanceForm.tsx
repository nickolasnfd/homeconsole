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
import { addDaysISO, todayISO } from "@/lib/format";
import { toast } from "sonner";

export function MaintenanceForm({ onDone, initial }: { onDone: () => void; initial?: any }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    frequency_days: String(initial?.frequency_days ?? "30"),
    last_performed_date: initial?.last_performed_date ?? todayISO(),
    priority_level: initial?.priority_level ?? "medium",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("O título é obrigatório");
    setSaving(true);
    const freq = Math.max(1, Number(form.frequency_days) || 30);
    const next_due_date = addDaysISO(form.last_performed_date || todayISO(), freq);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      frequency_days: freq,
      last_performed_date: form.last_performed_date || null,
      next_due_date,
      priority_level: form.priority_level,
    };
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="A cada (dias)">
          <Input type="number" min="1" value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: e.target.value })} />
        </Field>
        <Field label="Última vez">
          <Input type="date" value={form.last_performed_date} onChange={(e) => setForm({ ...form, last_performed_date: e.target.value })} />
        </Field>
      </div>
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