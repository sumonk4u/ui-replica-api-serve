
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { API_BASE_URL } from '../config';

// Import components
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatHeader from '../components/chat/ChatHeader';
import ApiErrorBanner from '../components/chat/ApiErrorBanner';
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatInput from '../components/chat/ChatInput';

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
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

  const handleSendMessage = async (inputMessage: string) => {
    // Check if API is available before sending
    if (apiError) {
      toast.error("Cannot send message: API connection issue");
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
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
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I'm having trouble connecting to the server. Please make sure the FastAPI server is running at ${API_BASE_URL}.`,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setApiError(`Cannot connect to API server at ${API_BASE_URL}`);
    } finally {
      setIsLoading(false);
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

  const handleClearChat = () => {
    startNewChat();
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  // Retry API connection
  const retryApiConnection = () => {
    checkApiAvailability();
    toast.info("Checking API connection...");
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar for chat history */}
      <ChatSidebar onNewChat={() => setShowNewChat(true)} />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <ChatHeader 
          apiError={apiError} 
          onNewChat={() => setShowNewChat(true)} 
          onClearChat={handleClearChat}
        />

        <ApiErrorBanner 
          error={apiError || ''} 
          apiBaseUrl={API_BASE_URL} 
          onRetry={retryApiConnection} 
        />

        <ChatMessageList 
          messages={messages} 
          isLoading={isLoading} 
          showNewChatModal={showNewChat}
          setShowNewChatModal={setShowNewChat}
          startNewChat={startNewChat}
        />

        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          apiError={apiError}
          handleQuickQuestion={handleQuickQuestion}
          isInitialState={messages.length === 1}
        />
      </div>
    </div>
  );
};

export default Chat;
