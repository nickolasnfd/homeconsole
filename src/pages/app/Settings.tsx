import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/integrations/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  LogOut, User as UserIcon, MessageSquare, Send, Save, Lock,
  Sun, Moon, Monitor, Tag, Plus, Trash2, Package,
} from "lucide-react";
import { sendTelegramMessageToChat } from "@/lib/telegram";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInventoryCategories } from "@/hooks/useInventoryCategories";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

type AlertPrefs = {
  lowStock: boolean;
  expiring: boolean;
  overdueMaintenance: boolean;
};

const DEFAULT_ALERT_PREFS: AlertPrefs = {
  lowStock: true,
  expiring: true,
  overdueMaintenance: true,
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [chatId, setChatId] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [alertPrefs, setAlertPrefs] = useLocalStorage<AlertPrefs>("user:alert_prefs", DEFAULT_ALERT_PREFS);
  const { allCategories, customCategories, defaultCategories, addCategory, removeCategory } = useInventoryCategories();
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("telegram_authorized_chats")
          .select("chat_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) setChatId(data.chat_id);
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
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single();
      if (profileError) throw new Error(`Erro do banco: ${profileError.message || JSON.stringify(profileError)}`);
      if (!profile?.household_id) throw new Error("Usuário não associado a uma residência (household).");

      const cleanChatId = chatId.replace(/[^0-9-]/g, "");
      if (!cleanChatId) throw new Error("Chat ID inválido. Deve conter apenas números.");

      await supabase.from("telegram_authorized_chats").delete().eq("user_id", user.id);
      await supabase.from("telegram_authorized_chats").delete().eq("chat_id", cleanChatId);

      const { error: insertError } = await supabase.from("telegram_authorized_chats").insert({
        chat_id: cleanChatId,
        household_id: profile.household_id,
        user_id: user.id,
        user_name: user.email?.split("@")[0] || "Usuário",
      });
      if (insertError) throw insertError;

      setChatId(cleanChatId);
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
    const cleanChatId = chatId.replace(/[^0-9-]/g, "");
    if (!cleanChatId) {
      toast.error("Preencha o Chat ID antes de testar.");
      return;
    }
    setTesting(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      await sendTelegramMessageToChat(
        cleanChatId,
        `🏠 *CENTRAL RESIDENCIAL*\n\n🟢 *Conexão bem sucedida!*\nSeu bot está configurado corretamente e pronto para enviar relatórios da sua casa.`
      );
      toast.success("Mensagem de teste enviada para o Telegram!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar mensagem de teste.");
    } finally {
      setTesting(false);
    }
  };

  const handleAddCategory = () => {
    const ok = addCategory(newCategory);
    if (ok) {
      setNewCategory("");
      toast.success(`Categoria "${newCategory.trim()}" adicionada`);
    } else if (newCategory.trim()) {
      toast.error("Categoria já existe ou nome inválido");
    }
  };

  return (
    <div className="space-y-5">
      {/* CONTA */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
            <UserIcon className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold">Conta</h2>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow text-primary-foreground font-bold text-base shrink-0 select-none">
            {user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Conta ativa</p>
          </div>
        </div>
        <div className="pt-4 mt-3 border-t border-border/40">
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

      {/* APARÊNCIA */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Aparência</h2>
            <p className="text-xs text-muted-foreground">Escolha o tema do aplicativo</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { value: "dark", label: "Escuro", icon: Moon },
            { value: "light", label: "Claro", icon: Sun },
            { value: "system", label: "Sistema", icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all cursor-pointer",
                theme === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* NOTIFICAÇÕES TELEGRAM */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Notificações Telegram</h2>
            <p className="text-xs text-muted-foreground">Receba alertas direto no celular</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-emerald-500" /> Token do Bot (Servidor)
            </label>
            <Input
              type="text"
              value="••••••••••••••••••••••••••••••••••••"
              disabled
              className="pr-10 h-10 rounded-xl bg-muted/20 border-border/40 text-muted-foreground cursor-not-allowed select-none"
            />
            <p className="text-[10px] text-emerald-500/80 px-1 leading-tight font-medium">
              Protegido no backend. Carregado via variáveis de ambiente.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Seu Chat ID</label>
            <Input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder={loadingConfig ? "Carregando..." : "Ex: 987654321"}
              disabled={loadingConfig || saving}
              className="h-10 rounded-xl bg-muted/30 border-border/40"
            />
            <p className="text-[10px] text-muted-foreground px-1 leading-tight">
              Obtenha enviando mensagem para <strong className="text-foreground">@userinfobot</strong> no Telegram.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
          <Button
            variant="outline"
            className="rounded-xl h-11 gap-2 cursor-pointer border-border/60"
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

        {/* Preferências de alerta */}
        <div className="border-t border-border/40 pt-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">O que incluir nos relatórios</p>
          {[
            { key: "lowStock" as const, label: "Itens em falta no estoque" },
            { key: "expiring" as const, label: "Produtos próximos da validade" },
            { key: "overdueMaintenance" as const, label: "Manutenções atrasadas" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm">{label}</span>
              <Switch
                checked={alertPrefs[key]}
                onCheckedChange={(val) => setAlertPrefs({ ...alertPrefs, [key]: val })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
            <Tag className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Categorias do Estoque</h2>
            <p className="text-xs text-muted-foreground">Adicione categorias personalizadas</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria..."
            className="h-9 rounded-xl text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
            maxLength={30}
          />
          <Button onClick={handleAddCategory} size="sm" className="rounded-xl h-9 px-3 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {allCategories.map((cat) => {
            const isCustom = !defaultCategories.includes(cat);
            return (
              <span
                key={cat}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                  isCustom
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cat}
                {isCustom && (
                  <button
                    onClick={() => removeCategory(cat)}
                    className="hover:text-destructive transition-colors cursor-pointer"
                    aria-label={`Remover categoria ${cat}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </section>

      {/* SOBRE */}
      <section className="bg-card border border-border/60 rounded-[22px] p-5 shadow-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
            <Package className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold">Sobre</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Central de Comando Residencial. Gerencie seu estoque e tarefas de manutenção de forma simples e segura.
        </p>
      </section>
    </div>
  );
}
