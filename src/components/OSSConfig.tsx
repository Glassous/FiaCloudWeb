import React, { useEffect, useState } from 'react';
import { ossRegions, getEndpoint } from '../utils/regions';
import type { OSSConfigData, AIConfigData } from '../types';
import { encrypt, decrypt } from '../utils/crypto';
import { useUI } from '../contexts/UIContext';

interface OSSConfigProps {
  onConfigSaved: (config: OSSConfigData) => void;
  onAIConfigSaved?: (config: AIConfigData) => void;
}

const OSSConfig: React.FC<OSSConfigProps> = ({ onConfigSaved, onAIConfigSaved }) => {
  const { showToast } = useUI();
  const [formData, setFormData] = useState<OSSConfigData>({
    accessKeyId: '',
    accessKeySecret: '',
    region: 'oss-cn-hangzhou',
    endpoint: '',
    bucket: ''
  });

  const [aiFormData, setAiFormData] = useState<AIConfigData>({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo'
  });

  useEffect(() => {
      // Load OSS Config
      const savedConfig = localStorage.getItem('fiacloud_oss_config');
      if (savedConfig) {
          try {
              const decrypted = decrypt(savedConfig);
              const config = JSON.parse(decrypted);
              setFormData(config);
          } catch (e) {
              console.error('Failed to decrypt config', e);
          }
      } else {
        // Set default endpoint for default region
        setFormData(prev => ({
            ...prev,
            endpoint: getEndpoint('oss-cn-hangzhou')
        }));
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => {
          const newData = { ...prev, [name]: value };
          if (name === 'region') {
              newData.endpoint = getEndpoint(value);
          }
          return newData;
      });
  };

  const handleAIChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setAiFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let success = true;

    // Save OSS Config
    try {
        const configStr = JSON.stringify(formData);
        const encrypted = encrypt(configStr);
        localStorage.setItem('fiacloud_oss_config', encrypted);
        onConfigSaved(formData);
    } catch (e) {
        success = false;
        showToast('OSS配置保存失败', 'error');
    }

    // Save AI Config
    try {
        const aiConfigStr = JSON.stringify(aiFormData);
        const aiEncrypted = encrypt(aiConfigStr);
        localStorage.setItem('fiacloud_ai_config', aiEncrypted);
        window.dispatchEvent(new Event('ai_config_updated')); // Notify AI Context
        if (onAIConfigSaved) {
            onAIConfigSaved(aiFormData);
        }
    } catch (e) {
        success = false;
        // Don't show error if it's just empty, but here we might want to warn
        console.error('AI Config save failed', e);
    }

    if (success) {
        showToast('配置已保存', 'success');
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

  const sectionHeaderStyle = {
      fontSize: '16px',
      fontWeight: 'bold',
      marginBottom: '16px',
      color: 'var(--text-primary)',
      borderBottom: '1px solid var(--border-subtle)',
      paddingBottom: '8px',
      marginTop: '24px'
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      
      <div style={{...sectionHeaderStyle, marginTop: 0}}>OSS 配置</div>

      <div style={formItemStyle}>
        <label style={labelStyle}>AccessKey ID</label>
        <input
            type="password"
            name="accessKeyId"
            value={formData.accessKeyId}
            onChange={handleChange}
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
            value={formData.accessKeySecret}
            onChange={handleChange}
            placeholder="Secret..."
            required
            className="glass-input"
        />
      </div>

      <div style={formItemStyle}>
        <label style={labelStyle}>地域 (Region)</label>
        <select
            name="region"
            value={formData.region}
            onChange={handleChange}
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
            value={formData.endpoint}
            onChange={handleChange}
            placeholder="oss-cn-hangzhou.aliyuncs.com"
            required
            className="glass-input"
        />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>选择地域后自动填充，也可以手动修改</div>
      </div>

      <div style={formItemStyle}>
        <label style={labelStyle}>Bucket 名称</label>
        <input
            type="text"
            name="bucket"
            value={formData.bucket}
            onChange={handleChange}
            placeholder="my-bucket"
            required
            className="glass-input"
        />
      </div>

      <div style={sectionHeaderStyle}>AI 配置 (OpenAI 协议)</div>

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

      <div>
        <button
            type="submit"
            className="glass-button primary"
            style={{
                width: '100%',
                height: 40,
                fontSize: 14,
                fontWeight: 500,
                justifyContent: 'center'
            }}
        >
          保存并连接
        </button>
      </div>
    </form>
  );
};

export default OSSConfig;
