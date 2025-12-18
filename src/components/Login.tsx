import React, { useState } from 'react';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { decrypt } from '../utils/crypto';
import { useUI } from '../contexts/UIContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const { showToast } = useUI();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate a slight delay for better UX
    setTimeout(() => {
        const storedSystemPassword = localStorage.getItem('fiacloud_access_password');
        
        if (!storedSystemPassword) {
            // No password set, allow entry
            onLoginSuccess();
        } else {
            try {
                const decryptedSystemPassword = decrypt(storedSystemPassword);
                if (password === decryptedSystemPassword) {
                    onLoginSuccess();
                } else {
                    showToast('密码错误', 'error');
                }
            } catch (e) {
                showToast('系统密码校验失败，请清除缓存重试', 'error');
            }
        }
        setLoading(false);
    }, 500);
  };

  const handleReset = () => {
      localStorage.clear();
      window.location.reload();
  };

  return (
    <div className="flex-center" style={{ 
      height: '100%', 
      width: '100%',
    }}>
      <div className="glass-panel" style={{ 
          width: 400, 
          padding: 40, 
          borderRadius: 24,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 600 }}>FiaCloud 文件管理</h2>
          <div className="text-secondary">请输入访问密码</div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 32 }}>
            <div className="glass-input" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '10px 16px',
            }}>
                <FaLock style={{ color: 'var(--text-secondary)', marginRight: 12 }} />
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="访问密码 (未设置密码可直接登录)" 
                    style={{
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        background: 'transparent',
                        color: 'inherit',
                        fontSize: 16
                    }}
                />
            </div>
          </div>

          <div>
            <button 
                type="submit" 
                disabled={loading}
                className="glass-button primary"
                style={{
                    width: '100%',
                    height: 48,
                    fontSize: 16,
                    justifyContent: 'center',
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                }}
            >
              {loading ? '验证中...' : '进入系统'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: 14,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        opacity: 0.8
                    }}
                >
                    忘记密码？
                </button>
            </div>
          </div>
        </form>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
          <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s ease-out'
          }}>
              <div className="glass-panel" style={{
                  width: '450px',
                  maxWidth: '90vw',
                  padding: '32px',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255, 77, 79, 0.3)'
              }}>
                  <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <div style={{ 
                          width: 60, height: 60, borderRadius: '50%', 
                          background: 'rgba(255, 77, 79, 0.1)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 16px auto',
                          color: '#ff4d4f'
                      }}>
                          <FaExclamationTriangle size={30} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#ff4d4f' }}>
                          危险操作警告
                      </h3>
                  </div>

                  <div style={{ marginBottom: 24, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
                      <p>您正在申请重置系统。此操作将产生以下后果：</p>
                      <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                          <li>清除所有本地存储的配置信息</li>
                          <li>清除已保存的 AccessKey 和密钥</li>
                          <li>清除 AI 模型设置和历史记录</li>
                          <li>重置登录密码</li>
                      </ul>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>此操作不可恢复！</p>
                  </div>

                  <div style={{ marginBottom: 24 }}>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                          请在下方输入 <span style={{ userSelect: 'all', fontWeight: 'bold', color: 'var(--text-primary)' }}>我确认忘记密码并确认清空数据</span> 以确认：
                      </label>
                      <input 
                          type="text" 
                          value={resetConfirmation}
                          onChange={(e) => setResetConfirmation(e.target.value)}
                          className="glass-input"
                          placeholder="在此输入确认文本"
                          style={{ width: '100%', border: '1px solid rgba(255, 77, 79, 0.3)' }}
                      />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                      <button 
                          onClick={() => {
                              setShowResetModal(false);
                              setResetConfirmation('');
                          }}
                          className="glass-button"
                          style={{ flex: 1, justifyContent: 'center', height: 40 }}
                      >
                          取消
                      </button>
                      <button 
                          onClick={handleReset}
                          disabled={resetConfirmation !== '我确认忘记密码并确认清空数据'}
                          className="glass-button"
                          style={{ 
                              flex: 1, 
                              justifyContent: 'center', 
                              height: 40,
                              backgroundColor: 'var(--error, #ff4d4f)',
                              color: '#fff',
                              border: 'none',
                              opacity: resetConfirmation !== '我确认忘记密码并确认清空数据' ? 0.5 : 1,
                              cursor: resetConfirmation !== '我确认忘记密码并确认清空数据' ? 'not-allowed' : 'pointer'
                          }}
                      >
                          确认重置系统
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Login;
