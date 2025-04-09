
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Check, Code, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';

// Define the API_BASE_URL - change this to your Machine 2's IP address
const API_BASE_URL = 'http://MACHINE2_IP:3000'; // Replace MACHINE2_IP with actual IP address

const CodeExplainer = () => {
  const [code, setCode] = useState('');
  const [selectedAction, setSelectedAction] = useState('explain');
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const { toast } = useToast();

  useEffect(() => {
    // Check if the API server is available when the component mounts
    checkApiAvailability();
  }, []);

  const checkApiAvailability = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a timeout to avoid waiting too long
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setApiStatus('available');
      } else {
        setApiStatus('unavailable');
        toast({
          title: "API Connection Error",
          description: `Cannot connect to API server. Please make sure the FastAPI server is running at ${API_BASE_URL}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('API availability check failed:', error);
      setApiStatus('unavailable');
      toast({
        title: "API Connection Error",
        description: `Cannot connect to API server. Please make sure the FastAPI server is running at ${API_BASE_URL}`,
        variant: "destructive",
      });
    }
  };

  const handleGenerate = async () => {
    if (!code) return;
    
    // Check API availability before making the request
    if (apiStatus === 'unavailable') {
      toast({
        title: "API Server Unavailable",
        description: "Cannot process your request. Please start the FastAPI server and try again.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setResult('');
    
    try {
      if (apiStatus === 'available') {
        // Try to make a real API call
        try {
          const response = await fetch(`${API_BASE_URL}/chat/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: `${selectedAction.toUpperCase()}: ${code}`,
              max_tokens: 1000
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setResult(data.choices[0].message.content);
          } else {
            throw new Error('API response was not OK');
          }
        } catch (error) {
          console.error('API call failed:', error);
          // Fallback to simulated response
          simulateResponse();
        }
      } else {
        // Fallback to simulated response
        simulateResponse();
      }
    } catch (error) {
      console.error('Error generating explanation:', error);
      toast({
        title: "Error",
        description: "Failed to generate explanation. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const simulateResponse = () => {
    setTimeout(() => {
      const actionText = {
        'explain': 'explanation',
        'document': 'documentation',
        'simplify': 'simplified version',
        'optimize': 'optimized version'
      }[selectedAction];
      
      setResult(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} for your code:\n\nThis is a sample ${actionText} of the provided code. In a real application, this would be generated by an AI model based on the code you provided.\n\nThe app is currently running in offline mode because the FastAPI server is not available. To use the full functionality, please start the API server at http://localhost:8000.`);
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <Code className="mr-2" /> Code Explainer
        </h1>
        <p className="text-gray-600 mt-1">
          Paste the code you want to analyze and select the appropriate action.
        </p>
      </div>

      {apiStatus === 'unavailable' && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Connection Error</AlertTitle>
          <AlertDescription>
            Cannot connect to API server. The application is running in offline mode with limited functionality.
            Please make sure the FastAPI server is running at {API_BASE_URL}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Code</label>
            <Textarea
              placeholder="Paste your code here..."
              className="min-h-[300px] font-mono text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          
          <div className="text-sm text-gray-500">
            We support various programming languages including JavaScript, TypeScript, Python, and more.
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Action</label>
            <Tabs 
              defaultValue="explain" 
              className="w-full" 
              onValueChange={(value) => setSelectedAction(value)}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="explain" className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Explain Code
                </TabsTrigger>
                <TabsTrigger value="document" className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Document Code
                </TabsTrigger>
                <TabsTrigger value="simplify" className="flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  Simplify Code
                </TabsTrigger>
                <TabsTrigger value="optimize" className="flex items-center">
                  <Code className="w-4 h-4 mr-2" />
                  Optimize Code
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI Model</label>
            <select 
              className="w-full p-2 border rounded"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Select the model that best suits your needs.
            </p>
          </div>

          <Button 
            onClick={handleGenerate} 
            className="w-full bg-green-700 hover:bg-green-800"
            disabled={!code || isGenerating}
          >
            Generate Explanation
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Result</label>
          <div className="bg-gray-50 p-4 rounded-lg border min-h-[300px] whitespace-pre-wrap font-mono text-sm">
            {isGenerating ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
              </div>
            ) : result ? (
              result
            ) : (
              <div className="text-gray-400 h-full flex items-center justify-center">
                Results will appear here after generation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeExplainer;
