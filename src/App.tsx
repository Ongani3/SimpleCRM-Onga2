import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import Profile from "./pages/Profile";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmailConfirmation from "./pages/EmailConfirmation";
import Settings from "./pages/Settings";
import CustomerPortal from "./pages/CustomerPortal";
import CustomerAuth from "./pages/CustomerAuth";
import CustomerDetails from "./components/CustomerDetails";
import NotFound from "./pages/NotFound";
import TestPage from "./pages/TestPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/customer" element={<CustomerPortal />} />
        <Route path="/customer/auth" element={<CustomerAuth />} />
        <Route path="/customer/:customerId" element={<CustomerDetails />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
