import React, { useEffect, useState } from 'react';
import { ossRegions, getEndpoint } from '../utils/regions';
import type { OSSConfigData } from '../types';
import { encrypt, decrypt } from '../utils/crypto';

interface OSSConfigProps {
  onConfigSaved: (config: OSSConfigData) => void;
}

const OSSConfig: React.FC<OSSConfigProps> = ({ onConfigSaved }) => {
  const [formData, setFormData] = useState<OSSConfigData>({
    accessKeyId: '',
    accessKeySecret: '',
    region: 'oss-cn-hangzhou',
    endpoint: '',
    bucket: ''
  });

  useEffect(() => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const configStr = JSON.stringify(formData);
        const encrypted = encrypt(configStr);
        localStorage.setItem('fiacloud_oss_config', encrypted);
        alert('配置已保存');
        onConfigSaved(formData);
    } catch (e) {
        alert('配置保存失败');
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
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      
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
