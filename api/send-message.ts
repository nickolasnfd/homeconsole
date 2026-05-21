import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { chatId, text } = req.body || {};

  if (!chatId || !text) {
    return res.status(400).json({ error: 'Missing chatId or text' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false }
  });

  // Sanitizar o Chat ID para conter apenas números e sinal de menos (para grupos)
  const cleanChatId = String(chatId).replace(/[^0-9-]/g, '');

  if (!cleanChatId) {
    return res.status(400).json({ error: 'Invalid Chat ID format' });
  }

  // Validar se o chat_id está cadastrado/autorizado
  const { data: authChat, error: authError } = await supabase
    .from('telegram_authorized_chats')
    .select('chat_id')
    .eq('chat_id', cleanChatId)
    .limit(1)
    .maybeSingle();

  if (authError) {
    console.error('Database error in send-message validation:', authError);
    return res.status(500).json({ error: 'Database verification failed', details: authError.message });
  }

  if (!authChat) {
    return res.status(403).json({ error: 'Unauthorized chat ID' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    if (!tgRes.ok) {
      const tgErr = await tgRes.json().catch(() => ({}));
      return res.status(tgRes.status).json({ error: tgErr.description || 'Telegram API Error' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
