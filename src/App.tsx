import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import { AppShell } from "@/components/layout/AppShell";
import { Fab } from "@/components/layout/Fab";
import Dashboard from "@/pages/app/Dashboard";
import Inventory from "@/pages/app/Inventory";
import Maintenance from "@/pages/app/Maintenance";
import Finance from "@/pages/app/Finance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
        <Fab />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
