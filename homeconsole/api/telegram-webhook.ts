import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Auxiliares para cálculo de data (idênticos aos do app)
const parseLocalDate = (d: string) => new Date(d.includes("T") ? d : `${d}T00:00:00`);
const addDaysISO = (base: string, days: number) => {
  const d = parseLocalDate(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const addMonthsISO = (base: string, months: number) => {
  const d = parseLocalDate(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const addFrequencyISO = (base: string, amount: number, unit: "days" | "months") => 
  unit === "months" ? addMonthsISO(base, amount) : addDaysISO(base, amount);

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return console.error("TELEGRAM_BOT_TOKEN env variable not set.");
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  }).catch(err => console.error("Failed to send Telegram message:", err));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const msg = req.body?.message || req.body?.edited_message;
  if (!msg || !msg.chat || !msg.text) {
    return res.status(200).send('OK (no message)');
  }

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("Missing Supabase configuration.");
    return res.status(500).json({ error: 'Missing environment variables' });
  }

  // Usar service role para poder ler a tabela de chats autorizados e fazer mutações bypassando RLS
  const supabase = createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false }
  });

  // Validar se o chat_id está autorizado
  const { data: authChat, error: authError } = await supabase
    .from('telegram_authorized_chats')
    .select('household_id, user_name')
    .eq('chat_id', chatId)
    .single();

  if (authError || !authChat) {
    console.warn(`Unauthorized chat_id: ${chatId}. Message ignored.`);
    return res.status(200).send('OK (unauthorized)');
  }

  const householdId = authChat.household_id;
  const userName = authChat.user_name || 'Usuário';

  try {
    // 1. Comando: + <item>
    if (text.startsWith('+')) {
      const itemName = text.slice(1).trim();
      if (!itemName) {
        await sendTelegramMessage(chatId, "⚠️ Por favor, digite o nome do item. Ex: `+ Sabão em pó`");
        return res.status(200).send('OK');
      }

      // Buscar item similar no estoque
      const { data: inventory, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('household_id', householdId);

      if (error) throw error;

      const normalizedSearch = normalize(itemName);
      const match = inventory?.find(it => normalize(it.name) === normalizedSearch);

      if (match) {
        // O comando "+" intencionalmente zera current_qty para sinalizar "faltando",
        // independente da quantidade anterior. Não é incremento — é marcação de falta.
        const nextMin = Number(match.min_threshold) === 0 ? 1 : Number(match.min_threshold);
        await supabase
          .from('inventory')
          .update({ current_qty: 0, min_threshold: nextMin })
          .eq('id', match.id);

        await sendTelegramMessage(chatId, `✅ *${match.name}* marcado como FALTANDO no estoque.`);
      } else {
        // Criar novo item
        await supabase
          .from('inventory')
          .insert({
            name: itemName,
            current_qty: 0,
            min_threshold: 1,
            unit: 'un',
            category: 'Geral',
            household_id: householdId
          });

        await sendTelegramMessage(chatId, `✅ *${itemName}* adicionado ao estoque como FALTANDO.`);
      }
    }
    // 2. Comando: - <item>
    else if (text.startsWith('-')) {
      const itemName = text.slice(1).trim();
      if (!itemName) {
        await sendTelegramMessage(chatId, "⚠️ Por favor, digite o nome do item. Ex: `- Sabão em pó`");
        return res.status(200).send('OK');
      }

      const { data: inventory, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('household_id', householdId);

      if (error) throw error;

      const normalizedSearch = normalize(itemName);
      const match = inventory?.find(it => normalize(it.name) === normalizedSearch);

      if (match) {
        const nextQty = Number(match.min_threshold) > 0 ? Number(match.min_threshold) : 1;
        await supabase
          .from('inventory')
          .update({ current_qty: nextQty })
          .eq('id', match.id);

        await sendTelegramMessage(chatId, `✅ *${match.name}* marcado como COMPRADO/OK.`);
      } else {
        await sendTelegramMessage(chatId, `❌ Item *"${itemName}"* não foi encontrado no estoque.`);
      }
    }
    // 3. Comando: tarefa: <texto>
    else if (normalize(text).startsWith('tarefa:')) {
      const taskTitle = text.slice(text.indexOf(':') + 1).trim();
      if (!taskTitle) {
        await sendTelegramMessage(chatId, "⚠️ Por favor, digite o título da tarefa. Ex: `tarefa: Limpar calha`");
        return res.status(200).send('OK');
      }

      await supabase
        .from('maintenance')
        .insert({
          title: taskTitle,
          completed: false,
          next_due_date: new Date().toISOString().slice(0, 10),
          frequency_days: 30,
          task_type: 'one_time',
          frequency_unit: 'days',
          priority_level: 'medium',
          household_id: householdId
        });

      await sendTelegramMessage(chatId, `✅ Tarefa rápida *"${taskTitle}"* criada com sucesso.`);
    }
    // 4. Comando: feito: <texto>
    else if (normalize(text).startsWith('feito:')) {
      const taskTitle = text.slice(text.indexOf(':') + 1).trim();
      if (!taskTitle) {
        await sendTelegramMessage(chatId, "⚠️ Por favor, informe qual tarefa concluiu. Ex: `feito: calha`");
        return res.status(200).send('OK');
      }

      const { data: tasks, error } = await supabase
        .from('maintenance')
        .select('*')
        .eq('household_id', householdId)
        .eq('completed', false);

      if (error) throw error;

      const normalizedSearch = normalize(taskTitle);
      // Buscar correspondência parcial
      const match = tasks?.find(t => normalize(t.title).includes(normalizedSearch));

      if (match) {
        const today = new Date().toISOString().slice(0, 10);
        const isOneTime = match.task_type === 'one_time';
        const unit = (match.frequency_unit === 'months' ? 'months' : 'days') as 'days' | 'months';
        const amount = unit === 'months' ? Math.max(1, Math.round((match.frequency_days || 30) / 30)) : (match.frequency_days || 30);
        const base = !isOneTime && match.next_due_date && match.next_due_date >= today ? match.next_due_date : today;

        const update = isOneTime
          ? { last_performed_date: today, completed: true }
          : { last_performed_date: today, next_due_date: addFrequencyISO(base, amount, unit), completed: false };

        await supabase
          .from('maintenance')
          .update(update)
          .eq('id', match.id);

        if (isOneTime) {
          await sendTelegramMessage(chatId, `✅ Tarefa *"${match.title}"* concluída.`);
        } else {
          await sendTelegramMessage(chatId, `✅ Tarefa *"${match.title}"* concluída. Próxima: ${update.next_due_date}`);
        }
      } else {
        await sendTelegramMessage(chatId, `❌ Nenhuma tarefa pendente contendo *"${taskTitle}"* foi encontrada.`);
      }
    }
    // 5. Comando: ? ou status
    else if (text === '?' || normalize(text) === 'status') {
      const { data: inventory } = await supabase.from('inventory').select('*').eq('household_id', householdId);
      const { data: tasks } = await supabase.from('maintenance').select('*').eq('household_id', householdId).eq('completed', false);

      const missingItems = (inventory || []).filter(i => Number(i.current_qty) < Number(i.min_threshold));
      
      const today = new Date().toISOString().slice(0, 10);
      const overdueTasks = (tasks || []).filter(t => t.next_due_date < today);

      let responseText = `🏠 *RESUMO DA CENTRAL*\n\n`;

      responseText += `🛒 *Estoque Faltando (${missingItems.length}):*\n`;
      if (missingItems.length === 0) {
        responseText += `_Tudo em dia!_\n`;
      } else {
        responseText += missingItems.map(i => `• ${i.name} (${i.current_qty}/${i.min_threshold} ${i.unit})`).join('\n') + '\n';
      }

      responseText += `\n🔧 *Tarefas Atrasadas (${overdueTasks.length}):*\n`;
      if (overdueTasks.length === 0) {
        responseText += `_Nenhuma tarefa atrasada!_`;
      } else {
        responseText += overdueTasks.map(t => `• ${t.title} (Venceu em ${t.next_due_date})`).join('\n');
      }

      await sendTelegramMessage(chatId, responseText);
    }
    // 6. Mensagem de Ajuda padrão
    else {
      const helpText = `Olá, *${userName}*!\n\n` +
        `Comandos disponíveis:\n` +
        `• \`+ <item>\` : Adiciona ou marca item como FALTANDO no estoque.\n` +
        `• \`- <item>\` : Marca item como COMPRADO/OK.\n` +
        `• \`tarefa: <texto>\` : Cria uma tarefa de manutenção rápida.\n` +
        `• \`feito: <texto>\` : Conclui uma tarefa rápida ou recorrente.\n` +
        `• \`?\` ou \`status\` : Exibe itens em falta e tarefas atrasadas.`;
      
      await sendTelegramMessage(chatId, helpText);
    }
  } catch (err: any) {
    console.error("Error processing telegram command:", err);
    await sendTelegramMessage(chatId, `⚠️ Ocorreu um erro ao processar seu comando: _${err.message}_`);
  }

  return res.status(200).send('OK');
}
