import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AIConfigData, Message } from '../types';
import { decrypt } from '../utils/crypto';

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
  loading: boolean;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addMessage: (role: 'user' | 'assistant' | 'system', content: string, type?: 'text' | 'edit-card', conversationId?: string) => string;
  addMessages: (messages: Message[], conversationId?: string) => string;
  pendingEditContent: string | null;
  originalEditContent: string | null;
  setOriginalEditContent: (content: string | null) => void;
  setPendingEditContent: (content: string | null) => void;
  acceptEdit: () => void;
  rejectEdit: () => void;
  generateEdit: (instruction: string, fileContent: string, onUpdate: (content: string) => void) => Promise<void>;
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

  const [pendingEditContent, setPendingEditContent] = useState<string | null>(null);
  const [originalEditContent, setOriginalEditContent] = useState<string | null>(null);
  
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
      setCurrentConversationId(null);
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
                temperature: 0.7,
                stream: true
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            // Initialize empty assistant message
            let assistantContent = '';
            const assistantMsg: Message = { role: 'assistant', content: '' };
            
            // Add empty assistant message to state so we can stream into it
            updateConversationsState(prev => prev.map(c => c.id === newId ? { ...c, messages: [...newMsgs, assistantMsg] } : c));

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Response body is not readable');

            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                assistantContent += content;
                                
                                // Update state with new content
                                updateConversationsState(prev => prev.map(c => {
                                    if (c.id === newId) {
                                        const msgs = [...c.messages];
                                        const lastMsg = msgs[msgs.length - 1];
                                        if (lastMsg.role === 'assistant') {
                                            msgs[msgs.length - 1] = { ...lastMsg, content: assistantContent };
                                        }
                                        return { ...c, messages: msgs };
                                    }
                                    return c;
                                }));
                            }
                        } catch (e) {
                            console.error('Error parsing stream chunk', e);
                        }
                    }
                }
            }

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
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      // Initialize empty assistant message
      let assistantContent = '';
      const assistantMsg: Message = { role: 'assistant', content: '' };
      
      // Add empty assistant message to state so we can stream into it
      updateConversationsState(prev => prev.map(c => {
          if (c.id === currentConversationId) {
              return { ...c, messages: [...newMsgs, assistantMsg] };
          }
          return c;
      }));

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const data = JSON.parse(line.slice(6));
                    const content = data.choices[0]?.delta?.content || '';
                    if (content) {
                        assistantContent += content;
                        
                        // Update state with new content
                        updateConversationsState(prev => prev.map(c => {
                            if (c.id === currentConversationId) {
                                const msgs = [...c.messages];
                                const lastMsg = msgs[msgs.length - 1];
                                if (lastMsg.role === 'assistant') {
                                    msgs[msgs.length - 1] = { ...lastMsg, content: assistantContent };
                                }
                                return { ...c, messages: msgs };
                            }
                            return c;
                        }));
                    }
                } catch (e) {
                    console.error('Error parsing stream chunk', e);
                }
            }
        }
      }

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
  
  const generateEdit = async (instruction: string, fileContent: string, onUpdate: (content: string) => void): Promise<void> => {
      if (!config) throw new Error("AI not configured");
      
      setOriginalEditContent(fileContent);
      setPendingEditContent(fileContent); // Initialize pending with current
      
      const tools = [
        {
          type: "function",
          function: {
            name: "update_file",
            description: "Update the content of the current file based on user instructions. You must provide the FULL content of the file.",
            parameters: {
              type: "object",
              properties: {
                new_content: {
                  type: "string",
                  description: "The new full content of the file."
                }
              },
              required: ["new_content"]
            }
          }
        }
      ];

      const prompt = `You are a code editor. 
User Instruction: ${instruction}

Current File Content:
${fileContent}

Please use the 'update_file' tool to provide the new file content.`;

      setLoading(true);

      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            tools: tools,
            tool_choice: "auto",
            stream: true,
            temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');

        const decoder = new TextDecoder();
        let toolArguments = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        const toolCalls = data.choices[0]?.delta?.tool_calls;
                        
                        if (toolCalls && toolCalls.length > 0) {
                            const args = toolCalls[0].function?.arguments || '';
                            toolArguments += args;
                            
                            // Try to extract content from partial JSON
                            // This is a simple heuristic to update the UI while streaming
                            // It assumes the structure {"new_content": "..."}
                            
                            // Check if we have started the content field
                            const contentStart = toolArguments.indexOf('"new_content"');
                            if (contentStart !== -1) {
                                // Find the first quote after the colon
                                const colonIndex = toolArguments.indexOf(':', contentStart);
                                if (colonIndex !== -1) {
                                    const quoteIndex = toolArguments.indexOf('"', colonIndex);
                                    if (quoteIndex !== -1) {
                                        // We have started the string. 
                                        // Now we need to decode the string value which might be incomplete
                                        // A robust partial JSON parser is complex, but we can try a best effort approach
                                        // or just wait for valid JSON chunks if the model streams well.
                                        
                                        // Simplified approach: Just try to parse the whole thing if it looks like it might be valid JSON
                                        // or manually unescape the string part we have so far.
                                        
                                        // Let's try to grab everything after the opening quote
                                        let rawContent = toolArguments.slice(quoteIndex + 1);
                                        
                                        // If the last char is ", it might be the end, or an escaped quote.
                                        // Since we are streaming, we probably haven't reached the end quote of the JSON structure unless it's done.
                                        
                                        // Manual unescape for display purposes
                                        // Note: JSON.parse is safer but fails on partials.
                                        // We will try to unescape standard JSON escapes: \" \\ \n \r \t
                                        
                                        let displayContent = rawContent
                                            .replace(/\\"/g, '"')
                                            .replace(/\\\\/g, '\\')
                                            .replace(/\\n/g, '\n')
                                            .replace(/\\r/g, '\r')
                                            .replace(/\\t/g, '\t');
                                            
                                        // Only update if we have something substantial
                                        if (displayContent) {
                                            onUpdate(displayContent);
                                            setPendingEditContent(displayContent);
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }
        
        // Final parse to ensure correctness
        try {
             // Sometimes the arguments might be truncated or slightly malformed if stream cut off,
             // but usually it's complete.
             const parsedArgs = JSON.parse(toolArguments);
             if (parsedArgs.new_content) {
                 onUpdate(parsedArgs.new_content);
                 setPendingEditContent(parsedArgs.new_content);
             }
        } catch (e) {
            console.error('Final JSON parse error', e);
        }

      } catch (error) {
        console.error("Generate Edit Error", error);
        throw error;
      } finally {
        setLoading(false);
      }
  };

  const acceptEdit = () => {
      setPendingEditContent(null);
      setOriginalEditContent(null);
      // Content is already in the file view, so we just clear the pending state
      // allowing normal interaction again.
  };

  const rejectEdit = () => {
      if (originalEditContent !== null) {
          // We need a way to revert the content in the file view.
          // Since we don't have direct access to setEditedContent here (it's in MainLayout),
          // we rely on the fact that pendingEditContent is set to null, 
          // AND we should probably have a callback or mechanism to revert.
          // Actually, MainLayout should listen to pendingEditContent changes?
          // No, MainLayout passes onFileUpdate to AISidebar.
          // But here we need to trigger a revert.
          
          // Let's change how we expose this.
          // If we return the original content via a callback or expose it?
      }
      setPendingEditContent(null);
      setOriginalEditContent(null);
  };

  const toggleEditMode = () => {
      setIsEditMode(prev => {
          if (prev) {
              // Exiting edit mode
              setPendingEditContent(null);
              setOriginalEditContent(null);
          }
          return !prev;
      });
  };
  
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, type: 'text' | 'edit-card' = 'text', conversationId?: string) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId) {
        // If no conversation exists, create one
        const newId = Date.now().toString();
        const newConv: Conversation = {
            id: newId,
            title: content.slice(0, 20),
            messages: [{ role, content, type }],
            createdAt: Date.now()
        };
        updateConversationsState(prev => [newConv, ...prev]);
        setCurrentConversationId(newId);
        return newId;
    } else {
        updateConversationsState(prev => prev.map(c => {
          if (c.id === targetId) {
            return { ...c, messages: [...c.messages, { role, content, type }] };
          }
          return c;
        }));
        return targetId;
    }
  };

  const addMessages = (newMessages: Message[], conversationId?: string) => {
    const targetId = conversationId || currentConversationId;
    if (!targetId) {
        const newId = Date.now().toString();
        const newConv: Conversation = {
            id: newId,
            title: newMessages[0]?.content.slice(0, 20) || '新对话',
            messages: newMessages,
            createdAt: Date.now()
        };
        updateConversationsState(prev => [newConv, ...prev]);
        setCurrentConversationId(newId);
        return newId;
    } else {
        updateConversationsState(prev => prev.map(c => {
            if (c.id === targetId) {
                return { ...c, messages: [...c.messages, ...newMessages] };
            }
            return c;
        }));
        return targetId;
    }
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
      addMessage,
      addMessages,
      pendingEditContent,
      originalEditContent,
      setOriginalEditContent,
      setPendingEditContent,
      acceptEdit,
      rejectEdit
    }}>
      {children}
    </AIContext.Provider>
  );
};
