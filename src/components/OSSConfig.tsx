import React, { useEffect, useState } from 'react';
import { ossRegions, getEndpoint } from '../utils/regions';
import type { OSSConfigData, AIConfigData, R2ConfigData, StorageProvider } from '../types';
import { encrypt, decrypt } from '../utils/crypto';
import { useUI } from '../contexts/UIContext';
import { FaServer, FaCloud, FaMagic, FaCheckCircle } from 'react-icons/fa';

interface OSSConfigProps {
  onConfigSaved: (provider: StorageProvider, config: OSSConfigData | R2ConfigData) => void;
  onAIConfigSaved?: (config: AIConfigData) => void;
}

const OSSConfig: React.FC<OSSConfigProps> = ({ onConfigSaved, onAIConfigSaved }) => {
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState<'aliyun' | 'r2' | 'ai'>('aliyun');
  const [activeProvider, setActiveProvider] = useState<StorageProvider>('aliyun');

  const [ossFormData, setOssFormData] = useState<OSSConfigData>({
    accessKeyId: '',
    accessKeySecret: '',
    region: 'oss-cn-hangzhou',
    endpoint: '',
    bucket: ''
  });

  const [r2FormData, setR2FormData] = useState<R2ConfigData>({
    accountId: '',
    accessKeyId: '',
    accessKeySecret: '',
    bucket: '',
    customDomain: ''
  });

  const [aiFormData, setAiFormData] = useState<AIConfigData>({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo'
  });

  useEffect(() => {
      // Load Active Provider
      const savedProvider = localStorage.getItem('fiacloud_active_provider') as StorageProvider;
      if (savedProvider) {
          setActiveProvider(savedProvider);
          if (savedProvider === 'r2') setActiveTab('r2');
      }

      // Load OSS Config
      const savedConfig = localStorage.getItem('fiacloud_oss_config');
      if (savedConfig) {
          try {
              const decrypted = decrypt(savedConfig);
              const config = JSON.parse(decrypted);
              setOssFormData(config);
          } catch (e) {
              console.error('Failed to decrypt oss config', e);
          }
      } else {
        setOssFormData(prev => ({
            ...prev,
            endpoint: getEndpoint('oss-cn-hangzhou')
        }));
      }

      // Load R2 Config
      const savedR2Config = localStorage.getItem('fiacloud_r2_config');
      if (savedR2Config) {
          try {
              const decrypted = decrypt(savedR2Config);
              const config = JSON.parse(decrypted);
              setR2FormData(config);
          } catch (e) {
              console.error('Failed to decrypt r2 config', e);
          }
      }

      // Load AI Config
      const savedAIConfig = localStorage.getItem('fiacloud_ai_config');
      if (savedAIConfig) {
          try {
              const decrypted = decrypt(savedAIConfig);
              const config = JSON.parse(decrypted);
              setAiFormData(config);
          } catch (e) {
              console.error('Failed to decrypt ai config', e);
          }
      }
  }, []);

  const handleOssChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setOssFormData(prev => {
          const newData = { ...prev, [name]: value };
          if (name === 'region') {
              newData.endpoint = getEndpoint(value);
          }
          return newData;
      });
  };

  const handleR2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setR2FormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAIChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setAiFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent | React.MouseEvent, shouldSwitch: boolean = false) => {
    e.preventDefault();
    let success = true;
    let currentConfig: OSSConfigData | R2ConfigData | null = null;

    if (activeTab === 'aliyun') {
        try {
            const configStr = JSON.stringify(ossFormData);
            const encrypted = encrypt(configStr);
            localStorage.setItem('fiacloud_oss_config', encrypted);
            currentConfig = ossFormData;
        } catch (e) {
            success = false;
            showToast('Aliyun OSS配置保存失败', 'error');
        }
    } else if (activeTab === 'r2') {
        try {
            const configStr = JSON.stringify(r2FormData);
            const encrypted = encrypt(configStr);
            localStorage.setItem('fiacloud_r2_config', encrypted);
            currentConfig = r2FormData;
        } catch (e) {
            success = false;
            showToast('R2配置保存失败', 'error');
        }
    } else if (activeTab === 'ai') {
        try {
            const aiConfigStr = JSON.stringify(aiFormData);
            const aiEncrypted = encrypt(aiConfigStr);
            localStorage.setItem('fiacloud_ai_config', aiEncrypted);
            window.dispatchEvent(new Event('ai_config_updated'));
            if (onAIConfigSaved) {
                onAIConfigSaved(aiFormData);
            }
        } catch (e) {
            success = false;
            showToast('AI配置保存失败', 'error');
        }
    }

    if (success) {
        if (shouldSwitch && currentConfig && (activeTab === 'aliyun' || activeTab === 'r2')) {
            localStorage.setItem('fiacloud_active_provider', activeTab);
            setActiveProvider(activeTab);
            onConfigSaved(activeTab, currentConfig);
            showToast(`已切换至 ${activeTab === 'aliyun' ? 'Aliyun OSS' : 'Cloudflare R2'}`, 'success');
        } else {
            showToast('配置已保存', 'success');
        }
    }
  };

  const labelStyle = {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 500,
      fontSize: '14px',
      color: 'var(--text-primary)'
  };

  const formItemStyle = {
      marginBottom: '24px'
  };

  return (
    <div style={{ display: 'flex', height: '500px' }}>
        {/* Sidebar */}
        <div style={{ 
            width: '180px', 
            borderRight: '1px solid var(--border-subtle)', 
            paddingRight: '16px',
            marginRight: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            <div 
                className={`config-tab ${activeTab === 'aliyun' ? 'active' : ''}`}
                onClick={() => setActiveTab('aliyun')}
                style={{ 
                    padding: '10px 12px', 
                    cursor: 'pointer', 
                    borderRadius: '8px',
                    backgroundColor: activeTab === 'aliyun' ? 'var(--bg-secondary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >
                <FaServer /> Aliyun OSS
                {activeProvider === 'aliyun' && <FaCheckCircle style={{ marginLeft: 'auto', color: '#4caf50' }} />}
            </div>
            <div 
                className={`config-tab ${activeTab === 'r2' ? 'active' : ''}`}
                onClick={() => setActiveTab('r2')}
                style={{ 
                    padding: '10px 12px', 
                    cursor: 'pointer', 
                    borderRadius: '8px',
                    backgroundColor: activeTab === 'r2' ? 'var(--bg-secondary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >
                <FaCloud /> Cloudflare R2
                {activeProvider === 'r2' && <FaCheckCircle style={{ marginLeft: 'auto', color: '#4caf50' }} />}
            </div>
            <div 
                className={`config-tab ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}
                style={{ 
                    padding: '10px 12px', 
                    cursor: 'pointer', 
                    borderRadius: '8px',
                    backgroundColor: activeTab === 'ai' ? 'var(--bg-secondary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 500
                }}
            >
                <FaMagic /> AI Configuration
            </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            <form onSubmit={handleSave}>
                {activeTab === 'aliyun' && (
                    <>
                        <h3 style={{ marginTop: 0, marginBottom: 24 }}>Aliyun OSS 设置</h3>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>AccessKey ID</label>
                            <input
                                type="password"
                                name="accessKeyId"
                                value={ossFormData.accessKeyId}
                                onChange={handleOssChange}
                                placeholder="LTAI..."
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>AccessKey Secret</label>
                            <input
                                type="password"
                                name="accessKeySecret"
                                value={ossFormData.accessKeySecret}
                                onChange={handleOssChange}
                                placeholder="Secret..."
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>地域 (Region)</label>
                            <select
                                name="region"
                                value={ossFormData.region}
                                onChange={handleOssChange}
                                required
                                className="glass-select"
                                style={{ width: '100%' }}
                            >
                                {ossRegions.map((region) => (
                                    <option key={region.value} value={region.value} style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
                                        {region.label} ({region.value})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Endpoint</label>
                            <input
                                type="text"
                                name="endpoint"
                                value={ossFormData.endpoint}
                                onChange={handleOssChange}
                                placeholder="oss-cn-hangzhou.aliyuncs.com"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Bucket 名称</label>
                            <input
                                type="text"
                                name="bucket"
                                value={ossFormData.bucket}
                                onChange={handleOssChange}
                                placeholder="my-bucket"
                                required
                                className="glass-input"
                            />
                        </div>
                    </>
                )}

                {activeTab === 'r2' && (
                    <>
                        <h3 style={{ marginTop: 0, marginBottom: 24 }}>Cloudflare R2 设置</h3>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Account ID</label>
                            <input
                                type="text"
                                name="accountId"
                                value={r2FormData.accountId}
                                onChange={handleR2Change}
                                placeholder="Account ID"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Access Key ID</label>
                            <input
                                type="password"
                                name="accessKeyId"
                                value={r2FormData.accessKeyId}
                                onChange={handleR2Change}
                                placeholder="Access Key ID"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Secret Access Key</label>
                            <input
                                type="password"
                                name="accessKeySecret"
                                value={r2FormData.accessKeySecret}
                                onChange={handleR2Change}
                                placeholder="Secret Access Key"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Bucket Name</label>
                            <input
                                type="text"
                                name="bucket"
                                value={r2FormData.bucket}
                                onChange={handleR2Change}
                                placeholder="my-r2-bucket"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Custom Domain (Optional)</label>
                            <input
                                type="text"
                                name="customDomain"
                                value={r2FormData.customDomain}
                                onChange={handleR2Change}
                                placeholder="https://cdn.example.com"
                                className="glass-input"
                            />
                             <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>如果不填，将使用临时签名的 R2 URL (有效期 1 小时)</div>
                        </div>
                    </>
                )}

                {activeTab === 'ai' && (
                    <>
                        <h3 style={{ marginTop: 0, marginBottom: 24 }}>AI 设置 (OpenAI Protocol)</h3>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Base URL</label>
                            <input
                                type="text"
                                name="baseUrl"
                                value={aiFormData.baseUrl}
                                onChange={handleAIChange}
                                placeholder="https://api.openai.com/v1"
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>API Key</label>
                            <input
                                type="password"
                                name="apiKey"
                                value={aiFormData.apiKey}
                                onChange={handleAIChange}
                                placeholder="sk-..."
                                className="glass-input"
                            />
                        </div>
                        <div style={formItemStyle}>
                            <label style={labelStyle}>Model</label>
                            <input
                                type="text"
                                name="model"
                                value={aiFormData.model}
                                onChange={handleAIChange}
                                placeholder="gpt-3.5-turbo"
                                className="glass-input"
                            />
                        </div>
                    </>
                )}

                <div style={{ marginTop: 24, display: 'flex', gap: '12px' }}>
                    {activeTab !== 'ai' && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => handleSave(e, false)}
                                className="glass-button"
                                style={{
                                    flex: 1,
                                    height: 40,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    justifyContent: 'center'
                                }}
                            >
                                仅保存配置
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleSave(e, true)}
                                className="glass-button primary"
                                style={{
                                    flex: 1,
                                    height: 40,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    justifyContent: 'center'
                                }}
                            >
                                {activeTab === activeProvider ? '保存并应用' : `保存并切换至 ${activeTab === 'aliyun' ? 'Aliyun OSS' : 'Cloudflare R2'}`}
                            </button>
                        </>
                    )}
                    {activeTab === 'ai' && (
                         <button
                            type="button"
                            onClick={(e) => handleSave(e, false)}
                            className="glass-button primary"
                            style={{
                                width: '100%',
                                height: 40,
                                fontSize: 14,
                                fontWeight: 500,
                                justifyContent: 'center'
                            }}
                        >
                            保存 AI 配置
                        </button>
                    )}
                </div>
            </form>
        </div>
    </div>
  );
};

export default OSSConfig;
