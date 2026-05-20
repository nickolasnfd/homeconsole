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
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="max-w-sm w-full mx-auto space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <Home className="h-7 w-7 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isSignUp ? "Criar Conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Central de Comando Residencial
            </p>
          </div>
        </div>

        <div className="bg-card/60 backdrop-blur-xl border border-border/60 rounded-[24px] p-6 shadow-elevated">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold mt-2" disabled={loading}>
              {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
              }}
              className="text-primary font-medium hover:underline transition-all"
            >
              {isSignUp ? "Já tem uma conta? Faça login" : "Não tem conta? Crie uma"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
