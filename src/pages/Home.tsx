
import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Code, Database, MessageSquare } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div>
          <h1 className="text-3xl font-bold text-green-700 mb-2">Knowledge Management AI</h1>
          <p className="text-gray-600 mb-8">Access, convert, and integrate knowledge with advanced AI search.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 mr-4">
                <MessageSquare size={24} />
              </div>
              <h2 className="text-xl font-semibold">AI Chat</h2>
            </div>
            <p className="text-gray-600 mb-4">Ask questions and get instant answers with a conversational AI assistant.</p>
            <Link to="/chat" className="text-green-700 hover:text-green-800 font-medium">Get Started</Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 mr-4">
                <Code size={24} />
              </div>
              <h2 className="text-xl font-semibold">Code Converter</h2>
            </div>
            <p className="text-gray-600 mb-4">Translate code between different programming languages with precision.</p>
            <Link to="/code-converter" className="text-green-700 hover:text-green-800 font-medium">Get Started</Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 mr-4">
                <FileText size={24} />
              </div>
              <h2 className="text-xl font-semibold">Document Ingestion</h2>
            </div>
            <p className="text-gray-600 mb-4">Upload and process documents to enhance your knowledge base.</p>
            <Link to="/document-ingestion" className="text-green-700 hover:text-green-800 font-medium">Get Started</Link>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 mr-4">
                <Database size={24} />
              </div>
              <h2 className="text-xl font-semibold">Knowledge Base</h2>
            </div>
            <p className="text-gray-600 mb-4">Search and retrieve information from your centralized knowledge repository.</p>
            <Link to="/knowledge-base" className="text-green-700 hover:text-green-800 font-medium">Get Started</Link>
          </div>
        </div>
      </div>
      
      <div className="mt-auto">
        <h2 className="text-lg font-semibold mb-3">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium mb-2">Integrated with Azure AI Services</h3>
            <p className="text-sm text-gray-600">Leveraging Azure OpenAI and AI Search services to provide enterprise-grade intelligence and security.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium mb-2">Code Converter</h3>
            <p className="text-sm text-gray-600">Translate code between different programming languages with precise syntax preservation.</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium mb-2">Document Ingestion</h3>
            <p className="text-sm text-gray-600">Used and process documents to enhance knowledge base for RAG/LLM-enhanced human learning.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
