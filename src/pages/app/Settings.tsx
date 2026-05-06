import { useState } from "react";
import { useAuth } from "@/integrations/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, User as UserIcon, MessageSquare, Send, Eye, EyeOff, Save } from "lucide-react";
import { getTelegramConfig, saveTelegramConfig, sendTelegramMessage } from "@/lib/telegram";
import { toast } from "sonner";

export default function Settings() {
  const { user, signOut } = useAuth();
  const config = getTelegramConfig();

  const [token, setToken] = useState(config.token);
  const [chatId, setChatId] = useState(config.chatId);
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = () => {
    saveTelegramConfig(token, chatId);
    toast.success("Configurações do Telegram salvas com sucesso!");
  };

  const handleTest = async () => {
    if (!token || !chatId) {
      toast.error("Preencha o Token e o Chat ID antes de testar.");
      return;
    }

    setTesting(true);
    try {
      saveTelegramConfig(token, chatId);
      const testText = `🏠 *CENTRAL RESIDENCIAL*\n\n🟢 *Conexão bem sucedida!*\nSeu bot está configurado corretamente e pronto para enviar relatórios da sua casa.`;
      await sendTelegramMessage(testText);
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
            <label className="text-xs font-semibold text-muted-foreground">Token do Bot</label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="pr-10 h-10 rounded-xl bg-muted/30 border-border/40"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground px-1 leading-tight">
              Crie um bot enviando <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">/newbot</a> para o <strong className="text-foreground">@BotFather</strong> e copie o token gerado.
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">ID do Chat (Chat ID)</label>
            <Input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Ex: 987654321 ou -100123456789"
              className="h-10 rounded-xl bg-muted/30 border-border/40"
            />
            <p className="text-[10px] text-muted-foreground px-1 leading-tight">
              Obtenha enviando uma mensagem para <strong className="text-foreground font-semibold">@userinfobot</strong> ou adicione seu bot a um grupo familiar e obtenha o ID do grupo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <Button
            variant="outline"
            className="rounded-xl h-11 gap-2 cursor-pointer border-border/60 hover:bg-muted/40"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 text-muted-foreground" />
            Salvar
          </Button>
          <Button
            className="rounded-xl h-11 gap-2 cursor-pointer bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-sm"
            onClick={handleTest}
            disabled={testing}
          >
            <Send className="h-4 w-4" />
            {testing ? "Testando..." : "Testar Bot"}
          </Button>
        </div>
      </section>

      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card">
        <h2 className="text-sm font-semibold mb-2">Sobre</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Central de Comando Residencial. Gerencie seu estoque, tarefas de manutenção e finanças de forma simples e segura.
        </p>
      </section>
    </div>
  );
}
