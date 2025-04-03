
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import CodeConverter from "./pages/CodeConverter";
import DocumentIngestion from "./pages/DocumentIngestion";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";

// Add custom CSS for styling
import "./styles/custom.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/chat" element={<Layout><Chat /></Layout>} />
          <Route path="/code-converter" element={<Layout><CodeConverter /></Layout>} />
          <Route path="/document-ingestion" element={<Layout><DocumentIngestion /></Layout>} />
          <Route path="/knowledge-base" element={<Layout><KnowledgeBase /></Layout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
