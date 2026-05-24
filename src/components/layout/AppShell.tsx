import { ReactNode, useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Package, Wrench, Home, Settings } from "lucide-react";
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
import { Maximize2, Minimize2, LogOut } from "lucide-react";

const tabs: { to: string; label: string; icon: React.ElementType; end?: boolean }[] = [
  { to: "/inventory",    label: "Estoque", icon: Package },
  { to: "/maintenance",  label: "Tarefas",  icon: Wrench  },
  { to: "/",             label: "Início",   icon: Home,   end: true },
  { to: "/settings",     label: "Ajustes",  icon: Settings },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/":            { title: "Central de Comando", subtitle: "Início · sua casa em um relance" },
  "/inventory":   { title: "Estoque",            subtitle: "Estoque · itens e suprimentos" },
  "/maintenance": { title: "Manutenção",          subtitle: "Manutenção · cuidados da casa" },
  "/settings":    { title: "Ajustes",             subtitle: "Ajustes · conta e integrações" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? titles["/"];
  const { user, signOut } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };

  // Índice do tab ativo para posicionar o pill
  const activeIndex = useMemo(() => {
    if (pathname === "/") return 2;
    const idx = tabs.findIndex((t) => t.to !== "/" && pathname.startsWith(t.to));
    return idx;
  }, [pathname]);

  const renderMenu = (sizeClass = "h-10 w-10") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/15 active:scale-95 transition-all duration-200 cursor-pointer shrink-0",
            sizeClass
          )}
          aria-label="Painel de controle"
        >
          <Home className="h-4 w-4 text-primary" strokeWidth={2.2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-60 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/15 p-2 shadow-elevated"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="label-upper text-primary mb-1">Central de Comando</div>
          <span className="font-body text-xs font-medium text-foreground truncate block">
            {user?.email ?? "Usuário Local"}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border/40 my-1" />

        <div className="px-3 py-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="font-body text-xs font-semibold text-success">Sistema Ativo</span>
          <span className="font-body text-[10px] text-muted-foreground ml-auto">Supabase</span>
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-1" />

        <DropdownMenuItem
          onClick={toggleFullscreen}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
        >
          {isFullscreen
            ? <><Minimize2 className="h-4 w-4 text-primary" /><span className="font-body font-medium text-xs">Sair de Tela Cheia</span></>
            : <><Maximize2 className="h-4 w-4 text-primary" /><span className="font-body font-medium text-xs">Modo Kiosk</span></>
          }
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/40 my-1" />

        <DropdownMenuItem
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-body font-medium text-xs">Sair da Conta</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground">

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-card/50 backdrop-blur-xl border-r border-primary/10 p-5 h-screen sticky top-0 justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 py-2 border-b border-primary/10">
            {renderMenu("h-10 w-10")}
            <div className="min-w-0">
              <p className="label-upper text-primary">Console</p>
              <p className="font-display text-sm font-bold text-foreground tracking-tight leading-tight">
                Central Residencial
              </p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-body font-semibold text-sm",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                  )
                }
              >
                <tab.icon className="h-4 w-4" strokeWidth={2.2} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="border-t border-primary/10 pt-4 space-y-1">
          <div className="px-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="font-body text-xs font-semibold text-success">Sistema Ativo</span>
          </div>
          <p className="font-body text-[10px] text-muted-foreground px-2 truncate">
            {user?.email ?? "Usuário Local"}
          </p>
        </div>
      </aside>

      {/* VIEWPORT PRINCIPAL */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-primary/10 md:bg-transparent md:backdrop-blur-none md:border-b-0">
          <div className="max-w-md md:max-w-5xl lg:max-w-7xl w-full mx-auto px-5 pt-6 pb-4 md:pt-8 md:pb-6 flex items-center gap-3">
            <div className="md:hidden">{renderMenu("h-10 w-10")}</div>
            <div className="flex-1 min-w-0">
              <p className="label-upper text-primary leading-none mb-1">{meta.subtitle}</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-none tracking-tight truncate">
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

      {/* BOTTOM NAV MOBILE */}
      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom md:hidden">
        <div className="max-w-md mx-auto px-4 pb-4">
          <div className="relative bg-card/95 backdrop-blur-xl border border-primary/20 rounded-[22px] shadow-elevated grid grid-cols-4 p-1.5">
            {/* Pill deslizante */}
            {activeIndex >= 0 && (
              <div
                aria-hidden
                className="absolute top-1.5 bottom-1.5 rounded-[16px] bg-primary/10 border border-primary/25 shadow-[0_0_16px_hsl(172_100%_41%/0.08)] transition-[left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                style={{
                  width: "calc((100% - 12px) / 4)",
                  left: `calc(6px + ${activeIndex} * (100% - 12px) / 4)`,
                }}
              />
            )}
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "relative z-10 flex flex-col items-center justify-center gap-1 py-2.5 rounded-[16px] transition-all",
                    isActive ? "text-primary" : "text-muted-foreground/60"
                  )
                }
              >
                <tab.icon className="h-4 w-4" strokeWidth={2.2} />
                <span className="font-body text-[9px] font-semibold tracking-wide">{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
