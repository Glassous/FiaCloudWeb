import React, { useState, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';
import { encrypt, decrypt } from '../utils/crypto';
import { useUI } from '../contexts/UIContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useUI();

  useEffect(() => {
    const savedPassword = localStorage.getItem('fiacloud_auth');
    if (savedPassword) {
      try {
        const decryptedPassword = decrypt(savedPassword);
        const envPassword = import.meta.env.VITE_APP_ACCESS_PASSWORD;
        
        setPassword(decryptedPassword);
        setRemember(true);

        // Auto login if password matches
        if (decryptedPassword === envPassword) {
            onLoginSuccess();
        }
      } catch (error) {
        localStorage.removeItem('fiacloud_auth');
      }
    }
  }, [onLoginSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const envPassword = import.meta.env.VITE_APP_ACCESS_PASSWORD;
    
    // Simulate a slight delay for better UX
    setTimeout(() => {
      if (password === envPassword) {
        if (remember) {
          localStorage.setItem('fiacloud_auth', encrypt(password));
        } else {
          localStorage.removeItem('fiacloud_auth');
        }
        onLoginSuccess();
      } else {
        // If it was a saved password that failed (e.g. env var changed), we should warn
        const savedPassword = localStorage.getItem('fiacloud_auth');
        if (savedPassword) {
            try {
                 const decrypted = decrypt(savedPassword);
                 if (decrypted === password && password !== envPassword) {
                     showToast('密码已修改，请重新输入', 'error');
                     localStorage.removeItem('fiacloud_auth'); // Clear invalid password
                     setPassword('');
                 } else {
                    showToast('密码错误', 'error');
                 }
            } catch {
                showToast('密码错误', 'error');
            }
        } else {
            showToast('密码错误', 'error');
        }
      }
      setLoading(false);
    }, 500);
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
          <div style={{ marginBottom: 24 }}>
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
                    placeholder="访问密码" 
                    required
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

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                    type="checkbox" 
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    style={{ marginRight: 8, accentColor: 'var(--accent-primary)' }}
                />
                <span className="text-secondary">记住密码</span>
            </label>
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
