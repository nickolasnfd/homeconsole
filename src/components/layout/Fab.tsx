import { useLocation } from "react-router-dom";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { InventoryForm } from "@/components/forms/InventoryForm";
import { MaintenanceForm } from "@/components/forms/MaintenanceForm";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

export function Fab() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const defaultTab =
    pathname.startsWith("/inventory") ? "inventory" :
    pathname.startsWith("/maintenance") ? "maintenance" :
    "inventory";

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Adicionar novo registro"
          className="fixed z-50 bottom-32 right-5 h-14 w-14 rounded-full bg-primary/15 border border-primary/30 text-primary shadow-glow flex items-center justify-center active:scale-95 transition-all hover:bg-primary/25 hover:shadow-[0_0_24px_hsl(172_100%_41%/0.4)]"
        >
          <Plus className="h-6 w-6" strokeWidth={2.6} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl bg-card border-border/60">
        <DialogHeader>
          <DialogTitle>Adicionar rápido</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="maintenance">Tarefa</TabsTrigger>
            <TabsTrigger value="inventory">Item</TabsTrigger>
          </TabsList>
          <TabsContent value="maintenance" className="mt-4"><MaintenanceForm onDone={close} /></TabsContent>
          <TabsContent value="inventory" className="mt-4"><InventoryForm onDone={close} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}