import { ReactNode, useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Package, Wrench, Home, Settings, Maximize2, Minimize2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/integrations/supabase/AuthProvider";
import { WeatherWidget } from "./WeatherWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tabs = [
  { to: "/inventory", label: "Estoque", icon: Package },
  { to: "/maintenance", label: "Tarefas", icon: Wrench },
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Central de Comando", subtitle: "Sua casa em um relance" },
  "/inventory": { title: "Estoque", subtitle: "Acompanhe itens e suprimentos" },
  "/maintenance": { title: "Manutenção", subtitle: "Antecipe os cuidados da casa" },
  "/settings": { title: "Ajustes", subtitle: "Gerencie sua conta" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? titles["/"];
  const { user, signOut } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Erro ao alternar tela cheia:", err);
    }
  };

  const renderHeaderDropdown = (sizeClass = "h-11 w-11") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "rounded-full bg-gradient-primary flex items-center justify-center shadow-glow hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer shrink-0",
            sizeClass
          )}
          aria-label="Painel de controle"
        >
          <Home className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-3xl bg-card/95 backdrop-blur-xl border border-border/60 p-2 shadow-elevated">
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Central de Comando</span>
            <span className="text-xs font-semibold text-foreground truncate mt-0.5">{user?.email || "Usuário Local"}</span>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border/40 my-1" />
        
        <div className="px-3 py-2 flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
          </span>
          <span className="font-semibold text-success">Central Online</span>
          <span className="text-[10px] text-muted-foreground ml-auto">Supabase</span>
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-1" />

        <DropdownMenuItem onClick={toggleFullscreen} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-xs">Sair de Tela Cheia</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 text-primary" />
              <span className="font-medium text-xs">Modo Kiosk (Tela Cheia)</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/40 my-1" />

        <DropdownMenuItem onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut className="h-4 w-4" />
          <span className="font-medium text-xs">Sair da Conta</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">
      {/* Ambient cyan glow background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-card/40 backdrop-blur-xl border-r border-border/40 p-5 h-screen sticky top-0 justify-between shrink-0">
        <div className="space-y-6">
          {/* Sidebar Logo / Control icon */}
          <div className="flex items-center gap-3 py-2 border-b border-border/20">
            {renderHeaderDropdown("h-10 w-10")}
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-primary uppercase tracking-[0.18em]">Console</p>
              <h1 className="text-sm font-extrabold text-foreground tracking-tight leading-tight">Central Residencial</h1>
            </div>
          </div>

          {/* Sidebar navigation links */}
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-semibold text-sm",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm border border-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )
                }
              >
                <tab.icon className="h-5 w-5" strokeWidth={2.2} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar footer status */}
        <div className="border-t border-border/20 pt-4 flex flex-col gap-2">
          <div className="px-2 flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="font-semibold text-success">Sistema Ativo</span>
          </div>
          <p className="text-[10px] text-muted-foreground px-2 truncate" title={user?.email || ""}>
            {user?.email || "Usuário Local"}
          </p>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/40 md:bg-transparent md:backdrop-blur-none md:border-b-0">
          <div className="max-w-md md:max-w-5xl lg:max-w-7xl w-full mx-auto px-5 pt-6 pb-4 md:pt-8 md:pb-6 flex items-center gap-3">
            {/* Show dropdown home icon on mobile only */}
            <div className="md:hidden">
              {renderHeaderDropdown("h-11 w-11")}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary leading-none mb-1">
                {meta.subtitle}
              </p>
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-foreground leading-none truncate">
                {meta.title}
              </h1>
            </div>

            <WeatherWidget />
          </div>
        </header>

        <main className="flex-1 max-w-md md:max-w-5xl lg:max-w-7xl w-full mx-auto px-5 pb-36 md:pb-12 pt-3">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom md:hidden">
        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="relative bg-card/95 backdrop-blur-xl border border-border/60 rounded-[28px] shadow-elevated grid grid-cols-5 px-2 py-2">
            {tabs.map((tab) => {
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