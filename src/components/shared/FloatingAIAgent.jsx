
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Minimize2, Maximize2, Bot, ExternalLink, Loader2 } from 'lucide-react';
import { agentSDK } from '@/agents';
import MessageBubble from '../agent/MessageBubble';
import { createPageUrl } from '@/utils';
import { useLocation, useNavigate } from 'react-router-dom';

export default function FloatingAIAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      // Always create a fresh conversation when opening
      const activeConversation = await agentSDK.createConversation({
        agent_name: 'procurement_analyst',
        metadata: {
          name: 'Lijakwe Chat',
          description: 'AI-powered procurement analysis and insights'
        }
      });
      
      setConversation(activeConversation);
      
      // Add welcome message
      const welcomeMessage = {
        role: 'assistant',
        content: `Hello! I'm **Lijakwe**, your AI procurement expert. How can I help you analyze your procurement operations today? \n\nFor example, you can ask me to:
- "Show our total spending last quarter as a bar chart"
- "Which suppliers are overdue on their deliveries?"
- "What items are running low on stock?"`,
        created_date: new Date().toISOString()
      };
      setMessages([welcomeMessage]);

    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      setMessages([{
        role: 'assistant',
        content: '⚠️ **Connection Error**\n\nI\'m having trouble connecting to the Lijakwe service. This could be due to:\n- The agent is not properly configured\n- Network connectivity issues\n- The agent service is temporarily unavailable\n\nPlease contact your administrator if this persists.',
        created_date: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupConversation = () => {
    // Just reset local state - conversations will be managed by the backend
    console.log('[FloatingAIAgent] Resetting conversation state');
    setConversation(null);
    setMessages([]);
    setInputMessage('');
    setIsLoading(false);
    setIsMinimized(false);
  };

  const handleClose = () => {
    cleanupConversation();
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && !conversation) {
      initializeConversation();
    }
  }, [isOpen, conversation]);

  useEffect(() => {
    if (conversation) {
      const unsubscribe = agentSDK.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
        if (data.status !== 'running') {
            setIsLoading(false);
        }
      });

      return () => unsubscribe();
    }
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversation || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      await agentSDK.addMessage(conversation, {
        role: 'user',
        content: userMessage
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error sending message**\n\n${error.message || 'Unknown error occurred'}\n\nPlease try again or contact your administrator if the issue persists.`,
        created_date: new Date().toISOString()
      }]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { 
      label: '📊 Monthly spending analysis', 
      message: 'Show me a detailed spending analysis for the last 3 months with charts and trends' 
    },
    { 
      label: '⚠️ Critical alerts dashboard', 
      message: 'Show me all critical alerts: low stock, overdue invoices, contract renewals, and budget variances' 
    },
    { 
      label: '🏆 Top supplier performance', 
      message: 'Analyze our top 5 suppliers by spend and show their performance metrics with charts' 
    },
    { 
      label: '📈 Executive summary report', 
      message: 'Generate a comprehensive executive procurement report with key metrics, insights, and recommendations' 
    },
    { 
      label: '🔍 Cost savings opportunities', 
      message: 'Identify and analyze potential cost savings opportunities across all categories' 
    },
    { 
      label: '📦 Inventory optimization', 
      message: 'Show me inventory turnover analysis and reorder recommendations with charts' 
    }
  ];

  const handleQuickAction = (message) => {
    setInputMessage(message);
    inputRef.current?.focus();
    setTimeout(() => {
      handleSendMessage();
    }, 300);
  };

  const handleOpenInNewTab = () => {
    const target = conversation
      ? createPageUrl(`AgentChat?id=${conversation.id}`)
      : createPageUrl(`AgentChat`);
    cleanupConversation();
    setIsOpen(false);

    if (conversation) {
      navigate(target);
    } else {
      navigate(target);
    }
  };

  if (location.pathname.toLowerCase().includes('/agentchat')) {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          size="icon"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-[min(20rem,calc(100vw-2rem))] shadow-xl border-t-4 border-blue-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Lijakwe
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">AI Expert</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(false)}
                className="h-6 w-6 text-white hover:bg-white/20"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-6 w-6 text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600 mb-3">
              🎯 Your elite procurement intelligence partner with complete data access!
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask about analytics, insights, trends..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 text-xs"
              />
              <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading} size="sm">
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6">
      <Card className="flex h-[min(700px,calc(100vh-3rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl border-t-4 border-blue-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg flex-shrink-0">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Lijakwe
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">AI Expert</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInNewTab}
              className="h-8 w-8 text-white hover:bg-white/20"
              title="Open in full screen"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Initializing Lijakwe...</p>
                    </div>
                </div>
            ) : (
                messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))
            )}
            {isLoading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl px-4 py-3 max-w-[85%] border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-sm text-slate-600 ml-2">Analyzing data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !isLoading && (
            <div className="p-4 pt-0 bg-gradient-to-b from-transparent to-slate-50 flex-shrink-0">
              <div className="text-xs text-slate-600 mb-3 font-medium">🚀 Instant Intelligence:</div>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="justify-start text-xs h-auto py-2 px-3 text-slate-700 hover:text-slate-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 border border-transparent hover:border-blue-200 rounded-lg transition-all text-left break-words"
                    onClick={() => handleQuickAction(action.message)}
                  >
                    <span className="text-left break-words">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          <div className="p-4 pt-2 border-t bg-gradient-to-r from-slate-50 to-blue-50 flex-shrink-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask about spending, analytics, insights, trends..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-slate-300 focus:border-blue-400"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-xs text-slate-500 mt-2 text-center">
              🎯 Elite procurement intelligence • Real-time data access • Strategic insights
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
