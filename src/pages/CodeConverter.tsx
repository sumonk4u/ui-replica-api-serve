
import React, { useState } from 'react';
import { Copy, ArrowRight } from 'lucide-react';

const languages = [
  { id: 'typescript', name: 'TypeScript' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'swift', name: 'Swift' },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'kotlin', name: 'Kotlin' },
];

const CodeConverter = () => {
  const [sourceCode, setSourceCode] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('javascript');
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [convertedCode, setConvertedCode] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);

  const handleConvert = async () => {
    if (!sourceCode.trim()) return;
    
    setIsConverting(true);
    
    try {
      // Make API call to convert code
      const response = await fetch('http://localhost:8000/api/convert-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sourceCode,
          sourceLanguage,
          targetLanguage,
        }),
      });
      
      const data = await response.json();
      setConvertedCode(data.convertedCode || 'Error converting code');
    } catch (error) {
      console.error('Error converting code:', error);
      setConvertedCode('Error: Failed to convert code. Please try again later.');
    } finally {
      setIsConverting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(convertedCode);
    setShowCopiedMessage(true);
    setTimeout(() => setShowCopiedMessage(false), 2000);
  };

  const swapLanguages = () => {
    const temp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(temp);
    
    // Also swap the code if conversion has been done
    if (convertedCode) {
      setSourceCode(convertedCode);
      setConvertedCode('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Code Converter</h1>
        <p className="text-gray-600">Convert code between different programming languages</p>
      </div>
      
      <div className="flex items-center mb-4 space-x-4">
        <div className="flex-1">
          <label htmlFor="sourceLanguage" className="block text-sm font-medium text-gray-700 mb-1">Source Language</label>
          <select
            id="sourceLanguage"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={swapLanguages}
          className="mt-6 p-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowRight className="transform rotate-90" size={20} />
        </button>
        
        <div className="flex-1">
          <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
          <select
            id="targetLanguage"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {languages.map((lang) => (
              <option key={lang.id} value={lang.id}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        <div className="flex flex-col">
          <label htmlFor="sourceCode" className="block text-sm font-medium text-gray-700 mb-1">Source Code</label>
          <textarea
            id="sourceCode"
            value={sourceCode}
            onChange={(e) => setSourceCode(e.target.value)}
            placeholder="Paste your code here..."
            className="flex-1 p-3 border border-gray-300 rounded-md resize-none font-mono text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="convertedCode" className="block text-sm font-medium text-gray-700">Converted Code</label>
            {convertedCode && (
              <div className="relative">
                <button
                  onClick={copyToClipboard}
                  className="text-gray-500 hover:text-gray-700 flex items-center text-xs"
                >
                  <Copy size={14} className="mr-1" />
                  Copy
                </button>
                {showCopiedMessage && (
                  <div className="absolute -top-8 right-0 bg-gray-800 text-white px-2 py-1 rounded text-xs">
                    Copied!
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            <textarea
              id="convertedCode"
              value={convertedCode}
              readOnly
              placeholder="Converted code will appear here..."
              className="w-full h-full p-3 border border-gray-300 rounded-md resize-none font-mono text-sm bg-gray-50"
            />
            {isConverting && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleConvert}
          disabled={!sourceCode.trim() || isConverting}
          className={`px-6 py-2 rounded-lg flex items-center ${
            !sourceCode.trim() || isConverting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-700 text-white hover:bg-green-800'
          }`}
        >
          {isConverting ? (
            <>
              <span className="inline-block h-4 w-4 mr-2 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
              Converting...
            </>
          ) : (
            'Convert Code'
          )}
        </button>
      </div>
    </div>
  );
};

export default CodeConverter;
