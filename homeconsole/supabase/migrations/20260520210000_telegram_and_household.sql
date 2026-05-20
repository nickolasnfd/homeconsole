-- Habilitar a extensão pg_trgm e unaccent para buscas flexíveis
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Criar a tabela de households
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar trigger de updated_at para households
CREATE TRIGGER trg_households_updated BEFORE UPDATE ON public.households 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Criar a tabela public.profiles vinculada ao auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar trigger de updated_at para profiles
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Criar uma household padrão ('Nossa Casa') para migração de dados existentes
INSERT INTO public.households (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Nossa Casa');

-- 4. Adicionar a coluna household_id nas tabelas de domínio
ALTER TABLE public.inventory ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance ADD COLUMN household_id UUID REFERENCES public.households(id) ON DELETE CASCADE;

-- 5. Associar todas as linhas atuais à household padrão
UPDATE public.inventory SET household_id = '00000000-0000-0000-0000-000000000001';
UPDATE public.maintenance SET household_id = '00000000-0000-0000-0000-000000000001';

-- Tornar a coluna household_id NOT NULL
ALTER TABLE public.inventory ALTER COLUMN household_id SET NOT NULL;
ALTER TABLE public.maintenance ALTER COLUMN household_id SET NOT NULL;

-- 6. Habilitar RLS estrito nas novas tabelas
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Remover políticas públicas genéricas antigas
DROP POLICY IF EXISTS "Public access inventory" ON public.inventory;
DROP POLICY IF EXISTS "Public access maintenance" ON public.maintenance;

-- 8. Criar função auxiliar para checar se o usuário logado pertence à household do registro
CREATE OR REPLACE FUNCTION public.user_belongs_to_household(h_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND household_id = h_id
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Novas políticas de RLS seguras por household
-- Households: O usuário só vê/edita a dele
CREATE POLICY "View own household" ON public.households
    FOR SELECT USING (public.user_belongs_to_household(id));
CREATE POLICY "Update own household" ON public.households
    FOR UPDATE USING (public.user_belongs_to_household(id));

-- Profiles: O usuário vê perfis da mesma household
CREATE POLICY "View household profiles" ON public.profiles
    FOR SELECT USING (
        id = auth.uid() OR 
        household_id IN (
            SELECT household_id FROM public.profiles WHERE id = auth.uid()
        )
    );
CREATE POLICY "Update own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Estoque (inventory): Acesso limitado à household do usuário
CREATE POLICY "Access inventory by household" ON public.inventory
    FOR ALL USING (public.user_belongs_to_household(household_id))
    WITH CHECK (public.user_belongs_to_household(household_id));

-- Manutenção (maintenance): Acesso limitado à household do usuário
CREATE POLICY "Access maintenance by household" ON public.maintenance
    FOR ALL USING (public.user_belongs_to_household(household_id))
    WITH CHECK (public.user_belongs_to_household(household_id));

-- 10. Trigger para associar novos cadastros de usuários à household padrão de forma automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, household_id)
  VALUES (new.id, '00000000-0000-0000-0000-000000000001');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Associar os usuários atuais existentes à household padrão
INSERT INTO public.profiles (id, household_id)
SELECT id, '00000000-0000-0000-0000-000000000001' FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 11. Tabela para guardar os Chat IDs autorizados do Telegram
CREATE TABLE public.telegram_authorized_chats (
    chat_id TEXT PRIMARY KEY,
    household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    user_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.telegram_authorized_chats ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Apenas membros do household podem ler/escrever configurações do Telegram
CREATE POLICY "Access telegram config by household" ON public.telegram_authorized_chats
    FOR ALL USING (public.user_belongs_to_household(household_id))
    WITH CHECK (public.user_belongs_to_household(household_id));
