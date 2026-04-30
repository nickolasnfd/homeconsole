import { useState } from "react";
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

export function MaintenanceForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    frequency_days: "30",
    last_performed_date: todayISO(),
    priority_level: "medium",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    const freq = Math.max(1, Number(form.frequency_days) || 30);
    const next_due_date = addDaysISO(form.last_performed_date || todayISO(), freq);
    const { error } = await supabase.from("maintenance").insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      frequency_days: freq,
      last_performed_date: form.last_performed_date || null,
      next_due_date,
      priority_level: form.priority_level,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Maintenance task added");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Task title">
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Replace HVAC filter" maxLength={80} />
      </Field>
      <Field label="Description (optional)">
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Every (days)">
          <Input type="number" min="1" value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: e.target.value })} />
        </Field>
        <Field label="Last done">
          <Input type="date" value={form.last_performed_date} onChange={(e) => setForm({ ...form, last_performed_date: e.target.value })} />
        </Field>
      </div>
      <Field label="Priority">
        <Select value={form.priority_level} onValueChange={(v) => setForm({ ...form, priority_level: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Add task"}
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