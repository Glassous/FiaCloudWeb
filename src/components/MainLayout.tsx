import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaSignOutAlt, FaCog, FaTimes, FaSun, FaMoon, FaAdjust, FaBars, FaDownload, FaSearchPlus, FaSearchMinus, FaEllipsisV, FaCode, FaEye, FaSave, FaMagic, FaCamera } from 'react-icons/fa';
import OSSConfig from './OSSConfig';
import FileList from './FileList';
import FilePreview from './FilePreview';
import AISidebar from './AISidebar';
import { useStorage } from '../hooks/useStorage';
import { decrypt } from '../utils/crypto';
import { useTheme } from '../contexts/ThemeContext';
import { useUI } from '../contexts/UIContext';
import { useAI } from '../contexts/AIContext';
import type { OSSFile, OSSConfigData, R2ConfigData, StorageProvider } from '../types';

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
  const [showExif, setShowExif] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { theme, cycleTheme } = useTheme();
  const { showToast } = useUI();
  const { toggleSidebar: toggleAISidebar, isOpen: isAIOpen, isEditMode } = useAI();

  // Resizing Logic
  const [sidebarWidth, setSidebarWidth] = useState(() => parseInt(localStorage.getItem('sidebarWidth') || '250'));
  const [aiSidebarWidth, setAiSidebarWidth] = useState(() => parseInt(localStorage.getItem('aiSidebarWidth') || '350'));
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const isResizingLeftRef = useRef(false);
  const isResizingRightRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem('aiSidebarWidth', aiSidebarWidth.toString());
  }, [aiSidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeftRef.current) {
        const newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 600) {
          setSidebarWidth(newWidth);
        }
      } else if (isResizingRightRef.current) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < 800) {
            setAiSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeftRef.current || isResizingRightRef.current) {
        isResizingLeftRef.current = false;
        isResizingRightRef.current = false;
        setIsResizingLeft(false);
        setIsResizingRight(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizingLeft = useCallback(() => {
      setIsResizingLeft(true);
      isResizingLeftRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  }, []);

  const startResizingRight = useCallback(() => {
      setIsResizingRight(true);
      isResizingRightRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
  }, []);

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
  } = useStorage();

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = () => {
    const activeProvider = (localStorage.getItem('fiacloud_active_provider') as StorageProvider) || 'aliyun';
    
    if (activeProvider === 'aliyun') {
      const savedConfig = localStorage.getItem('fiacloud_oss_config');
      if (savedConfig) {
        try {
          const decrypted = decrypt(savedConfig);
          const config: OSSConfigData = JSON.parse(decrypted);
          const service = initClient('aliyun', config);
          if (service) {
            setIsConfigured(true);
            setTimeout(() => listFiles(service), 100); 
          }
        } catch (error) {
          console.error('Aliyun Config load failed', error);
          setIsConfigured(false);
        }
      } else {
        setIsConfigured(false);
      }
    } else if (activeProvider === 'r2') {
      const savedConfig = localStorage.getItem('fiacloud_r2_config');
      if (savedConfig) {
        try {
          const decrypted = decrypt(savedConfig);
          const config: R2ConfigData = JSON.parse(decrypted);
          const service = initClient('r2', config);
          if (service) {
            setIsConfigured(true);
            setTimeout(() => listFiles(service), 100); 
          }
        } catch (error) {
          console.error('R2 Config load failed', error);
          setIsConfigured(false);
        }
      } else {
        setIsConfigured(false);
      }
    }
  };

  const handleConfigSaved = (provider: StorageProvider, config: OSSConfigData | R2ConfigData) => {
    const service = initClient(provider, config);
    if (service) {
      setIsConfigured(true);
      setShowConfigModal(false);
      listFiles(service);
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
      setShowExif(false);
      setPreviewUrl(null);
      
      const isImg = file.name.toLowerCase().endsWith('.jpg') || 
                   file.name.toLowerCase().endsWith('.jpeg') || 
                   file.name.toLowerCase().endsWith('.png') || 
                   file.name.toLowerCase().endsWith('.gif') || 
                   file.name.toLowerCase().endsWith('.webp');

      if (isImg) {
          const url = await getFileUrl(file.name);
          setPreviewUrl(url);
      }
      
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.csv')) {
        setContentLoading(true);
        const content = await getFileContent(file.name);
        setFileContent(content);
        setEditedContent(content);
        if ((file.name.endsWith('.md') || file.name.endsWith('.csv')) && !isEditMode) {
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

  const handleSaveExif = async (file: File) => {
    await uploadFile(file);
    // Refresh the preview URL to ensure the latest image is shown
    // Note: Browser caching might still show old image, adding timestamp might help but signatureUrl usually changes
    if (selectedFile) {
      const url = await getFileUrl(selectedFile.name);
      setPreviewUrl(url);
    }
  };

  useEffect(() => {
    if (isEditMode) {
        setViewMode('source');
    }
  }, [isEditMode]);

  const handleSave = async () => {
    if (!selectedFile) return;
    await saveFileContent(selectedFile.name, editedContent);
    setFileContent(editedContent);
  };

  const handleDownload = async () => {
    if (!selectedFile) return;
    const url = await getFileUrl(selectedFile.name);
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

  const isImageFile = selectedFile && (
      selectedFile.name.toLowerCase().endsWith('.jpg') || 
      selectedFile.name.toLowerCase().endsWith('.jpeg') || 
      selectedFile.name.toLowerCase().endsWith('.png') || 
      selectedFile.name.toLowerCase().endsWith('.gif') || 
      selectedFile.name.toLowerCase().endsWith('.webp')
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
              <h3 style={{ margin: '0 0 24px 0', textAlign: 'center' }}>存储配置</h3>
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
                                {(selectedFile.name.endsWith('.md') || selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.json')) && (
                                    <div style={{ display: 'flex', backgroundColor: 'rgba(128,128,128,0.1)', borderRadius: '6px', padding: '2px', marginRight: '8px' }}>
                                        <button
                                            onClick={() => setViewMode('preview')}
                                            disabled={isEditMode}
                                            className="glass-button"
                                            style={{ 
                                                padding: '6px 10px', 
                                                borderRadius: '4px',
                                                backgroundColor: viewMode === 'preview' ? 'var(--bg-primary)' : 'transparent',
                                                boxShadow: viewMode === 'preview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                border: 'none',
                                                color: viewMode === 'preview' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                opacity: isEditMode ? 0.5 : 1,
                                                cursor: isEditMode ? 'not-allowed' : 'pointer'
                                            }}
                                            title={isEditMode ? "AI编辑模式下禁用预览" : "预览"}
                                        >
                                            <FaEye />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('source')}
                                            disabled={isEditMode}
                                            className="glass-button"
                                            style={{ 
                                                padding: '6px 10px', 
                                                borderRadius: '4px',
                                                backgroundColor: viewMode === 'source' ? 'var(--bg-primary)' : 'transparent',
                                                boxShadow: viewMode === 'source' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                border: 'none',
                                                color: viewMode === 'source' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                opacity: isEditMode ? 0.5 : 1,
                                                cursor: isEditMode ? 'not-allowed' : 'pointer'
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

                        {isImageFile && (
                            <button
                                onClick={() => setShowExif(!showExif)}
                                className="glass-button"
                                style={{
                                    padding: '6px 10px',
                                    backgroundColor: showExif ? 'var(--bg-primary)' : 'transparent',
                                    color: showExif ? 'var(--text-primary)' : 'var(--text-secondary)'
                                }}
                                title={showExif ? "隐藏 EXIF" : "显示 EXIF"}
                            >
                                <FaCamera />
                            </button>
                        )}

                        <button 
                            onClick={handleDownload} 
                            className="glass-button"
                            style={{ 
                                padding: '8px', 
                            }}
                            title="下载"
                        >
                            <FaDownload />
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
            </div>
            
            <button 
                onClick={toggleAISidebar}
                className="glass-button"
                title="Copilot"
                style={{ marginLeft: '8px' }}
            >
                <FaMagic />
            </button>
            
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
        <div 
            className={`glass-panel app-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}
            style={{ 
                width: !isMobile && isSidebarOpen ? `${sidebarWidth}px` : undefined,
                transition: isResizingLeft ? 'none' : undefined,
                position: isMobile ? undefined : 'relative'
            }}
        >
            {!isMobile && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '5px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        background: 'transparent'
                    }}
                    onMouseDown={startResizingLeft}
                />
            )}
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
            previewUrl={previewUrl}
            showExif={showExif}
            onSaveExif={handleSaveExif}
          />
        </div>

        {/* Desktop AI Sidebar */}
        {!isMobile && (
            <div style={{
                width: isAIOpen ? `${aiSidebarWidth}px` : '0',
                marginLeft: isAIOpen ? '16px' : '0',
                opacity: isAIOpen ? 1 : 0,
                transition: isResizingRight ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                position: 'relative'
            }}>
                 {isAIOpen && (
                    <div 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            width: '5px',
                            cursor: 'col-resize',
                            zIndex: 10,
                            background: 'transparent'
                        }}
                        onMouseDown={startResizingRight}
                    />
                 )}
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
            </div>
        </div>
      )}

    </div>
  );
};

export default MainLayout;
