import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AIConfigData } from '../types';
import { decrypt } from '../utils/crypto';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface AIContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
  config: AIConfigData | null;
  currentConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  sendMessage: (content: string) => Promise<void>;
  contextFiles: Map<string, string>;
  addContextFile: (filename: string, content: string) => void;
  isEditMode: boolean;
  toggleEditMode: () => void;
  generateEdit: (instruction: string, fileContent: string) => Promise<string>;
  loading: boolean;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<AIConfigData | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [contextFiles, setContextFiles] = useState<Map<string, string>>(new Map());
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadConversations();
    const handleStorageChange = () => {
        loadConfig();
        loadConversations();
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event for when config is saved within the app
    window.addEventListener('ai_config_updated', handleStorageChange);
    
    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('ai_config_updated', handleStorageChange);
    };
  }, []);

  const loadConfig = () => {
    const savedConfig = localStorage.getItem('fiacloud_ai_config');
    if (savedConfig) {
      try {
        const decrypted = decrypt(savedConfig);
        setConfig(JSON.parse(decrypted));
      } catch (e) {
        console.error('Failed to load AI config', e);
      }
    }
  };

  const loadConversations = () => {
    const saved = localStorage.getItem('fiacloud_ai_conversations');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setConversations(parsed);
            // If no current conversation is selected but we have conversations, don't auto select yet.
            // Or we could auto select the most recent one if we wanted.
        } catch (e) {
            console.error('Failed to load conversations', e);
        }
    }
  };

  const updateConversationsState = (updateFn: (prev: Conversation[]) => Conversation[]) => {
    setConversations(prev => {
        const newState = updateFn(prev);
        localStorage.setItem('fiacloud_ai_conversations', JSON.stringify(newState));
        return newState;
    });
  };

  const getCurrentMessages = () => {
      if (!currentConversationId) return [];
      const conv = conversations.find(c => c.id === currentConversationId);
      return conv ? conv.messages : [];
  };

  const startNewConversation = () => {
      const newConv: Conversation = {
          id: Date.now().toString(),
          title: '新对话',
          messages: [],
          createdAt: Date.now()
      };
      updateConversationsState(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setIsEditMode(false);
  };

  const selectConversation = (id: string) => {
      setCurrentConversationId(id);
      setIsEditMode(false);
  };

  const deleteConversation = (id: string) => {
      updateConversationsState(prev => prev.filter(c => c.id !== id));
      if (currentConversationId === id) {
          setCurrentConversationId(null);
      }
  };

  const updateCurrentConversation = (newMessages: Message[]) => {
      updateConversationsState(prev => {
          if (!currentConversationId) {
              const newConv: Conversation = {
                id: Date.now().toString(),
                title: newMessages[0]?.content.slice(0, 20) || '新对话',
                messages: newMessages,
                createdAt: Date.now()
              };
              setCurrentConversationId(newConv.id);
              return [newConv, ...prev];
          }

          return prev.map(c => {
              if (c.id === currentConversationId) {
                  return { 
                      ...c, 
                      messages: newMessages,
                      title: (c.messages.length === 0 && newMessages.length > 0 && c.title === '新对话') 
                          ? newMessages[0].content.slice(0, 30) 
                          : c.title
                  };
              }
              return c;
          });
      });
  };

  const toggleSidebar = () => setIsOpen(prev => !prev);

  const addContextFile = (filename: string, content: string) => {
    setContextFiles(prev => {
      if (prev.has(filename)) return prev;
      const newMap = new Map(prev);
      newMap.set(filename, content);
      return newMap;
    });
  };

  const buildSystemPrompt = () => {
    let prompt = "You are a helpful AI coding assistant.";
    if (contextFiles.size > 0) {
      prompt += "\n\nHere are the files in the current context:\n";
      contextFiles.forEach((content, name) => {
        prompt += `\n--- File: ${name} ---\n${content}\n--- End of File ---\n`;
      });
    }
    return prompt;
  };

  const sendMessage = async (content: string) => {
    if (!config) {
      // If not configured, we might want to show a message locally but not persist it or create a chat
      // For now let's just create a temporary conversation to show the error
      if (!currentConversationId) startNewConversation();
      
      const errorMsg: Message = { role: 'assistant', content: 'Please configure AI settings first.' };
      // We need to wait for state update if we just started a conversation, but setState is async.
      // So let's handle it by manually adding to a new list
      
      // Actually simpler: just return and maybe show toast? 
      // But the interface expects a message. Let's assume user has a conversation or we create one.
      
      const msgs = getCurrentMessages();
      const newMsgs = [...msgs, { role: 'user', content } as Message, errorMsg];
      updateCurrentConversation(newMsgs);
      return;
    }

    if (!currentConversationId) {
        // Use a new ID for consistency in this scope
        const newId = Date.now().toString();
        const newConv: Conversation = {
            id: newId,
            title: content.slice(0, 20),
            messages: [],
            createdAt: Date.now()
        };
        
        // Update state with new conversation
        updateConversationsState(prev => [newConv, ...prev]);
        setCurrentConversationId(newId);
        
        const newUserMsg: Message = { role: 'user', content };
        const newMsgs = [newUserMsg];
        
        // Update conversation with user message using functional update
        updateConversationsState(prev => prev.map(c => c.id === newId ? { ...c, messages: newMsgs } : c));
        
        setLoading(true);
        try {
            const systemMsg: Message = { role: 'system', content: buildSystemPrompt() };
            const chatMessages = [systemMsg, newUserMsg];

            const response = await fetch(`${config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                model: config.model,
                messages: chatMessages,
                temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            const assistantMsg: Message = {
                role: 'assistant',
                content: data.choices[0].message.content
            };

            const finalMsgs = [...newMsgs, assistantMsg];
            updateConversationsState(prev => prev.map(c => c.id === newId ? { ...c, messages: finalMsgs } : c));

        } catch (error: any) {
            const errorMsg: Message = { role: 'assistant', content: `Error: ${error.message}` };
            const finalMsgs = [...newMsgs, errorMsg];
            updateConversationsState(prev => prev.map(c => c.id === newId ? { ...c, messages: finalMsgs } : c));
        } finally {
            setLoading(false);
        }
        return;
    }

    // Existing conversation
    const currentMsgs = getCurrentMessages();
    const newUserMsg: Message = { role: 'user', content };
    const newMsgs = [...currentMsgs, newUserMsg];
    
    // Update UI immediately
    updateCurrentConversation(newMsgs);
    
    setLoading(true);

    try {
      const systemMsg: Message = { role: 'system', content: buildSystemPrompt() };
      const chatMessages = [systemMsg, ...newMsgs]; // Sending full history

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: chatMessages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      // Use functional update again to ensure we don't lose state
      updateConversationsState(prev => prev.map(c => {
          if (c.id === currentConversationId) {
              return { ...c, messages: [...newMsgs, assistantMsg] };
          }
          return c;
      }));
    } catch (error: any) {
       updateConversationsState(prev => prev.map(c => {
          if (c.id === currentConversationId) {
              return { ...c, messages: [...newMsgs, { role: 'assistant', content: `Error: ${error.message}` }] };
          }
          return c;
      }));
    } finally {
      setLoading(false);
    }
  };
  
  const generateEdit = async (instruction: string, fileContent: string): Promise<string> => {
      if (!config) throw new Error("AI not configured");
      
      const prompt = `You are a code editor. 
User Instruction: ${instruction}

Current File Content:
${fileContent}

Return ONLY the full updated file content. Do not include markdown code blocks or explanations unless strictly necessary for the file format.`;

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      let content = data.choices[0].message.content;
      
      // Clean up markdown code blocks if present
      if (content.startsWith('```') && content.endsWith('```')) {
          const lines = content.split('\n');
          content = lines.slice(1, -1).join('\n');
      }
      
      return content;
  };

  const toggleEditMode = () => setIsEditMode(prev => !prev);
  
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    updateConversationsState(prev => prev.map(c => {
        if (c.id === currentConversationId) {
            return {
                ...c,
                messages: [...c.messages, { role, content } as Message]
            };
        }
        return c;
    }));
  };

  return (
    <AIContext.Provider value={{
      isOpen,
      toggleSidebar,
      config,
      currentConversationId,
      conversations,
      messages: getCurrentMessages(),
      sendMessage,
      contextFiles,
      addContextFile,
      isEditMode,
      toggleEditMode,
      generateEdit,
      loading,
      startNewConversation,
      selectConversation,
      deleteConversation,
      addMessage
    }}>
      {children}
    </AIContext.Provider>
  );
};
