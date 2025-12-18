import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Papa from 'papaparse';
import 'katex/dist/katex.min.css';
import type { OSSFile } from '../types';

interface FilePreviewProps {
  file: OSSFile | null;
  content: string;
  loading: boolean;
  fontSize?: number;
  viewMode?: 'preview' | 'source';
  onContentChange?: (content: string) => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  content, 
  loading, 
  fontSize = 14,
  viewMode = 'preview',
  onContentChange
}) => {
  if (!file) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <div>请选择文件进行预览</div>
      </div>
    );
  }

  const isTextFile = file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.csv');
  const isMarkdown = file.name.endsWith('.md');
  const isCSV = file.name.endsWith('.csv');

  const csvData = useMemo(() => {
    if (!isCSV || !content) return [];
    try {
        const result = Papa.parse(content, { header: false });
        return result.data as string[][];
    } catch (e) {
        console.error('CSV parse error:', e);
        return [];
    }
  }, [isCSV, content]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'transparent' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : (
          isTextFile ? (
            viewMode === 'source' ? (
                <textarea 
                    value={content}
                    onChange={(e) => onContentChange && onContentChange(e.target.value)}
                    spellCheck={false}
                    style={{
                        width: '100%',
                        height: '100%',
                        padding: '24px',
                        fontSize: `${fontSize}px`,
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        border: 'none',
                        resize: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        lineHeight: 1.6,
                        boxSizing: 'border-box'
                    }}
                 />
            ) : isMarkdown ? (
                <div className="markdown-preview" style={{ 
                    padding: '24px', 
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-primary)',
                    lineHeight: 1.6
                }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {content}
                    </ReactMarkdown>
                </div>
            ) : isCSV ? (
                <div style={{ 
                    padding: '24px', 
                    fontSize: `${fontSize}px`,
                    color: 'var(--text-primary)',
                    overflow: 'auto'
                }}>
                    <table className="csv-table">
                        <tbody>
                            {csvData.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
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
            )
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
