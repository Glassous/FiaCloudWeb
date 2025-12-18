import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUI } from '../contexts/UIContext';
import { 
    FaSync, 
    FaCloudUploadAlt, 
    FaTrash, 
    FaEdit, 
    FaFolderPlus, 
    FaFileMedical,
    FaChevronRight,
    FaChevronDown,
    FaFolder,
    FaFolderOpen
} from 'react-icons/fa';
import type { OSSFile } from '../types';
import FileIcon from './FileIcon';

interface DataNode {
    title: string;
    key: string;
    isLeaf: boolean;
    icon?: React.ReactNode;
    children?: DataNode[];
    fileData?: OSSFile;
}

interface FileListProps {
  files: OSSFile[];
  selectedFile: OSSFile | null;
  onSelect: (file: OSSFile | null, folderPath?: string) => void;
  onUpload: (file: File, folderPath?: string) => void;
  onRefresh: () => void;
  onDelete: (fileName: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onCreateFolder: (folderName: string, parentPath?: string) => void;
  onCreateFile: (fileName: string, parentPath?: string) => void;
  loading: boolean;
}

const FileList: React.FC<FileListProps> = ({ 
  files, 
  selectedFile, 
  onSelect, 
  onUpload, 
  onRefresh,
  onDelete,
  onRename,
  onCreateFolder,
  onCreateFile,
  loading 
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isFolderSelected, setIsFolderSelected] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showConfirm } = useUI();
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; nodeKey?: string; nodeTitle?: string } | null>(null);

  useEffect(() => {
      const handleClickOutside = () => setContextMenu(null);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Transform flat file list into tree data
  const treeData = useMemo(() => {
    const root: DataNode[] = [];
    
    files.forEach(file => {
        if (!file.name) return;

        const parts = file.name.split('/');
        let currentLevel = root;
        
        parts.forEach((part, index) => {
            if (!part) return;
            
            const isLast = index === parts.length - 1;
            const isFile = isLast && !file.name.endsWith('/');
            const key = parts.slice(0, index + 1).join('/');

            if (part === 'new.fiacloud') return;
            
            let node = currentLevel.find(n => n.key === key);
            
            if (!node) {
                node = {
                    title: part,
                    key: key,
                    isLeaf: isFile,
                    icon: isFile ? <FileIcon fileName={part} /> : undefined,
                    children: isFile ? undefined : [],
                };
                if (isFile) {
                    (node as any).fileData = file;
                }
                currentLevel.push(node);
            }
            
            if (!isFile) {
                if (!node.children) node.children = [];
                currentLevel = node.children;
            }
        });
    });

    const sortNodes = (nodes: DataNode[]) => {
        nodes.sort((a, b) => {
            if (a.isLeaf === b.isLeaf) {
                return (a.title as string).localeCompare(b.title as string);
            }
            return a.isLeaf ? 1 : -1; 
        });
        nodes.forEach(node => {
            if (node.children) {
                sortNodes(node.children);
            }
        });
    };
    
    sortNodes(root);
    return root;
  }, [files]);

  const toggleExpand = (key: string) => {
      setExpandedKeys(prev => {
          const next = new Set(prev);
          if (next.has(key)) {
              next.delete(key);
          } else {
              next.add(key);
          }
          return next;
      });
  };

  const handleNodeClick = (node: DataNode, e: React.MouseEvent) => {
      // e.stopPropagation(); // Removed to allow document click listener to close context menu
      setSelectedKey(node.key);
      
      if (node.isLeaf) {
          const fileData = (node as any).fileData as OSSFile;
          setIsFolderSelected(false);
          if (fileData) {
              onSelect(fileData, undefined);
          }
      } else {
          setIsFolderSelected(true);
          toggleExpand(node.key);
      }
  };

  const handleNodeContextMenu = (node: DataNode, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedKey(node.key);
      if (node.isLeaf) {
           setIsFolderSelected(false);
      } else {
          setIsFolderSelected(true);
      }
      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          nodeKey: node.key,
          nodeTitle: node.title
      });
  };

  const handleContainerContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY
      });
  };

  const getCurrentPath = () => {
      if (isFolderSelected && selectedKey) {
          return selectedKey;
      }
      if (!isFolderSelected && selectedKey) {
          const parts = selectedKey.split('/');
          parts.pop();
          return parts.join('/');
      }
      return '';
  };

  const handleRenameConfirm = (key: string) => {
      if (editValue && editValue.trim() !== '') {
          const pathParts = key.split('/');
          const oldFileName = pathParts.pop();
          if (oldFileName !== editValue) {
             pathParts.push(editValue);
             const newKey = pathParts.join('/');
             onRename(key, newKey);
          }
      }
      setEditingKey(null);
  };

  const handleDeleteConfirm = (key: string, title: string) => {
      showConfirm({
          title: '删除确认',
          message: `确定要删除 "${title}" 吗？此操作无法撤销。`,
          type: 'danger',
          onConfirm: () => onDelete(key)
      });
  };

  const handleCreateFolderClick = () => {
      const currentPath = getCurrentPath();
      const name = prompt(currentPath ? `在 "${currentPath}" 中新建文件夹` : '新建文件夹');
      if (name) onCreateFolder(name, currentPath);
  };

  const handleCreateFileClick = () => {
      const currentPath = getCurrentPath();
      const name = prompt(currentPath ? `在 "${currentPath}" 中新建文件 (例如 test.txt)` : '新建文件');
      if (name) onCreateFile(name, currentPath);
  };

  const handleUploadClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const currentPath = getCurrentPath();
          onUpload(file, currentPath);
          e.target.value = '';
      }
  };

  const startRename = (key: string, title: string) => {
      setEditingKey(key);
      setEditValue(title);
  };

  // Recursive Tree Node Renderer
  const renderTree = (nodes: DataNode[], level: number = 0) => {
      return nodes.map(node => {
          const isExpanded = expandedKeys.has(node.key);
          const isSelected = selectedKey === node.key;
          const isEditing = editingKey === node.key;

          return (
              <div key={node.key}>
                  <div 
                      onClick={(e) => handleNodeClick(node, e)}
                      onContextMenu={(e) => handleNodeContextMenu(node, e)}
                      style={{
                          paddingLeft: `${level * 20 + 4}px`,
                          paddingRight: '8px',
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--bg-glass-active)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      }}
                      className="tree-node"
                  >
                      <span 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!node.isLeaf) {
                                toggleExpand(node.key);
                                setContextMenu(null);
                            }
                        }}
                        style={{ 
                            width: 20, 
                            display: 'flex', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            marginRight: 4,
                            opacity: node.isLeaf ? 0 : 0.6,
                            color: 'var(--text-secondary)'
                        }}
                      >
                          {!node.isLeaf && (isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />)}
                      </span>
                      
                      <span style={{ marginRight: 6, display: 'flex', alignItems: 'center' }}>
                          {node.icon || (isExpanded ? <FaFolderOpen color="#dcb67a" /> : <FaFolder color="#dcb67a" />)} 
                      </span>

                      {isEditing ? (
                          <input 
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={() => handleRenameConfirm(node.key)}
                              onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameConfirm(node.key);
                                  if (e.key === 'Escape') setEditingKey(null);
                              }}
                              autoFocus
                              onClick={e => e.stopPropagation()}
                              style={{ 
                                  height: 20, 
                                  fontSize: 14, 
                                  background: 'var(--bg-glass)', 
                                  color: 'var(--text-primary)', 
                                  border: '1px solid var(--accent-primary)',
                                  borderRadius: 2,
                                  outline: 'none'
                              }}
                          />
                      ) : (
                          <span style={{ userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</span>
                      )}
                  </div>
                  {isExpanded && node.children && (
                      <div>{renderTree(node.children, level + 1)}</div>
                  )}
              </div>
          );
      });
  };

  return (
    <div 
        style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)' }}
        tabIndex={0}
        onKeyDown={(e) => {
            if (selectedKey && !editingKey) {
                if (e.key === 'Delete') {
                    e.preventDefault();
                    const parts = selectedKey.split('/');
                    handleDeleteConfirm(selectedKey, parts[parts.length - 1]);
                }
            }
        }}
    >
      <div style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid var(--border-glass)', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          background: 'transparent' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>文件列表 ({files.filter(f => !f.name.endsWith('new.fiacloud')).length})</span>
            <button 
                onClick={onRefresh} 
                title="刷新列表" 
                className="glass-button"
                style={{ padding: '4px 8px' }}
            >
                <FaSync className={loading ? 'spin' : ''} />
            </button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handleCreateFolderClick} title="新建文件夹" className="glass-button" style={{ padding: 6 }}>
                <FaFolderPlus />
            </button>
            <button onClick={handleCreateFileClick} title="新建文件" className="glass-button" style={{ padding: 6 }}>
                <FaFileMedical />
            </button>
            <button onClick={handleUploadClick} title="上传文件" className="glass-button" style={{ padding: 6 }}>
                <FaCloudUploadAlt />
            </button>
            <button 
                onClick={() => selectedKey && startRename(selectedKey, selectedKey.split('/').pop() || '')} 
                disabled={!selectedKey}
                title="重命名" 
                className="glass-button"
                style={{ padding: 6, opacity: selectedKey ? 1 : 0.5, cursor: selectedKey ? 'pointer' : 'not-allowed' }}
            >
                <FaEdit />
            </button>
            <button 
                onClick={() => selectedKey && handleDeleteConfirm(selectedKey, selectedKey.split('/').pop() || '')} 
                disabled={!selectedKey}
                title="删除" 
                className="glass-button danger"
                style={{ padding: 6, opacity: selectedKey ? 1 : 0.5, cursor: selectedKey ? 'pointer' : 'not-allowed' }}
            >
                <FaTrash />
            </button>
        </div>
      </div>

      <div 
        style={{ flex: 1, overflow: 'auto', position: 'relative' }} 
        onContextMenu={handleContainerContextMenu}
      >
          {files.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {loading ? '加载中...' : '暂无文件'}
              </div>
          ) : (
              renderTree(treeData)
          )}
      </div>

      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
      />

      {/* Custom Context Menu */}
      {contextMenu && contextMenu.visible && createPortal(
          <div className="glass-panel" style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              borderRadius: 4,
              padding: '4px 0',
              zIndex: 9999,
              minWidth: 120,
              boxShadow: 'var(--shadow-md)'
          }}>
              {contextMenu.nodeKey ? (
                  <>
                      <div 
                        className="menu-item"
                        onClick={() => startRename(contextMenu.nodeKey!, contextMenu.nodeTitle!)}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                          <FaEdit /> 重命名
                      </div>
                      <div 
                        className="menu-item"
                        onClick={() => handleDeleteConfirm(contextMenu.nodeKey!, contextMenu.nodeTitle!)}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)' }}
                      >
                          <FaTrash /> 删除
                      </div>
                  </>
              ) : (
                  <>
                    <div 
                        className="menu-item"
                        onClick={handleCreateFolderClick}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                          <FaFolderPlus /> 新建文件夹
                      </div>
                      <div 
                        className="menu-item"
                        onClick={handleCreateFileClick}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                          <FaFileMedical /> 新建文件
                      </div>
                      <div 
                        className="menu-item"
                        onClick={handleUploadClick}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                          <FaCloudUploadAlt /> 上传文件
                      </div>
                      <div 
                        className="menu-item"
                        onClick={onRefresh}
                        style={{ padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                          <FaSync /> 刷新
                      </div>
                  </>
              )}
          </div>,
          document.body
      )}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .menu-item:hover { background-color: var(--bg-hover); }
        .tree-node:hover { background-color: var(--bg-hover) !important; }
      `}</style>
    </div>
  );
};

export default FileList;
