import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

// Types
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  onConfirm: () => void;
  type?: 'danger' | 'info';
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

// Toast Component
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return createPortal(
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className="glass-panel"
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '200px',
            maxWidth: '80vw',
            animation: 'slideInDown 0.3s ease-out',
            pointerEvents: 'auto',
            borderLeft: `4px solid ${
                toast.type === 'success' ? 'var(--success, #52c41a)' : 
                toast.type === 'error' ? 'var(--error, #ff4d4f)' : 
                'var(--accent-primary)'
            }`
          }}
        >
            {toast.type === 'success' && <FaCheckCircle style={{ color: 'var(--success, #52c41a)' }} />}
            {toast.type === 'error' && <FaExclamationCircle style={{ color: 'var(--error, #ff4d4f)' }} />}
            {toast.type === 'info' && <FaInfoCircle style={{ color: 'var(--accent-primary)' }} />}
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
            <button 
                onClick={() => removeToast(toast.id)}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    marginLeft: 'auto', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <FaTimes size={12} />
            </button>
        </div>
      ))}
      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

// Confirm Modal Component
const ConfirmDialog: React.FC<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    type: 'danger' | 'info';
    onConfirm: () => void; 
    onCancel: () => void 
}> = ({ isOpen, title, message, type, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onCancel}>
            <div 
                className="glass-panel"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '400px',
                    maxWidth: '90vw',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    animation: 'scaleIn 0.2s ease-out',
                    transformOrigin: 'center'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    {type === 'danger' ? (
                        <div style={{ 
                            width: 40, height: 40, borderRadius: '50%', 
                            background: 'rgba(255, 77, 79, 0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--error, #ff4d4f)'
                        }}>
                            <FaExclamationCircle size={20} />
                        </div>
                    ) : (
                         <div style={{ 
                            width: 40, height: 40, borderRadius: '50%', 
                            background: 'rgba(24, 144, 255, 0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--accent-primary)'
                        }}>
                            <FaInfoCircle size={20} />
                        </div>
                    )}
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{title}</h3>
                </div>
                
                <p style={{ 
                    margin: '0 0 24px 0', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.5',
                    fontSize: '14px'
                }}>
                    {message}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                        className="glass-button" 
                        onClick={onCancel}
                        style={{ padding: '8px 20px' }}
                    >
                        取消
                    </button>
                    <button 
                        className={`glass-button ${type === 'danger' ? 'danger' : ''}`}
                        onClick={() => {
                            onConfirm();
                            onCancel();
                        }}
                        style={{ 
                            padding: '8px 20px',
                            background: type === 'danger' ? 'var(--error, #ff4d4f)' : 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none'
                        }}
                    >
                        确定
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showConfirm = useCallback(({ title, message, onConfirm, type = 'info' }: ConfirmOptions) => {
    setConfirmConfig({
        isOpen: true,
        title,
        message,
        onConfirm,
        type
    });
  }, []);

  const closeConfirm = useCallback(() => {
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <UIContext.Provider value={{ showToast, showConfirm }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />
    </UIContext.Provider>
  );
};
