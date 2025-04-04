
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
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "./components/AuthProvider";
import PrivateRoute from "./components/PrivateRoute";

// Add custom CSS for styling
import "./styles/custom.css";

function App() {
  // Create a QueryClient instance inside the component
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/chat" 
                element={
                  <PrivateRoute>
                    <Layout><Chat /></Layout>
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/code-converter" 
                element={
                  <PrivateRoute>
                    <Layout><CodeConverter /></Layout>
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/document-ingestion" 
                element={
                  <PrivateRoute>
                    <Layout><DocumentIngestion /></Layout>
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/knowledge-base" 
                element={
                  <PrivateRoute>
                    <Layout><KnowledgeBase /></Layout>
                  </PrivateRoute>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
