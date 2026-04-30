import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function InventoryForm({ onDone, initial }: { onDone: () => void; initial?: any }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "geral",
    current_qty: initial?.current_qty != null ? String(initial.current_qty) : "1",
    min_threshold: initial?.min_threshold != null ? String(initial.min_threshold) : "1",
    unit: initial?.unit ?? "un",
    expires_at: initial?.expires_at ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("O nome é obrigatório");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "geral",
      current_qty: Number(form.current_qty) || 0,
      min_threshold: Number(form.min_threshold) || 0,
      unit: form.unit.trim() || "un",
      expires_at: form.expires_at || null,
    };
    const { data, error } = isEdit
      ? await supabase.from("inventory").update(payload).eq("id", initial.id).select().single()
      : await supabase.from("inventory").insert(payload).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.setQueriesData({ queryKey: ["inventory"] }, (old: any[] | undefined) => {
      const list = Array.isArray(old) ? [...old] : [];
      const next = isEdit
        ? list.map((it) => (it.id === data.id ? { ...it, ...data } : it))
        : [...list, data];
      return next.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
    toast.success(isEdit ? "Item atualizado" : "Item adicionado");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome do item">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Azeite de oliva" maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade">
          <Input type="number" min="0" step="0.1" value={form.current_qty} onChange={(e) => setForm({ ...form, current_qty: e.target.value })} />
        </Field>
        <Field label="Unidade">
          <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="garrafa" maxLength={20} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mínimo">
          <Input type="number" min="0" step="0.1" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} />
        </Field>
        <Field label="Categoria">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Despensa" maxLength={40} />
        </Field>
      </div>
      <Field label="Validade (opcional)">
        <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Adicionar ao estoque"}
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