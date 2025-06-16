'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Bot, User, Loader2, X, Minimize2, Maximize2, HelpCircle, Lightbulb, BarChart3 } from 'lucide-react';
import { Logger } from '@/lib/utils';

interface ChatbotProps {
  userId: string;
  analysisId?: string;
  uploadId?: string;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  contextSource?: string;
}

interface AvailableContext {
  analysisId: string;
  uploadId: string;
  fileName: string;
  analysisType: string;
  uploadDate: string;
  overallScore: number;
}

export default function Chatbot({ userId, analysisId, uploadId, onClose }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [availableContext, setAvailableContext] = useState<AvailableContext[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sample questions for user guidance
  const sampleQuestions = [
    "What were the main strengths in my sales calls?",
    "Which areas need the most improvement?",
    "How did I handle customer objections?",
    "What was my average performance score?",
    "Give me specific examples of good communication",
    "What recommendations do you have for closing techniques?"
  ];

  useEffect(() => {
    loadAvailableContext();
    
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'bot',
      content: `Hello! I'm your sales analysis assistant. I can help you understand your call recordings and performance analysis. Ask me anything about your sales calls, performance metrics, or get specific recommendations for improvement.`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAvailableContext = async () => {
    try {
      const response = await fetch(`/api/chatbot?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setAvailableContext(result.data.availableContext || []);
        Logger.info('[Chatbot] Loaded available context:', result.data.availableContext?.length || 0);
      }
    } catch (error) {
      console.error('[Chatbot] Error loading context:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Determine context parameters based on selection
      const contextParams: any = { userId, question: userMessage.content };
      
      if (selectedContext !== 'all') {
        if (selectedContext.startsWith('analysis-')) {
          contextParams.analysisId = selectedContext.replace('analysis-', '');
        } else if (selectedContext.startsWith('upload-')) {
          contextParams.uploadId = selectedContext.replace('upload-', '');
        }
      }

      // Use provided analysisId or uploadId if available
      if (analysisId) {
        contextParams.analysisId = analysisId;
      } else if (uploadId) {
        contextParams.uploadId = uploadId;
      }

      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contextParams),
      });

      const result = await response.json();

      if (result.success) {
        const botMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          type: 'bot',
          content: result.data.answer,
          timestamp: new Date(),
          contextSource: result.data.contextSource
        };

        setMessages(prev => [...prev, botMessage]);
        Logger.info('[Chatbot] Response received successfully');
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('[Chatbot] Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: `I apologize, but I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your question.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectSampleQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const formatMessage = (content: string) => {
    // Simple formatting for better readability
    return content
      .split('\n')
      .map((line, index) => (
        <span key={index}>
          {line}
          {index < content.split('\n').length - 1 && <br />}
        </span>
      ));
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">Sales Analysis Assistant</h3>
            <p className="text-xs text-blue-100">Ask me about your call recordings</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Context Selector */}
      {availableContext.length > 1 && !analysisId && !uploadId && (
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <label className="text-xs text-gray-600 mb-2 block">Focus on:</label>
          <select
            value={selectedContext}
            onChange={(e) => setSelectedContext(e.target.value)}
            className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All call recordings</option>
            {availableContext.map((context) => (
              <option key={context.analysisId} value={`analysis-${context.analysisId}`}>
                {context.fileName} (Score: {context.overallScore}/10)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'bot' && <Bot className="w-4 h-4 mt-0.5 text-blue-600" />}
                {message.type === 'user' && <User className="w-4 h-4 mt-0.5" />}
                <div className="flex-1">
                  <div className="text-sm leading-relaxed">
                    {formatMessage(message.content)}
                  </div>
                  {message.contextSource && (
                    <div className="text-xs opacity-75 mt-2 border-t border-gray-300 pt-2">
                      Context: {message.contextSource}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <Bot className="w-4 h-4 text-blue-600" />
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-gray-600">Analyzing your question...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Sample Questions */}
      {messages.length <= 1 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 mb-2 flex items-center">
            <HelpCircle className="w-3 h-3 mr-1" />
            Try asking:
          </div>
          <div className="grid grid-cols-1 gap-1">
            {sampleQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => selectSampleQuestion(question)}
                className="text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
              >
                "{question}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your call recordings..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 flex items-center">
          <Lightbulb className="w-3 h-3 mr-1" />
          Ask about performance scores, specific calls, or improvement suggestions
        </div>
      </div>
    </div>
  );
}