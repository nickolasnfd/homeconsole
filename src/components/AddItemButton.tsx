import { ReactNode, useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  title: string;
  label: string;
  children: (close: () => void) => ReactNode;
};

export function AddItemButton({ title, label, children }: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-primary-foreground font-semibold py-3 shadow-glow active:scale-[0.99] transition-transform"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          <span className="text-sm">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl bg-card border-border/60">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2">{children(close)}</div>
      </DialogContent>
    </Dialog>
  );
}