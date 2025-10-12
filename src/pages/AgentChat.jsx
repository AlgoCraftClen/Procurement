
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { agentSDK } from '@/agents';
import MessageBubble from '../components/agent/MessageBubble';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Bot, Download, ArrowLeft, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { createPageUrl } from '@/utils';

export default function AgentChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const conversationId = searchParams.get('id');

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeConversation = useCallback(async () => {
    setIsLoading(true);
    try {
      let activeConversation;
      if (conversationId) {
        activeConversation = await agentSDK.getConversation(conversationId);
      } else {
        // Always create a new conversation for full-page chat
        activeConversation = await agentSDK.createConversation({
          agent_name: 'procurement_analyst',
          metadata: { name: 'Lijakwe Chat' }
        });
        
        // Update URL with new conversation ID
        navigate(`${createPageUrl('AgentChat')}?id=${activeConversation.id}`, { replace: true });
      }
      
      setConversation(activeConversation);
      
      if (activeConversation.messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hello! I'm **Lijakwe**. Ask me anything about your procurement data.`,
          created_date: new Date().toISOString()
        }]);
      } else {
        setMessages(activeConversation.messages);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      toast.error(`Failed to load conversation: ${error.message || 'Unknown error'}`);
      setMessages([{
        role: 'assistant',
        content: '⚠️ **Error Loading Conversation**\n\nCould not connect to Lijakwe. Please contact your administrator.',
        created_date: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, navigate]);

  const handleNewConversation = async () => {
    setIsLoading(true);
    setMessages([]); // Clear current messages immediately
    
    try {
      // Create a brand new conversation
      const newConversation = await agentSDK.createConversation({
        agent_name: 'procurement_analyst',
        metadata: { name: 'Lijakwe Chat' }
      });
      
      setConversation(newConversation);
      
      // Update URL with new conversation ID
      navigate(`${createPageUrl('AgentChat')}?id=${newConversation.id}`, { replace: true });
      
      // Display welcome message
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm **Lijakwe**. Ask me anything about your procurement data.`,
        created_date: new Date().toISOString()
      }]);
      
      toast.success('Started new conversation');
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      toast.error(`Failed to start new conversation: ${error.message || 'Unknown error'}`);
      setMessages([{
        role: 'assistant',
        content: '⚠️ **Error**: Could not start a new conversation. Please try again.',
        created_date: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeConversation();
  }, [initializeConversation]);

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
      await agentSDK.addMessage(conversation, { role: 'user', content: userMessage });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Error**: ${error.message || 'Failed to send message'}`,
        created_date: new Date().toISOString()
      }]);
      setIsLoading(false);
    }
  };

  const exportConversation = () => {
    const conversationData = {
      title: `Lijakwe Conversation - ${new Date().toLocaleDateString()}`,
      conversation_id: conversation?.id,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_date,
        tool_calls: msg.tool_calls?.length > 0 ? msg.tool_calls : undefined
      })),
      exported_at: new Date().toISOString(),
      total_messages: messages.length
    };
    
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lijakwe-conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Conversation exported successfully');
  };

  const handleBackToDashboard = () => {
    navigate(createPageUrl('Dashboard'));
  };

  return (
    <div className="flex flex-col h-full p-4 md:p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <Card className="flex-1 flex flex-col max-w-6xl mx-auto w-full shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToDashboard}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Bot className="w-8 h-8 flex-shrink-0" />
              <div>
                <CardTitle className="text-2xl font-bold">Lijakwe</CardTitle>
                <CardDescription className="text-blue-100">
                  Elite AI procurement intelligence with complete data access • Real-time analytics & insights
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleNewConversation}
                disabled={isLoading}
                className="text-white hover:bg-white/20"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                New Chat
              </Button>
              {messages.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={exportConversation}
                  className="text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                {messages.length} messages
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Initializing Lijakwe</h3>
                <p className="text-slate-500">Connecting to your procurement data universe...</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))
          )}
          {isLoading && messages.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl px-4 py-3 max-w-[85%] border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-sm text-slate-600 ml-2">Processing your request...</span>
                  </div>
                </div>
              </div>
            )}
          <div ref={messagesEndRef} />
        </CardContent>
        
        <div className="p-6 border-t bg-gradient-to-r from-slate-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Ask about spending analytics, supplier insights, inventory optimization, strategic recommendations..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 text-base py-3 border-slate-300 focus:border-blue-400"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-6 flex-shrink-0"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <div className="text-xs text-slate-500 mt-3 text-center">
            🎯 Ask complex questions • Request detailed analysis • Generate strategic reports • Get actionable recommendations
          </div>
        </div>
      </Card>
    </div>
  );
}
