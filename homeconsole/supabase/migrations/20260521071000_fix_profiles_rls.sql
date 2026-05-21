-- Remover a política que causa recursão infinita
DROP POLICY IF EXISTS "View household profiles" ON public.profiles;

-- Criar política simples: o usuário só vê o seu próprio perfil
CREATE POLICY "View own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid());
