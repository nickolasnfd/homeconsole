import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function InventoryForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    category: "general",
    current_qty: "1",
    min_threshold: "1",
    unit: "unit",
    expires_at: "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await supabase.from("inventory").insert({
      name: form.name.trim(),
      category: form.category.trim() || "general",
      current_qty: Number(form.current_qty) || 0,
      min_threshold: Number(form.min_threshold) || 0,
      unit: form.unit.trim() || "unit",
      expires_at: form.expires_at || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Item added");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Item name">
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Olive oil" maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <Input type="number" min="0" step="0.1" value={form.current_qty} onChange={(e) => setForm({ ...form, current_qty: e.target.value })} />
        </Field>
        <Field label="Unit">
          <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="bottle" maxLength={20} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Min threshold">
          <Input type="number" min="0" step="0.1" value={form.min_threshold} onChange={(e) => setForm({ ...form, min_threshold: e.target.value })} />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Pantry" maxLength={40} />
        </Field>
      </div>
      <Field label="Expires (optional)">
        <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
      </Field>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Add to inventory"}
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