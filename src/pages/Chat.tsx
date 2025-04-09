import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Send, Plus, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

// Define the API_BASE_URL - change this to your Machine 2's IP address
const API_BASE_URL = 'http://MACHINE2_IP:3000'; // Replace MACHINE2_IP with actual IP address

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  // Initial bot message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          content: 'How can I help you today?\n\nAsk me anything about your knowledge base or how I can assist with document processing and code conversion.',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check API availability on component mount
  useEffect(() => {
    checkApiAvailability();
  }, []);

  const checkApiAvailability = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setApiError(null);
      } else {
        setApiError('API is not responding correctly');
      }
    } catch (error) {
      console.error("API availability check failed:", error);
      setApiError(`Cannot connect to API server at ${API_BASE_URL}`);
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    // Check if API is available before sending
    if (apiError) {
      toast.error("Cannot send message: API connection issue");
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // In a real implementation, this would call your API
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();

      const newBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response || "I'm processing your request. I'll have an answer shortly.",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newBotMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm having trouble connecting to the server. Please make sure the FastAPI server is running at ${API_BASE_URL}.`,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
      setApiError(`Cannot connect to API server at ${API_BASE_URL}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: '1',
        content: 'How can I help you today?\n\nAsk me anything about your knowledge base or how I can assist with document processing and code conversion.',
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setShowNewChat(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    // Focus the input element
    const inputElement = document.getElementById('chat-input');
    if (inputElement) {
      inputElement.focus();
    }
  };

  // Retry API connection
  const retryApiConnection = () => {
    checkApiAvailability();
    toast.info("Checking API connection...");
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar for chat history */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <button 
            onClick={() => setShowNewChat(true)} 
            className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-800 transition-colors"
          >
            <Plus size={16} />
            <span>New Conversation</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-sm text-gray-500 mb-2">Recent conversations</div>
          <div className="space-y-2">
            {/* This would be populated with actual chat history in a real app */}
            <div className="p-2 rounded-lg bg-green-50 text-green-700 cursor-pointer">
              Current conversation
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
          <h1 className="text-xl font-semibold">AI Chat</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`mr-2 h-3 w-3 rounded-full ${apiError ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-sm">{apiError ? 'API Connection Error' : 'Azure OpenAI (MSI)'}</span>
            </div>
            <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <Plus size={16} />
              <span>New Chat</span>
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50">
              <X size={16} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>

        {/* API Error Banner */}
        {apiError && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 flex justify-between items-center">
            <div className="flex items-center">
              <AlertTriangle className="mr-2" size={16} />
              <span>{apiError}. Please make sure the FastAPI server is running at {API_BASE_URL}.</span>
            </div>
            <button 
              onClick={retryApiConnection}
              className="p-1 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        )}

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showNewChat && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-xl font-semibold mb-4">New Conversation</h2>
                <button 
                  onClick={startNewChat}
                  className="w-full py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                >
                  Start New Conversation
                </button>
                <button 
                  onClick={() => setShowNewChat(false)}
                  className="w-full mt-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3xl rounded-lg p-4 ${
                  message.sender === 'user' 
                    ? 'bg-green-700 text-white' 
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex items-start mb-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user' 
                      ? 'bg-green-600' 
                      : 'bg-green-100 text-green-700'
                  } mr-2`}>
                    {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div>
                    <div className={`font-medium ${message.sender === 'user' ? 'text-white' : 'text-gray-900'}`}>
                      {message.sender === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className={`text-xs ${message.sender === 'user' ? 'text-green-100' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className={`whitespace-pre-wrap ${message.sender === 'user' ? 'text-white' : 'text-gray-700'}`}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-lg p-4 bg-white border border-gray-200">
                <div className="flex items-start mb-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-2">
                    <Bot size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">AI Assistant</div>
                    <div className="text-xs text-gray-500">Just now</div>
                  </div>
                </div>
                <div className="flex items-center text-gray-500">
                  <div className="dot-flashing"></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick question suggestions */}
        {messages.length === 1 && (
          <div className="p-4 flex justify-center space-x-4">
            <button 
              onClick={() => handleQuickQuestion("What can you help me with?")}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              What can you help me with?
            </button>
            <button 
              onClick={() => handleQuickQuestion("How do I upload documents?")}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              How do I upload documents?
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-green-500 focus-within:border-green-500">
            <textarea
              id="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 outline-none p-3 bg-transparent resize-none"
              placeholder="Ask a question..."
              rows={1}
              style={{ maxHeight: '120px' }}
              disabled={!!apiError}
            />
            <button
              onClick={handleSendMessage}
              disabled={inputValue.trim() === '' || isLoading || !!apiError}
              className={`p-3 ${
                inputValue.trim() === '' || isLoading || !!apiError
                  ? 'text-gray-400' 
                  : 'text-green-700 hover:text-green-800'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
          {apiError && (
            <div className="mt-2 text-xs text-red-500">
              Chat is disabled due to API connection issues. Please check if the FastAPI server is running.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
