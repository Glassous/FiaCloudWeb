import React, { useState, useEffect } from 'react';
import { FaSignOutAlt, FaCog, FaTimes, FaSun, FaMoon, FaAdjust, FaBars, FaDownload, FaSearchPlus, FaSearchMinus, FaEllipsisV, FaCode, FaEye, FaSave, FaRobot } from 'react-icons/fa';
import OSSConfig from './OSSConfig';
import FileList from './FileList';
import FilePreview from './FilePreview';
import AISidebar from './AISidebar';
import { useOSS } from '../hooks/useOSS';
import { decrypt } from '../utils/crypto';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import { useAI } from '../contexts/AIContext';
import type { OSSFile, OSSConfigData } from '../types';

interface MainLayoutProps {
  onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<OSSFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [contentLoading, setContentLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  
  const { theme, cycleTheme } = useTheme();
  const { showConfirm, showToast } = useUI();
  const { toggleSidebar: toggleAISidebar, isOpen: isAIOpen } = useAI();

  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth <= 768;
        setIsMobile(mobile);
        if (mobile) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
            setShowMobileMenu(false); // Reset mobile menu on desktop
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
    saveFileContent,
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

  const handleFileSelect = async (file: OSSFile | null, _folderPath?: string) => {
    // Auto-close sidebar on mobile when file is selected
    if (file && window.innerWidth <= 768) {
        setIsSidebarOpen(false);
    }

    if (file) {
      setSelectedFile(file);
      setFileContent('');
      setFontSize(14); // Reset font size
      
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.csv')) {
        setContentLoading(true);
        const content = await getFileContent(file.name);
        setFileContent(content);
        setEditedContent(content);
        if (file.name.endsWith('.md') || file.name.endsWith('.csv')) {
            setViewMode('preview');
        } else {
            setViewMode('source');
        }
        setContentLoading(false);
      }
    } else {
        setSelectedFile(null);
        setFileContent('');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    await saveFileContent(selectedFile.name, editedContent);
    setFileContent(editedContent);
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

  const isTextFile = selectedFile && (
      selectedFile.name.endsWith('.txt') || 
      selectedFile.name.endsWith('.md') || 
      selectedFile.name.endsWith('.json') || 
      selectedFile.name.endsWith('.js') || 
      selectedFile.name.endsWith('.ts') ||
      selectedFile.name.endsWith('.csv')
  );

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, overflow: 'hidden' }}>
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="glass-button"
                style={{ padding: '8px', border: 'none', background: 'transparent', fontSize: '18px', flexShrink: 0 }}
                title={isSidebarOpen ? "收起侧栏" : "展开侧栏"}
            >
                <FaBars />
            </button>
            
