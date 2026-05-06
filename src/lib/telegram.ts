export interface TelegramConfig {
  token: string;
  chatId: string;
}

export function getTelegramConfig(): TelegramConfig {
  if (typeof window === "undefined") return { token: "", chatId: "" };
  return {
    token: localStorage.getItem("telegram_bot_token") || "",
    chatId: localStorage.getItem("telegram_chat_id") || "",
  };
}

export function saveTelegramConfig(token: string, chatId: string) {
  localStorage.setItem("telegram_bot_token", token.trim());
  localStorage.setItem("telegram_chat_id", chatId.trim());
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const { token, chatId } = getTelegramConfig();
  if (!token || !chatId) {
    throw new Error("Configurações do Telegram não preenchidas nos Ajustes.");
  }

  // Sanitize Markdown links and formatting if needed, but simple markdown works
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.description || "Erro na API do Telegram.");
  }

  return true;
}
