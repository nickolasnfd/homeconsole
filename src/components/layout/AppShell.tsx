import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Wrench, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/finance", label: "Finance", icon: Wallet },
];

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Command Center", subtitle: "Your home at a glance" },
  "/inventory": { title: "Inventory", subtitle: "Track stock & supplies" },
  "/maintenance": { title: "Maintenance", subtitle: "Stay ahead of upkeep" },
  "/finance": { title: "Finance", subtitle: "Bills & expenses" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = titles[pathname] ?? titles["/"];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-lg border-b border-border/60">
        <div className="max-w-md mx-auto px-5 pt-6 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {meta.subtitle}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {meta.title}
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-5 pb-32 pt-2">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 safe-bottom">
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="bg-primary text-primary-foreground rounded-2xl shadow-elevated grid grid-cols-4 p-1.5">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all",
                    isActive
                      ? "bg-primary-foreground/10 text-primary-foreground"
                      : "text-primary-foreground/60 hover:text-primary-foreground"
                  )
                }
              >
                <tab.icon className="h-5 w-5" strokeWidth={2.2} />
                <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}