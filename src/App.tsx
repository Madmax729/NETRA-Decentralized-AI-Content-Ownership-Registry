import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import NFTMarketplace from "./pages/NFTMarketplace";
import Provenance from "./pages/Provenance";
import WalletDetails from "./pages/WalletDetails";
import Watermark from "./pages/Watermark";
import Verify from "./pages/Verify";
import IPFS from "./pages/IPFS";
import Generate from "./pages/Generate";
import Plagiarism from "./pages/Plagiarism";
import NotFound from "./pages/NotFound";
import { WalletProvider } from "@/hooks/use-wallet";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <div key={location.pathname} className="animate-fade-in">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<NFTMarketplace />} />
        <Route path="/provenance" element={<Provenance />} />
        <Route path="/wallet" element={<WalletDetails />} />
        <Route path="/watermark" element={<Watermark />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/ipfs" element={<IPFS />} />
        <Route path="/generate" element={<Generate />} />
        <Route path="/plagiarism" element={<Plagiarism />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WalletProvider>
        <BrowserRouter>
          <Navigation />
          <AnimatedRoutes />
        </BrowserRouter>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
