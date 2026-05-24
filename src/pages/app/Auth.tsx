import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Home } from "lucide-react";

export default function Auth() {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // If already logged in, redirect to home
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada com sucesso! Faça login.");
        setIsSignUp(false);
        setPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      } else {
        toast.success("Bem-vindo de volta!");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center text-foreground px-5 relative overflow-hidden">
      <div className="max-w-sm w-full mx-auto space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center shadow-glow">
            <Home className="h-6 w-6 text-primary" strokeWidth={2.2} />
          </div>
          <div>
            <p className="label-upper text-primary mb-2">Central de Comando</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              {isSignUp ? "Criar Conta" : "Bem-vindo"}
            </h1>
            <p className="font-body text-sm text-muted-foreground mt-1">
              {isSignUp ? "Registre-se para continuar" : "Entre na sua residência"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="relative overflow-hidden bg-card/60 backdrop-blur-xl border border-primary/15 rounded-2xl p-6 card-highlight shadow-elevated">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="label-upper text-muted-foreground block">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-primary/15 h-11 font-body rounded-xl focus:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="label-upper text-muted-foreground block">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-primary/15 h-11 font-body rounded-xl focus:border-primary/40"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-body font-semibold mt-2 bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 rounded-xl"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setPassword(""); }}
              className="font-body text-sm text-primary/70 hover:text-primary transition-colors"
            >
              {isSignUp ? "Já tem uma conta? Faça login" : "Não tem conta? Crie uma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
