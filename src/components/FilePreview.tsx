import React from 'react';
import type { OSSFile } from '../types';

interface FilePreviewProps {
  file: OSSFile | null;
  content: string;
  loading: boolean;
  fontSize?: number;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, content, loading, fontSize = 14 }) => {
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
