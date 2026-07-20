import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { FloatWhatsAppBot } from "@/components/ui/FloatWhatsAppBot";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import MatriculaAlumno from "./pages/MatriculaAlumno";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const basename = import.meta.env.MODE === 'production' ? '/matriculas-cea/' : '/';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
           <Routes>
             <Route path="/" element={<Index />} />
             <Route path="/auth" element={<Auth />} />
             <Route path="/matricula/:token" element={<MatriculaAlumno />} />
             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
             <Route path="*" element={<NotFound />} />
           </Routes>
        </HashRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
