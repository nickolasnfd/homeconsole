import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, User as UserIcon, MessageSquare, Send, Save, Lock } from "lucide-react";
import { sendTelegramMessageToChat } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [chatId, setChatId] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('telegram_authorized_chats')
          .select('chat_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setChatId(data.chat_id);
        }
      } catch (err: any) {
        console.error("Erro ao carregar chat ID:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, [user]);

  const handleSave = async (): Promise<boolean> => {
    if (!user) return false;
    if (!chatId.trim()) {
      toast.error("Por favor, preencha o Chat ID.");
      return false;
    }

    setSaving(true);
    try {
      // 1. Obter household_id do perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error("Supabase Error ao buscar profile:", profileError);
        throw new Error(`Erro do banco: ${profileError.message || JSON.stringify(profileError)}`);
      }
      
      if (!profile || !profile.household_id) {
        throw new Error("Usuário não associado a uma residência (household).");
      }

      const householdId = profile.household_id;

      // 2. Deletar chat_id antigo associado a este usuário para evitar órfãos
      await supabase
        .from('telegram_authorized_chats')
        .delete()
        .eq('user_id', user.id);

      // 3. Inserir o novo chat_id
      const { error: insertError } = await supabase
        .from('telegram_authorized_chats')
        .insert({
          chat_id: chatId.trim(),
          household_id: householdId,
          user_id: user.id,
          user_name: user.email?.split('@')[0] || 'Usuário'
        });

      if (insertError) throw insertError;

      toast.success("Chat ID do Telegram salvo com sucesso!");
      return true;
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar configurações.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!chatId.trim()) {
      toast.error("Preencha o Chat ID antes de testar.");
      return;
    }

    setTesting(true);
    try {
      const saved = await handleSave();
      if (!saved) return;

      const testText = `🏠 *CENTRAL RESIDENCIAL*\n\n🟢 *Conexão bem sucedida!*\nSeu bot está configurado corretamente e pronto para enviar relatórios da sua casa.`;
      await sendTelegramMessageToChat(chatId.trim(), testText);
      toast.success("Mensagem de teste enviada para o Telegram!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem de teste.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card">
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
            className="w-full gap-2 rounded-xl h-11 cursor-pointer"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </section>

      {/* Telegram Section */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notificações do Telegram</h2>
            <p className="text-xs text-muted-foreground">Receba alertas e relatórios direto no seu celular</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Bot Token */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" /> Token do Bot (Servidor)
            </label>
            <div className="relative">
              <Input
                type="text"
                value="••••••••••••••••••••••••••••••••••••"
                disabled
                className="pr-10 h-10 rounded-xl bg-muted/20 border-border/40 text-muted-foreground cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[10px] text-emerald-500/80 px-1 leading-tight font-medium">
              Protegido no backend. O token é carregado via variáveis de ambiente para sua segurança.
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Seu ID do Chat (Chat ID)</label>
            <Input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={loadingConfig ? "Carregando..." : "Ex: 987654321"}
              disabled={loadingConfig || saving}
              className="h-10 rounded-xl bg-muted/30 border-border/40"
            />
            <p className="text-[10px] text-muted-foreground px-1 leading-tight">
              Obtenha enviando uma mensagem para <strong className="text-foreground font-semibold">@userinfobot</strong> no Telegram.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            className="rounded-xl h-11 gap-2 cursor-pointer border-border/60 hover:bg-muted/40"
            onClick={() => handleSave()}
            disabled={loadingConfig || saving || testing}
          >
            <Save className="h-4 w-4 text-muted-foreground" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            className="rounded-xl h-11 gap-2 cursor-pointer bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-sm"
            onClick={handleTest}
            disabled={loadingConfig || saving || testing}
          >
            <Send className="h-4 w-4" />
            {testing ? "Testando..." : "Testar Bot"}
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card">
        <h2 className="text-sm font-semibold mb-2">Sobre</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Central de Comando Residencial. Gerencie seu estoque e tarefas de manutenção de forma simples e segura.
        </p>
      </section>
    </div>
  );
}
