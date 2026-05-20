import { supabase } from "@/integrations/supabase/client";

export async function sendTelegramMessage(text: string): Promise<boolean> {
  // Obter o chat_id cadastrado para o household no Supabase
  const { data, error } = await supabase
    .from('telegram_authorized_chats')
    .select('chat_id')
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error("Nenhum Chat ID do Telegram configurado nos Ajustes.");
  }

  const chatId = data[0].chat_id;
  return sendTelegramMessageToChat(chatId, text);
}

export async function sendTelegramMessageToChat(chatId: string, text: string): Promise<boolean> {
  const res = await fetch("/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, text }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao enviar mensagem via proxy.");
  }

  return true;
}

// Stubs para compatibilidade com o front-end temporária (serão removidos/ajustados)
export function getTelegramConfig() {
  return { token: "Configurado no Servidor", chatId: "" };
}

export function saveTelegramConfig(token: string, chatId: string) {
  // O token não é mais salvo no cliente. O chat_id será gerenciado diretamente via Supabase em Settings.tsx
}

