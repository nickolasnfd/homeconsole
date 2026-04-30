import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";

export function FinanceForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    due_date: todayISO(),
    status: "pending",
    category: "Utilities",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return toast.error("Description is required");
    setSaving(true);
    const { error } = await supabase.from("finances").insert({
      description: form.description.trim(),
      amount: Number(form.amount) || 0,
      due_date: form.due_date || todayISO(),
      status: form.status,
      category: form.category.trim() || "general",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Expense added");
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Description">
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Electric bill" maxLength={80} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount">
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
        </Field>
        <Field label="Due date">
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Utilities" maxLength={40} />
        </Field>
      </div>
      <Button type="submit" className="w-full h-11" disabled={saving}>
        {saving ? "Saving…" : "Add expense"}
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