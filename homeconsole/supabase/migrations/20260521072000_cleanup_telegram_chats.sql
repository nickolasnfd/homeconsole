-- Limpar a tabela de chats autorizados do Telegram para remover registros conflitantes criados de forma manual
TRUNCATE TABLE public.telegram_authorized_chats CASCADE;
