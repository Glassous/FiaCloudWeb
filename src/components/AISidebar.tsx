import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../contexts/AIContext';
import { FaPaperPlane, FaRobot, FaTimes, FaEdit, FaPlus, FaHistory, FaTrash, FaFile } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AISidebarProps {
    currentFile?: {
        name: string;
        content: string;
    } | null;
    onFileUpdate?: (content: string) => void;
}

const AISidebar: React.FC<AISidebarProps> = ({ currentFile, onFileUpdate }) => {
    const { 
        isOpen, 
        toggleSidebar, 
        messages, 
        sendMessage, 
        loading, 
        isEditMode, 
        toggleEditMode, 
        generateEdit, 
        addMessage, 
        addContextFile, 
        startNewConversation,
        conversations,
        currentConversationId,
        selectConversation,
        deleteConversation
    } = useAI();
    const [input, setInput] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto add context when file changes
    useEffect(() => {
        if (currentFile && isOpen) {
            addContextFile(currentFile.name, currentFile.content);
        }
    }, [currentFile, isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;
        
        const msg = input;
        setInput('');

        if (isEditMode && currentFile && onFileUpdate) {
            addMessage('user', msg);
            try {
                const newContent = await generateEdit(msg, currentFile.content);
                onFileUpdate(newContent);
                addMessage('assistant', `Updated ${currentFile.name} based on your instructions.`);
            } catch (e: any) {
                addMessage('assistant', `Failed to edit file: ${e.message}`);
            }
        } else {
            await sendMessage(msg);
        }
    };

    const handleNewChat = () => {
        startNewConversation();
        setShowHistory(false);
    };

    // We no longer return null here to allow for animation in the parent
    // The parent container will handle visibility via width/transform
    
    return (
        <div className="ai-sidebar-container">
            <div className="ai-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaRobot />
                    <span style={{ fontWeight: 'bold' }}>AI 助手</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        onClick={() => setShowHistory(!showHistory)} 
                        className={`glass-button ${showHistory ? 'active' : ''}`}
                        title="历史记录"
                    >
                        <FaHistory />
                    </button>
                    <button onClick={handleNewChat} className="glass-button" title="新对话">
                        <FaPlus />
                    </button>
                    <button 
                        onClick={toggleEditMode} 
                        className={`glass-button ${isEditMode ? 'active' : ''}`}
                        title={isEditMode ? "退出编辑模式" : "进入编辑模式"}
                        style={{ color: isEditMode ? '#4caf50' : 'inherit', borderColor: isEditMode ? '#4caf50' : 'transparent' }}
                    >
                        <FaEdit />
                    </button>
                    <button onClick={toggleSidebar} className="glass-button">
                        <FaTimes />
                    </button>
                </div>
            </div>

            {showHistory ? (
                <div className="ai-history-list">
                    <h4 style={{ padding: '0 16px', margin: '10px 0' }}>对话历史</h4>
                    {conversations.length === 0 ? (
                        <div style={{ padding: 16, color: 'var(--text-secondary)', textAlign: 'center' }}>暂无历史记录</div>
                    ) : (
                        conversations.map(conv => (
                            <div 
                                key={conv.id} 
                                className={`history-item ${currentConversationId === conv.id ? 'active' : ''}`}
                                onClick={() => {
                                    selectConversation(conv.id);
                                    setShowHistory(false);
                                }}
                            >
                                <div className="history-title">{conv.title}</div>
                                <div className="history-date">{new Date(conv.createdAt).toLocaleString()}</div>
                                <button 
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteConversation(conv.id);
                                    }}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="ai-messages">
                    {messages.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            有什么我可以帮你的吗？
                            {isEditMode && <div style={{ marginTop: 8, fontSize: 12, color: '#4caf50' }}>当前处于编辑模式，AI 可以直接修改文件内容。</div>}
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`message ${msg.role}`}>
                            <div className="message-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="message assistant">
                            <div className="message-content">思考中...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className="ai-input-wrapper">
                {currentFile && isOpen && (
                    <div className="current-file-indicator">
                        <FaFile size={12} />
                        <span className="filename">{currentFile.name}</span>
                        {isEditMode && <span className="mode-badge">编辑中</span>}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="ai-input-area">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isEditMode ? "输入修改指令..." : "输入消息..."}
                        className="glass-input"
                        disabled={loading}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="glass-button primary" disabled={loading} style={{ padding: '0 12px' }}>
                        <FaPaperPlane />
                    </button>
                </form>
            </div>

            <style>{`
                .ai-sidebar-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .ai-header {
                    padding: 16px;
                    border-bottom: 1px solid var(--border-subtle);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-shrink: 0;
                }

                .ai-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                
                .ai-history-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }
                
                .history-item {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-subtle);
                    cursor: pointer;
                    position: relative;
                    transition: background 0.2s;
                }
                
                .history-item:hover {
                    background: rgba(255,255,255,0.05);
                }
                
                .history-item.active {
                    background: rgba(255,255,255,0.1);
                    border-left: 3px solid var(--primary-color, #007bff);
                }
                
                .history-title {
                    font-weight: 500;
                    margin-bottom: 4px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    padding-right: 20px;
                }
                
                .history-date {
                    font-size: 11px;
                    color: var(--text-secondary);
                }
                
                .delete-btn {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                    padding: 4px;
                }
                
                .history-item:hover .delete-btn {
                    opacity: 1;
                }
                
                .delete-btn:hover {
                    color: #ff4d4f;
                }

                .message {
                    display: flex;
                    flex-direction: column;
                    max-width: 85%;
                }

                .message.user {
                    align-self: flex-end;
                }

                .message.assistant {
                    align-self: flex-start;
                }

                .message-content {
                    padding: 10px 14px;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .message-content p {
                    margin: 0;
                }
                
                .message-content p + p {
                    margin-top: 8px;
                }

                .message.user .message-content {
                    background: var(--primary-color, #007bff);
                    color: white;
                }
                
                .message.assistant .message-content {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                }

                .ai-input-wrapper {
                    border-top: 1px solid var(--border-subtle);
                    flex-shrink: 0;
                }

                .current-file-indicator {
                    padding: 8px 16px 0;
                    font-size: 12px;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .current-file-indicator .filename {
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .mode-badge {
                    font-size: 10px;
                    background: rgba(76, 175, 80, 0.1);
                    color: #4caf50;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .ai-input-area {
                    padding: 16px;
                    display: flex;
                    gap: 8px;
                }
            `}</style>
        </div>
    );
};

export default AISidebar;
