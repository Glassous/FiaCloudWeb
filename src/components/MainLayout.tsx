import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaCog, FaTimes, FaSun, FaMoon, FaAdjust, FaBars } from 'react-icons/fa';
import OSSConfig from './OSSConfig';
import FileList from './FileList';
import FilePreview from './FilePreview';
import { useOSS } from '../hooks/useOSS';
import { decrypt } from '../utils/crypto';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import type { OSSFile, OSSConfigData } from '../types';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<OSSFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  const { theme, cycleTheme } = useTheme();
  const { showConfirm, showToast } = useUI();

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { 
    files, 
    loading: listLoading, 
    initClient, 
    listFiles, 
    uploadFile, 
    getFileUrl, 
    getFileContent,
    deleteFile,
    deleteFolder,
    renameFile,
    createFolder,
    createTextFile
  } = useOSS();

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = () => {
    const savedConfig = localStorage.getItem('fiacloud_oss_config');
    if (savedConfig) {
      try {
        const decrypted = decrypt(savedConfig);
        const config: OSSConfigData = JSON.parse(decrypted);
        const ossClient = initClient(config);
        if (ossClient) {
          setIsConfigured(true);
          setTimeout(() => listFiles(ossClient), 100); 
        }
      } catch (error) {
        console.error('Config load failed', error);
        setIsConfigured(false);
      }
    } else {
      setIsConfigured(false);
    }
  };

  const handleConfigSaved = (config: OSSConfigData) => {
    const ossClient = initClient(config);
    if (ossClient) {
      setIsConfigured(true);
      setShowConfigModal(false);
      listFiles(ossClient);
    }
  };

  const handleFileSelect = async (file: OSSFile | null, folderPath?: string) => {
    // Auto-close sidebar on mobile when file is selected
    if (file && window.innerWidth <= 768) {
        setIsSidebarOpen(false);
    }

    if (file) {
      setSelectedFile(file);
      setFileContent('');
      
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts')) {
        setContentLoading(true);
        const content = await getFileContent(file.name);
        setFileContent(content);
        setContentLoading(false);
      }
    } else {
        setSelectedFile(null);
        setFileContent('');
    }
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const url = getFileUrl(selectedFile.name);
    if (url) {
      window.open(url);
    } else {
      showToast('无法获取下载链接', 'error');
    }
  };

  const handleUpload = async (file: File, folderPath?: string) => {
    await uploadFile(file, folderPath);
  };

  const handleCreateFile = async (fileName: string, parentPath?: string) => {
    await createTextFile(fileName, parentPath);
  };

  const handleCreateFolder = async (folderName: string, parentPath?: string) => {
    await createFolder(folderName, parentPath);
  };

  const handleClearConfig = () => {
      showConfirm({
          title: '清除配置确认',
          message: '确定要清除 OSS 配置吗？这将需要重新输入 AccessKey 等信息。',
          type: 'danger',
          onConfirm: () => {
              localStorage.removeItem('fiacloud_oss_config');
              setIsConfigured(false);
              setSelectedFile(null);
              setShowConfigModal(false);
              showToast('配置已清除', 'success');
          }
      });
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <FaSun />;
    if (theme === 'dark') return <FaMoon />;
    return <FaAdjust />;
  };

  if (!isConfigured) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, right: 20 }}>
             <button 
                onClick={cycleTheme} 
                className="glass-button" 
                title={`当前模式: ${theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}`}
             >
                {getThemeIcon()}
             </button>
          </div>
          <div className="glass-panel" style={{ width: '600px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 24px 0', textAlign: 'center' }}>OSS 配置</h3>
              <OSSConfig onConfigSaved={handleConfigSaved} />
          </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="glass-panel app-header" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="glass-button"
                style={{ padding: '8px', border: 'none', background: 'transparent', fontSize: '18px' }}
                title={isSidebarOpen ? "收起侧栏" : "展开侧栏"}
            >
                <FaBars />
            </button>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>FiaCloud</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={cycleTheme}
                className="glass-button"
                title={`当前模式: ${theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}`}
            >
                {getThemeIcon()}
            </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="app-content-wrapper" style={{ position: 'relative' }}>
        {/* Sidebar */}
        <div className={`glass-panel app-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <FileList 
                    files={files}
                    selectedFile={selectedFile}
                    onSelect={handleFileSelect}
                    onUpload={handleUpload}
                    onRefresh={() => listFiles()}
                    onDelete={deleteFile}
                    onDeleteFolder={deleteFolder}
                    onRename={renameFile}
                    onCreateFolder={handleCreateFolder}
                    onCreateFile={handleCreateFile}
                    loading={listLoading}
                />
            </div>
            <div style={{ 
                padding: '12px', 
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex', 
                gap: '10px'
            }}>
                <button 
                    onClick={() => setShowConfigModal(true)}
                    className="glass-button"
                    style={{ flex: 1, justifyContent: 'center' }}
                    title="配置"
                >
                    <FaCog /> 配置
                </button>
                <button 
                    onClick={onLogout}
                    className="glass-button danger"
                    style={{ flex: 1, justifyContent: 'center' }}
                    title="退出"
                >
                    <FaSignOutAlt /> 退出
                </button>
            </div>
        </div>
        {/* Main Preview Area */}
        {isSidebarOpen && window.innerWidth <= 768 && (
            <div 
                className="mobile-backdrop"
                onClick={() => setIsSidebarOpen(false)}
            />
        )}
        <div className="glass-panel app-main">
          <FilePreview 
            file={selectedFile}
            content={fileContent}
            loading={contentLoading}
            onDownload={handleDownload}
          />
        </div>
      </div>

      {/* Modal Overlay */}
      {showConfigModal && (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{
                padding: '24px',
                width: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>OSS 配置</h3>
                    <button onClick={() => setShowConfigModal(false)} className="glass-button" style={{ padding: '8px' }}>
                        <FaTimes />
                    </button>
                </div>
                
                <OSSConfig onConfigSaved={handleConfigSaved} />
                
                <div style={{ marginTop: 16, textAlign: 'right', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <button 
                        onClick={handleClearConfig}
                        className="glass-button danger"
                    >
                        清除配置
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