            {/* Dynamic Title - Hides when mobile menu is open */}
            <div className={`header-title-wrapper ${isMobile && showMobileMenu ? 'hidden' : ''}`} style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                flexShrink: 1, 
                textOverflow: 'ellipsis'
            }}>
                {selectedFile ? selectedFile.name : 'FiaCloud'}
            </div>
            
            <div style={{ flex: 1 }} />

            {/* Controls Group */}
            <div className={`header-controls-wrapper ${isMobile && !showMobileMenu ? 'hidden' : ''}`}>
                {selectedFile && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {isTextFile && (
                            <>
                                {(selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.csv')) && (
                                    <div style={{ display: 'flex', backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: '6px', padding: '2px', marginRight: '8px' }}>
                                        <button
                                            onClick={() => setViewMode('preview')}
                                            className="glass-button"
                                            style={{ 
                                                padding: '6px 10px', 
                                                borderRadius: '4px',
                                                backgroundColor: viewMode === 'preview' ? 'var(--bg-primary)' : 'transparent',
                                                boxShadow: viewMode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                border: 'none',
                                                color: viewMode === 'preview' ? 'var(--text-primary)' : 'var(--text-secondary)'
                                            }}
                                            title="预览"
                                        >
                                            <FaEye />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('source')}
                                            className="glass-button"
                                            style={{ 
                                                padding: '6px 10px', 
                                                borderRadius: '4px',
                                                backgroundColor: viewMode === 'source' ? 'var(--bg-primary)' : 'transparent',
                                                boxShadow: viewMode === 'source' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                border: 'none',
                                                color: viewMode === 'source' ? 'var(--text-primary)' : 'var(--text-secondary)'
                                            }}
                                            title="源码"
                                        >
                                            <FaCode />
                                        </button>
                                    </div>
                                )}
                                
                                {viewMode === 'source' && (
                                     <button 
                                        onClick={handleSave} 
                                        title={fileContent !== editedContent ? "保存 (未保存)" : "保存 (已保存)"}
                                        className="glass-button"
                                        style={{ 
                                            padding: '6px 10px', 
                                            marginRight: '8px', 
                                            color: fileContent !== editedContent ? '#4caf50' : 'var(--text-secondary)',
                                            borderColor: fileContent !== editedContent ? '#4caf50' : 'var(--border-subtle)'
                                        }}
                                    >
                                        <FaSave />
                                    </button>
                                )}

                                <button 
                                    onClick={() => setFontSize(s => Math.min(s + 2, 32))} 
                                    title="放大" 
                                    className="glass-button"
                                    style={{ padding: '6px 10px' }}
                                >
                                    <FaSearchPlus />
                                </button>
                                <button 
                                    onClick={() => setFontSize(s => Math.max(s - 2, 10))} 
                                    title="缩小" 
                                    className="glass-button"
                                    style={{ padding: '6px 10px' }}
                                >
                                    <FaSearchMinus />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={handleDownload} 
                            className="glass-button primary"
                            style={{ 
                                padding: '6px 15px', 
                                gap: 6
                            }}
                        >
                            <FaDownload /> {isMobile ? '' : '下载'}
                        </button>
                    </div>
                )}
                
                <button 
                    onClick={cycleTheme}
                    className="glass-button"
                    title={`当前模式: ${theme === 'system' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}`}
                >
                    {getThemeIcon()}
                </button>

                <button 
                    onClick={toggleAISidebar}
                    className="glass-button"
                    title="AI 助手"
                >
                    <FaRobot />
                </button>
            </div>
            
            {/* Mobile Menu Toggle */}
            {isMobile && selectedFile && (
                <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)} 
                    className="glass-button"
                    style={{ padding: '8px', marginLeft: '8px' }}
                >
                    <FaEllipsisV />
                </button>
            )}
        </div>
      </div>
      
      {/* Content */}
      <div className="app-content-wrapper" style={{ position: 'relative', display: 'flex', flex: 1, overflow: 'hidden' }}>
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
        <div className="glass-panel app-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, transition: 'all 0.3s ease' }}>
          <FilePreview 
            file={selectedFile}
            content={editedContent}
            loading={contentLoading}
            fontSize={fontSize}
            viewMode={viewMode}
            onContentChange={setEditedContent}
          />
        </div>

        {/* Desktop AI Sidebar */}
        {!isMobile && (
            <div style={{
                width: isAIOpen ? '350px' : '0',
                marginLeft: isAIOpen ? '16px' : '0',
                opacity: isAIOpen ? 1 : 0,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
            }}>
                 <AISidebar 
                    currentFile={selectedFile ? { name: selectedFile.name, content: editedContent } : null}
                    onFileUpdate={(newContent) => {
                        setEditedContent(newContent);
                    }}
                />
            </div>
        )}
      </div>

      {/* Mobile AI Sidebar (Bottom Sheet) */}
      {isMobile && isAIOpen && (
        <div className="ai-mobile-sheet">
             <AISidebar 
                currentFile={selectedFile ? { name: selectedFile.name, content: editedContent } : null}
                onFileUpdate={(newContent) => {
                    setEditedContent(newContent);
                }}
            />
        </div>
      )}
      
      <style>{`
        .ai-mobile-sheet {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80vh;
            background: var(--bg-panel);
            border-top: 1px solid var(--border-subtle);
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
      `}</style>

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
                    <h3 style={{ margin: 0 }}>设置</h3>
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
