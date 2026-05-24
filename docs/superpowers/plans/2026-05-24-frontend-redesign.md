# Frontend Redesign — Mission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestilizar toda a camada visual da Central de Comando Residencial com identidade Mission Control — tipografia Rajdhani + Outfit, paleta dark profunda com cyan, bottom nav com pill deslizante — sem tocar em nenhuma lógica de dados ou estrutura JSX.

**Architecture:** Camada visual only. CSS variables em `index.css`, font families em `tailwind.config.ts`, `index.html` com Google Fonts. Todos os componentes são reestilizados in-place — nenhum arquivo de lógica (hooks, lib, integrations, api) é tocado.

**Tech Stack:** React, TypeScript, Tailwind CSS v3, shadcn/ui, Vite, Google Fonts (Rajdhani + Outfit)

---

### Task 1: Fontes e configuração Tailwind

**Files:**
- Modify: `index.html`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Atualizar Google Fonts em `index.html`**

Substituir a linha do Inter pelo par Rajdhani + Outfit:

```html
<!-- remover: -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

<!-- adicionar no lugar: -->
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
```

Também atualizar `theme-color` para refletir o novo background:

```html
<meta name="theme-color" content="#060c16" />
```

- [ ] **Step 2: Adicionar fontFamily ao `tailwind.config.ts`**

Dentro de `theme.extend`, adicionar:

```ts
fontFamily: {
  display: ['Rajdhani', 'sans-serif'],
  body: ['Outfit', 'sans-serif'],
},
```

- [ ] **Step 3: Commit**

```bash
git add index.html tailwind.config.ts
git commit -m "feat: add Rajdhani + Outfit fonts and extend tailwind fontFamily"
```

---

### Task 2: CSS Variables e utilitários globais

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Substituir todo o conteúdo de `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Mission Control — deep dark + cyan */
    --background: 217 64% 6%;
    --foreground: 164 37% 90%;

    --card: 215 52% 10%;
    --card-foreground: 164 37% 90%;

    --popover: 215 52% 10%;
    --popover-foreground: 164 37% 90%;

    /* Cyan principal */
    --primary: 172 100% 41%;
    --primary-foreground: 217 64% 6%;

    --secondary: 213 48% 13%;
    --secondary-foreground: 164 37% 90%;

    --muted: 213 48% 13%;
    --muted-foreground: 164 25% 38%;

    --accent: 172 100% 41%;
    --accent-foreground: 217 64% 6%;

    --destructive: 0 100% 64%;
    --destructive-foreground: 0 0% 100%;

    --success: 152 84% 39%;
    --success-foreground: 0 0% 100%;

    --warning: 38 92% 50%;
    --warning-foreground: 217 64% 6%;

    /* Border neutro para inputs/dividers; cards usam border-primary/10 */
    --border: 213 35% 18%;
    --input: 213 40% 15%;
    --ring: 172 100% 41%;

    --radius: 0.875rem;

    --gradient-primary: linear-gradient(135deg, hsl(172 100% 41%), hsl(185 100% 38%));
    --shadow-card: 0 1px 3px 0 hsl(217 64% 2% / 0.5), 0 8px 24px -8px hsl(217 64% 2% / 0.6);
    --shadow-elevated: 0 10px 30px -8px hsl(217 64% 2% / 0.7), 0 4px 10px -2px hsl(217 64% 2% / 0.4);
    --shadow-fab: 0 8px 24px -4px hsl(172 100% 41% / 0.4), 0 4px 12px -2px hsl(172 100% 41% / 0.25);
    --shadow-glow: 0 0 20px hsl(172 100% 41% / 0.3);

    --sidebar-background: 215 52% 10%;
    --sidebar-foreground: 164 37% 90%;
    --sidebar-primary: 172 100% 41%;
    --sidebar-primary-foreground: 217 64% 6%;
    --sidebar-accent: 213 48% 13%;
    --sidebar-accent-foreground: 164 37% 90%;
    --sidebar-border: 213 35% 18%;
    --sidebar-ring: 172 100% 41%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  }

  /* Grid overlay global */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    pointer-events: none;
    background-image:
      linear-gradient(hsl(172 100% 41% / 0.025) 1px, transparent 1px),
      linear-gradient(90deg, hsl(172 100% 41% / 0.025) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* Ambient glows */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(ellipse 60% 40% at 5% 5%, hsl(172 100% 41% / 0.07) 0%, transparent 100%),
      radial-gradient(ellipse 50% 35% at 95% 90%, hsl(200 100% 50% / 0.04) 0%, transparent 100%);
  }
}

@layer utilities {
  .shadow-card    { box-shadow: var(--shadow-card); }
  .shadow-elevated { box-shadow: var(--shadow-elevated); }
  .shadow-fab     { box-shadow: var(--shadow-fab); }
  .shadow-glow    { box-shadow: var(--shadow-glow); }

  .bg-gradient-primary { background-image: var(--gradient-primary); }

  /* Linha de topo em cards Mission Control */
  .card-highlight::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, hsl(172 100% 41% / 0.5), transparent);
    pointer-events: none;
  }

  /* Utilitários de tipografia */
  .font-display { font-family: 'Rajdhani', sans-serif; }
  .font-body    { font-family: 'Outfit', sans-serif; }
  .label-upper  {
    font-family: 'Rajdhani', sans-serif;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  /* Badges semânticos */
  .badge {
    display: inline-flex;
    align-items: center;
    font-family: 'Outfit', sans-serif;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 99px;
    letter-spacing: 0.04em;
  }
  .badge-red    { background: hsl(0 100% 64% / 0.1);   color: hsl(0 100% 64%);   border: 1px solid hsl(0 100% 64% / 0.2); }
  .badge-amber  { background: hsl(38 92% 50% / 0.1);   color: hsl(38 92% 50%);   border: 1px solid hsl(38 92% 50% / 0.2); }
  .badge-green  { background: hsl(152 84% 39% / 0.1);  color: hsl(152 84% 39%);  border: 1px solid hsl(152 84% 39% / 0.2); }
  .badge-cyan   { background: hsl(172 100% 41% / 0.1); color: hsl(172 100% 41%); border: 1px solid hsl(172 100% 41% / 0.2); }

  /* Barra de status lateral (manutenção) */
  .status-bar {
    width: 3px;
    border-radius: 2px;
    flex-shrink: 0;
    align-self: stretch;
  }
  .status-bar-red   { background: hsl(0 100% 64%);  box-shadow: 0 0 8px hsl(0 100% 64% / 0.5); }
  .status-bar-amber { background: hsl(38 92% 50%); }
  .status-bar-green { background: hsl(152 84% 39%); }
  .status-bar-muted { background: hsl(164 25% 38%); }

  .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
  .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
  .scrollbar-none::-webkit-scrollbar { display: none; }
}
```

