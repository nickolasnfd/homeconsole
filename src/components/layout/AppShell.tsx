import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Package, Wrench, Wallet, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/inventory", label: "Estoque", icon: Package },
  { to: "/maintenance", label: "Tarefas", icon: Wrench },
  { to: "/", label: "Início", icon: Home, end: true, center: true },
  { to: "/finance", label: "Finanças", icon: Wallet },
  { to: "/settings", label: "Ajustes", icon: Settings, disabled: true },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Central de Comando", subtitle: "Sua casa em um relance" },
  "/inventory": { title: "Estoque", subtitle: "Acompanhe itens e suprimentos" },
  "/maintenance": { title: "Manutenção", subtitle: "Antecipe os cuidados da casa" },
  "/finance": { title: "Finanças", subtitle: "Contas e despesas" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? titles["/"];

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground">
      {/* Ambient cyan glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-md mx-auto px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
            <Home className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {meta.subtitle}
            </p>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight truncate">
              {meta.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-5 pb-36 pt-3">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-[28px] shadow-elevated grid grid-cols-5 px-2 py-2">
            {tabs.map((tab) => {
              if (tab.center) {
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    className="flex items-center justify-center"
                  >
                    <span className="-mt-8 h-16 w-16 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-fab ring-4 ring-background">
                      <tab.icon className="h-6 w-6" strokeWidth={2.4} />
                    </span>
                  </NavLink>
                );
              }
              if (tab.disabled) {
                return (
                  <button
                    key={tab.to}
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex flex-col items-center justify-center gap-1 py-2 rounded-2xl text-muted-foreground/40 cursor-not-allowed"
                  >
                    <tab.icon className="h-5 w-5" strokeWidth={2.2} />
                    <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
                  </button>
                );
              }
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <tab.icon className="h-5 w-5" strokeWidth={2.2} />
                  <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}