
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Code, Database, MessageSquare, Home } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const year = new Date().getFullYear();
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <div className="mb-8">
          <div className="h-10 w-10 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
            K
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-6 flex-1">
          <Link 
            to="/" 
            className={`p-2 rounded-lg ${location.pathname === '/' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Home size={24} />
          </Link>
          <Link 
            to="/chat" 
            className={`p-2 rounded-lg ${location.pathname === '/chat' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <MessageSquare size={24} />
          </Link>
          <Link 
            to="/code-converter" 
            className={`p-2 rounded-lg ${location.pathname === '/code-converter' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Code size={24} />
          </Link>
          <Link 
            to="/document-ingestion" 
            className={`p-2 rounded-lg ${location.pathname === '/document-ingestion' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <FileText size={24} />
          </Link>
          <Link 
            to="/knowledge-base" 
            className={`p-2 rounded-lg ${location.pathname === '/knowledge-base' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Database size={24} />
          </Link>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold">
              K
            </div>
            <span className="text-gray-700 font-medium">IK</span>
          </div>
          
          <div className="flex space-x-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <Link 
                to="/" 
                className={`px-4 py-2 ${location.pathname === '/' ? 'bg-white text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Home
              </Link>
              <Link 
                to="/chat" 
                className={`px-4 py-2 ${location.pathname === '/chat' ? 'bg-white text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Chat
              </Link>
              <Link 
                to="/code-converter" 
                className={`px-4 py-2 ${location.pathname.includes('code-converter') ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Code Converter
              </Link>
              <Link 
                to="/document-ingestion" 
                className={`px-4 py-2 ${location.pathname === '/document-ingestion' ? 'bg-white text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Document Ingestion
              </Link>
              <Link 
                to="/knowledge-base" 
                className={`px-4 py-2 ${location.pathname === '/knowledge-base' ? 'bg-white text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Knowledge Base
              </Link>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 h-6 flex items-center px-6 text-xs text-gray-500">
          <span>{year} IK</span>
          <span className="ml-auto">v1.0.0</span>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