- [ ] **Step 2: Verificar compilação TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros (ou apenas warnings pré-existentes).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: mission control design system — CSS variables, grid overlay, utilities"
```

---

### Task 3: AppShell — header, bottom nav pill, sidebar

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Substituir `AppShell.tsx` completo**

```tsx
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

const tabs = [
  { to: "/inventory",    label: "Estoque", icon: Package },
  { to: "/maintenance",  label: "Tarefas",  icon: Wrench  },
  { to: "/",             label: "Início",   icon: Home,   end: true },
  { to: "/settings",     label: "Ajustes",  icon: Settings },
] as const;

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
    return idx >= 0 ? idx : 2;
  }, [pathname]);

  const renderMenu = (sizeClass = "h-10 w-10") => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/15 active:scale-95 transition-all duration-200 cursor-pointer shrink-0",
            sizeClass
          )}
          aria-label="Menu"
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
              <h1 className="font-display text-sm font-bold text-foreground tracking-tight leading-tight">
                Central Residencial
              </h1>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={"end" in tab ? tab.end : undefined}
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
            <div
              aria-hidden
              className="absolute top-1.5 bottom-1.5 rounded-[16px] bg-primary/10 border border-primary/25 shadow-[0_0_16px_hsl(172_100%_41%/0.08)] transition-[left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                width: "calc((100% - 12px) / 4)",
                left: `calc(6px + ${activeIndex} * (100% - 12px) / 4)`,
              }}
            />
            {tabs.map((tab, i) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={"end" in tab ? tab.end : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative z-10 flex flex-col items-center justify-center gap-1 py-2.5 rounded-[16px] transition-all",
                    isActive ? "text-primary" : "text-muted-foreground/40"
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
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```
Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: mission control AppShell — pill nav, display typography, sidebar"
```

---

### Task 4: Dashboard

**Files:**
- Modify: `src/pages/app/Dashboard.tsx`

- [ ] **Step 1: Substituir `Dashboard.tsx` completo**

```tsx
import { useMemo, useState } from "react";
import { useTable } from "@/hooks/useTable";
import { daysUntil, formatDate } from "@/lib/format";
import { AlertTriangle, Wrench, Package, MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { sendTelegramMessage } from "@/lib/telegram";
import { toast } from "sonner";

export default function Dashboard() {
  const inventory = useTable<any>("inventory", { column: "name" });
  const maintenance = useTable<any>("maintenance", { column: "next_due_date" });
  const [sendingReport, setSendingReport] = useState(false);

  const lowStock = (inventory.data ?? []).filter(
    (i) => Number(i.current_qty) < Number(i.min_threshold)
  );
  const criticalMaint = (maintenance.data ?? []).filter(
    (m) => daysUntil(m.next_due_date) < 7
  );
  const overdueMaint = (maintenance.data ?? []).filter(
    (m) => !m.completed && daysUntil(m.next_due_date) < 0
  );

  const alerts = [
    overdueMaint.length > 0 && {
      to: "/maintenance",
      tone: "red" as const,
      label: `${overdueMaint.length} manutenç${overdueMaint.length === 1 ? "ão atrasada" : "ões atrasadas"}`,
    },
    lowStock.length > 0 && {
      to: "/inventory",
      tone: "amber" as const,
      label: `${lowStock.length} ${lowStock.length === 1 ? "item em falta" : "itens em falta"}`,
    },
  ].filter(Boolean) as { to: string; tone: "red" | "amber"; label: string }[];

  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    try {
      let text = `🏠 *CENTRAL RESIDENCIAL - STATUS GERAL*\n\n`;
      if (lowStock.length > 0) {
        text += `📦 *Estoque (Itens em Falta):*\n`;
        lowStock.forEach((i) => {
          text += `• ${i.name}: falta ${Number(i.min_threshold) - Number(i.current_qty)} ${i.unit} (Mín: ${i.min_threshold})\n`;
        });
        text += `\n`;
      } else {
        text += `🟢 *Estoque:* Nível de suprimentos saudável!\n\n`;
      }
      const pendingTasks = (maintenance.data ?? []).filter((m) => !m.completed);
      if (pendingTasks.length > 0) {
        text += `🔧 *Manutenção (Tarefas Pendentes):*\n`;
        pendingTasks.forEach((m) => {
          const days = daysUntil(m.next_due_date);
          const statusText =
            days < 0 ? `🚨 ${Math.abs(days)}d atrasada`
            : days === 0 ? `⚠️ vence hoje`
            : `📅 em ${days}d`;
          text += `• ${m.title}: _${statusText}_\n`;
        });
      } else {
        text += `🟢 *Manutenção:* Nenhuma tarefa pendente!\n`;
      }
      await sendTelegramMessage(text);
      toast.success("Relatório enviado para o Telegram!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar relatório.");
    } finally {
      setSendingReport(false);
    }
  };

  const invTotal = (inventory.data ?? []).length;
  const maintData = maintenance.data ?? [];

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link
              key={i}
              to={a.to}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 active:scale-[0.99] transition-transform ${
                a.tone === "red"
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-warning/10 border-warning/20 text-warning"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  a.tone === "red"
                    ? "bg-destructive shadow-[0_0_6px_hsl(0_100%_64%)]"
                    : "bg-warning"
                }`}
              />
              <span className="font-body text-sm font-medium flex-1 min-w-0 truncate">
                {a.label}
              </span>
              <span className="font-body text-xs opacity-60">›</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Estoque"
          value={invTotal}
          sub={lowStock.length > 0 ? `${lowStock.length} abaixo do mínimo` : "todos em ordem"}
          tone={lowStock.length > 0 ? "red" : "cyan"}
          pct={invTotal > 0 ? Math.round((lowStock.length / invTotal) * 100) : 0}
          to="/inventory"
        />
        <MaintStatCard items={maintData} />
      </div>

      {/* Relatório Telegram */}
      <div className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
          <MessageSquare className="h-4 w-4 text-sky-400" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-foreground">Relatório Telegram</p>
          <p className="font-body text-[11px] text-muted-foreground mt-0.5">
            Status consolidado para o celular
          </p>
        </div>
        <button
          onClick={handleSendTelegramReport}
          disabled={sendingReport}
          className="h-8 px-3.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400 font-body text-xs font-semibold flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          {sendingReport ? "..." : "Enviar"}
        </button>
      </div>

      {/* Tarefas críticas */}
      {criticalMaint.length > 0 && (
        <div className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight space-y-1">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Próximas 7 dias
            </h2>
            <span className="label-upper text-muted-foreground">{criticalMaint.length} tarefa{criticalMaint.length !== 1 ? "s" : ""}</span>
          </div>
          {criticalMaint.slice(0, 3).map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 border-t border-primary/5 first:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-body text-sm font-medium truncate">{m.title}</p>
                <p className="font-body text-[11px] text-muted-foreground">
                  Vence {formatDate(m.next_due_date)}
                </p>
              </div>
              <AlertTriangle className="h-3.5 w-3.5 text-warning ml-3 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, tone, pct, to,
}: {
  label: string; value: number; sub: string;
  tone: "cyan" | "red" | "amber"; pct: number; to: string;
}) {
  const valueColor =
    tone === "red" ? "text-destructive"
    : tone === "amber" ? "text-warning"
    : "text-primary";
  const barColor =
    tone === "red" ? "bg-destructive"
    : tone === "amber" ? "bg-warning"
    : "bg-primary";

  return (
    <Link
      to={to}
      className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight block active:scale-[0.98] transition-transform"
    >
      <p className="label-upper text-muted-foreground mb-2">{label}</p>
      <p className={`font-display text-4xl font-bold leading-none ${valueColor}`}>{value}</p>
      <p className="font-body text-[11px] text-muted-foreground mt-1.5 truncate">{sub}</p>
      <div className="mt-3 h-[3px] bg-primary/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, pct || (value > 0 ? 100 : 0))}%` }}
        />
      </div>
    </Link>
  );
}

function MaintStatCard({ items }: { items: any[] }) {
  const { overdue, soon, ok, done } = useMemo(() => {
    let overdue = 0, soon = 0, ok = 0, done = 0;
    items.forEach((m) => {
      if (m.completed) { done++; return; }
      const d = daysUntil(m.next_due_date);
      if (d < 0) overdue++;
      else if (d < 7) soon++;
      else ok++;
    });
    return { overdue, soon, ok, done };
  }, [items]);

  const headline =
    overdue > 0 ? { value: overdue, label: "Atrasadas", cls: "text-destructive" }
    : soon > 0  ? { value: soon,   label: "Em breve",  cls: "text-warning" }
    : { value: ok, label: "Em dia", cls: "text-success" };

  return (
    <Link
      to="/maintenance"
      className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-4 card-highlight block active:scale-[0.98] transition-transform"
    >
      <p className="label-upper text-muted-foreground mb-2">Manutenção</p>
      <p className={`font-display text-4xl font-bold leading-none ${headline.cls}`}>
        {headline.value}
      </p>
      <p className="font-body text-[11px] text-muted-foreground mt-1.5">{headline.label}</p>
      <div className="mt-3 flex gap-1">
        {overdue > 0 && (
          <div
            className="h-[3px] rounded-full bg-destructive"
            style={{ flex: overdue }}
          />
        )}
        {soon > 0 && (
          <div className="h-[3px] rounded-full bg-warning" style={{ flex: soon }} />
        )}
        {ok > 0 && (
          <div className="h-[3px] rounded-full bg-success" style={{ flex: ok }} />
        )}
        {done > 0 && (
          <div
            className="h-[3px] rounded-full bg-muted-foreground/30"
            style={{ flex: done }}
          />
        )}
        {items.length === 0 && (
          <div className="h-[3px] rounded-full bg-primary/5 flex-1" />
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/app/Dashboard.tsx
git commit -m "feat: mission control Dashboard — stat cards, alert rows, telegram card"
```

---

### Task 5: Inventory

**Files:**
- Modify: `src/pages/app/Inventory.tsx`

- [ ] **Step 1: Reestilizar cards de item e seções**

Localizar e substituir apenas o bloco do item card (dentro do `items.map((i) => {`). Substituir o `return (` e seu JSX completo por:

```tsx
return (
  <div
    key={i.id}
    role="button"
    tabIndex={0}
    onClick={() => setEditing(i)}
    onKeyDown={(e) => { if (e.key === "Enter") setEditing(i); }}
    className={`relative overflow-hidden bg-card/60 border rounded-xl p-3.5 cursor-pointer card-highlight active:scale-[0.99] transition-transform ${
      low ? "border-destructive/25" : "border-primary/10"
    }`}
  >
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
        low ? "bg-destructive/10 border border-destructive/20" : "bg-primary/10 border border-primary/20"
      }`}>
        <Package className={`h-4 w-4 ${low ? "text-destructive" : "text-primary"}`} strokeWidth={2.2} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-body font-semibold text-sm truncate">{i.name}</p>
          {low && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {i.category && (
            <span className="font-body text-[10px] text-muted-foreground">{i.category}</span>
          )}
          {i.expires_at && (
            <span className={`badge ${
              expired ? "badge-red" : expiringSoon ? "badge-amber" : "badge-cyan"
            }`}>
              {expired ? "Vencido" : expiringSoon ? `${exp}d` : formatDate(i.expires_at)}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-[3px] bg-primary/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${low ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Qty + controls */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); remove(i); }}
          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); adjust(i.id, i.current_qty, -1); }}
            className="h-7 w-7 rounded-lg bg-card border border-primary/15 flex items-center justify-center active:scale-95 transition-transform hover:border-primary/30"
          >
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="font-display font-bold text-base tabular-nums w-12 text-center">
            {i.current_qty}
            <span className="font-body text-[10px] font-normal text-muted-foreground ml-0.5">{i.unit}</span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); adjust(i.id, i.current_qty, 1); }}
            className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center active:scale-95 transition-transform hover:bg-primary/25"
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
        <span className={`badge ${low ? "badge-red" : "badge-green"}`}>
          {low ? `falta ${need} ${i.unit}` : "OK"}
        </span>
      </div>
    </div>
  </div>
);
```

- [ ] **Step 2: Reestilizar `AccordionItem` (cabeçalho de categoria)**

Localizar o `<AccordionItem>` e substituir `className` por:
```tsx
className="border border-primary/10 rounded-xl bg-card/40 px-3 data-[state=open]:bg-card/60 data-[state=open]:border-primary/15"
```

- [ ] **Step 3: Reestilizar search input e tabs**

Substituir a classe do `<Input>` de busca:
```tsx
className="pl-9 h-10 rounded-xl bg-card/60 border-primary/15 font-body text-sm"
```

Substituir as classes de `<TabsList>`:
```tsx
className="grid grid-cols-3 w-full rounded-xl bg-card/60 border border-primary/10 p-1"
```

Substituir as classes de cada `<TabsTrigger>`:
```tsx
className="rounded-lg font-body text-xs font-semibold data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/25"
```

- [ ] **Step 4: Reestilizar FAB do carrinho**

```tsx
className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary/15 border border-primary/30 text-primary shadow-glow active:scale-95 flex items-center justify-center transition-all hover:bg-primary/25"
```

- [ ] **Step 5: Verificar TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/app/Inventory.tsx
git commit -m "feat: mission control Inventory — item cards, progress bars, badges"
```

---

### Task 6: Maintenance

**Files:**
- Modify: `src/pages/app/Maintenance.tsx`

- [ ] **Step 1: Substituir o item card de manutenção**

Localizar o bloco `return (` dentro do `visible.map((m) => {` e substituir por:

```tsx
const barClass =
  isDone ? "status-bar status-bar-muted"
  : overdue ? "status-bar status-bar-red"
  : critical ? "status-bar status-bar-amber"
  : "status-bar status-bar-green";

return (
  <div
    key={m.id}
    role="button"
    tabIndex={0}
    onClick={() => setEditing(m)}
    onKeyDown={(e) => { if (e.key === "Enter") setEditing(m); }}
    className="relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-3.5 cursor-pointer card-highlight active:scale-[0.99] transition-transform flex gap-3"
  >
    {/* Barra lateral de status */}
    <div className={barClass} />

    {/* Conteúdo */}
    <div className="flex-1 min-w-0">
      <p className="font-body font-semibold text-sm">{m.title}</p>
      {m.description && (
        <p className="font-body text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
          {m.description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`badge ${
          isDone ? "badge-cyan"
          : overdue ? "badge-red"
          : critical ? "badge-amber"
          : "badge-green"
        }`}>{label}</span>
        <span className="font-body text-[10px] text-muted-foreground">{freqLabel}</span>
        <span className="font-body text-[10px] text-muted-foreground">· {priorityLabel(m.priority_level)}</span>
      </div>
      <p className="font-body text-[10px] text-muted-foreground mt-1.5">
        Próxima: {formatDate(m.next_due_date)}
      </p>
    </div>

    {/* Ações */}
    <div className="flex flex-col gap-1.5 shrink-0">
      {!isDone && (
        <button
          onClick={(e) => { e.stopPropagation(); complete(m); }}
          className="h-8 w-8 rounded-lg bg-success/10 border border-success/25 text-success flex items-center justify-center active:scale-95 transition-all hover:bg-success/20"
          aria-label="Concluir"
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); remove(m.id); }}
        className="h-8 w-8 rounded-lg bg-card border border-primary/10 text-muted-foreground flex items-center justify-center active:scale-95 transition-all hover:text-destructive hover:border-destructive/20"
        aria-label="Excluir"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);
```

- [ ] **Step 2: Reestilizar Tabs de filtro**

Substituir `<TabsList>`:
```tsx
className="grid grid-cols-5 w-full h-auto rounded-xl bg-card/60 border border-primary/10 p-1"
```

Cada `<TabsTrigger>`:
```tsx
className="text-[10px] px-1 font-body font-semibold rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-primary/20"
```

- [ ] **Step 3: Verificar TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/app/Maintenance.tsx
git commit -m "feat: mission control Maintenance — status bar cards, action buttons, tabs"
```

---

### Task 7: Auth, Settings e Fab

**Files:**
- Modify: `src/pages/app/Auth.tsx`
- Modify: `src/pages/app/Settings.tsx`
- Modify: `src/components/layout/Fab.tsx`

- [ ] **Step 1: Reestilizar `Auth.tsx`**

Substituir o JSX retornado mantendo toda a lógica:

```tsx
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
```

- [ ] **Step 2: Reestilizar sections em `Settings.tsx`**

Substituir as classes dos `<section>` de `"bg-card border border-border/60 rounded-[22px] p-5 shadow-card"` para:
```
"relative overflow-hidden bg-card/60 border border-primary/10 rounded-xl p-5 card-highlight"
```

Substituir `<h2 className="text-sm font-semibold">` por:
```tsx
<h2 className="font-display text-sm font-semibold text-foreground">
```

Substituir o `<div>` do avatar da conta por:
```tsx
<div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
  <UserIcon className="h-5 w-5" />
</div>
```

Substituir o botão "Sair":
```tsx
<Button
  variant="ghost"
  className="w-full gap-2 rounded-xl h-11 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20"
  onClick={signOut}
>
  <LogOut className="h-4 w-4" />
  Sair da conta
</Button>
```

- [ ] **Step 3: Reestilizar `Fab.tsx`**

Substituir a `className` do botão FAB:
```tsx
className="fixed z-50 bottom-32 right-5 h-14 w-14 rounded-full bg-primary/15 border border-primary/30 text-primary shadow-glow flex items-center justify-center active:scale-95 transition-all hover:bg-primary/25 hover:shadow-[0_0_24px_hsl(172_100%_41%/0.4)]"
```

- [ ] **Step 4: Verificar TypeScript**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/app/Auth.tsx src/pages/app/Settings.tsx src/components/layout/Fab.tsx
git commit -m "feat: mission control Auth, Settings, Fab — complete visual redesign"
```

---

### Task 8: Verificação final

**Files:** nenhum arquivo novo

- [ ] **Step 1: Subir o servidor de desenvolvimento**

```bash
cd /home/nickolasdantas/Projects/homeconsole/homeconsole && bun run dev 2>&1 &
```

- [ ] **Step 2: Verificar cada rota visualmente**

Abrir no navegador e conferir:
- `/auth` — logo + form com estilo Mission Control
- `/` — dashboard com stat cards, alertas, telegram card, bottom nav pill
- `/inventory` — cards de item com progress bar e badges
- `/maintenance` — task cards com barra lateral colorida
- `/settings` — sections estilizadas

Verificar especificamente:
- Pill deslizante na bottom nav ao trocar de tab
- Grid overlay visível sutilmente no fundo
- Tipografia Rajdhani nos títulos e labels uppercase
- Tipografia Outfit no corpo do texto
- Bordas com tom cyan nas cards

- [ ] **Step 3: Verificar ausência de regressões funcionais**

- Adicionar um item de estoque (via FAB)
- Ajustar quantidade de um item (botões +/−)
- Marcar uma manutenção como concluída
- Confirmar que toasts aparecem corretamente

- [ ] **Step 4: Commit final se ajustes de polish foram necessários**

```bash
git add -p  # adicionar apenas os arquivos polidos
git commit -m "fix: visual polish after mission control redesign"
```
