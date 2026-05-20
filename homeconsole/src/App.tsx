import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/integrations/supabase/AuthProvider";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";
import { AppShell } from "@/components/layout/AppShell";
import { Fab } from "@/components/layout/Fab";
import Auth from "@/pages/app/Auth";
import Dashboard from "@/pages/app/Dashboard";
import Inventory from "@/pages/app/Inventory";
import Maintenance from "@/pages/app/Maintenance";
import Settings from "@/pages/app/Settings";

const queryClient = new QueryClient();

const FabRouteAware = () => {
  const { pathname } = useLocation();
  if (pathname !== "/") return null;
  return <Fab />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="*" element={
                <>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppShell>
                  <FabRouteAware />
                </>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
