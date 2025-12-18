import React, { useState, useEffect } from 'react';
import { FaDownload, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';
import type { OSSFile } from '../types';

interface FilePreviewProps {
  file: OSSFile | null;
  content: string;
  loading: boolean;
  onDownload: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, content, loading, onDownload }) => {
  const [fontSize, setFontSize] = useState(14);

  // Reset font size when file changes
  useEffect(() => {
    setFontSize(14);
  }, [file]);

  if (!file) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <div>请选择文件进行预览</div>
      </div>
    );
  }

  const isTextFile = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid var(--border-glass)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'transparent'
      }}>
        <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginRight: '16px', flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{file.name}</h3>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
            {isTextFile && (
                <>
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
                onClick={onDownload} 
                className="glass-button primary"
                style={{ 
                    padding: '6px 15px', 
                    gap: 6
                }}
            >
                <FaDownload /> 下载
            </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'transparent' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : (
          isTextFile ? (
            <div style={{ 
                padding: '24px', 
                minHeight: '100%', 
                fontSize: `${fontSize}px`,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineHeight: 1.6,
                color: 'var(--text-primary)'
            }}>
              {content || <span style={{ color: 'var(--text-placeholder)' }}>文件内容为空</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-secondary)' }}>
               <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
               <div>当前仅支持预览文本文件，请下载查看</div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default FilePreview;
