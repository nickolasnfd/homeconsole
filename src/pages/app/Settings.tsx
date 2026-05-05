import { useAuth } from "@/integrations/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border/60 rounded-[22px] p-4 shadow-card">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <UserIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Sua Conta</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border/40">
          <Button
            variant="destructive"
            className="w-full gap-2 rounded-xl h-11"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border/60 rounded-[22px] p-4 shadow-card">
        <h2 className="text-sm font-semibold mb-2">Sobre</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Central de Comando Residencial. Gerencie seu estoque, tarefas de manutenção e finanças de forma simples e segura.
        </p>
      </section>
    </div>
  );
}
