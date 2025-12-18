import React, { useMemo, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import Papa from 'papaparse';
import _ReactJson from 'react-json-view';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactJson = (_ReactJson as any).default || _ReactJson;
import 'katex/dist/katex.min.css';
// @ts-ignore
import piexif from 'piexifjs';
import { FaSave } from 'react-icons/fa';
import type { OSSFile } from '../types';
import DiffViewer from './DiffViewer';
import ErrorBoundary from './ErrorBoundary';
import { useAI } from '../contexts/AIContext';
import { useTheme } from '../contexts/ThemeContext';

interface FilePreviewProps {
  file: OSSFile | null;
  content: string;
  loading: boolean;
  fontSize?: number;
  viewMode?: 'preview' | 'source';
  onContentChange?: (content: string) => void;
  previewUrl?: string | null;
  showExif?: boolean;
  onSaveExif?: (file: File) => Promise<void>;
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  file, 
  content, 
  loading, 
  fontSize = 14,
  viewMode = 'preview',
  onContentChange,
  previewUrl,
  showExif = false,
  onSaveExif
}) => {
  const { isEditMode, originalEditContent, setOriginalEditContent } = useAI();
  const { currentTheme } = useTheme();
  const [exifData, setExifData] = useState<any>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [exifLoading, setExifLoading] = useState(false);

  const isTextFile = file ? (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.csv')) : false;
  const isMarkdown = file ? file.name.endsWith('.md') : false;
  const isCSV = file ? file.name.endsWith('.csv') : false;
  const isJSON = file ? file.name.endsWith('.json') : false;
  const isImage = file ? (file.name.toLowerCase().endsWith('.jpg') || 
                  file.name.toLowerCase().endsWith('.jpeg') || 
                  file.name.toLowerCase().endsWith('.png') || 
                  file.name.toLowerCase().endsWith('.gif') || 
                  file.name.toLowerCase().endsWith('.webp')) : false;

  useEffect(() => {
      if (showExif && previewUrl && isImage && file) {
          setExifLoading(true);
          fetch(previewUrl)
              .then(res => res.blob())
              .then(blob => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      const result = e.target?.result as string;
                      setImgBase64(result);
                      try {
                          // piexif only supports jpeg
                          if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
                              const exif = piexif.load(result);
                              setExifData(exif);
                          } else {
                              setExifData(null);
                          }
                      } catch (e) {
                          console.error('Failed to load EXIF', e);
                          setExifData(null);
                      }
                      setExifLoading(false);
                  };
                  reader.readAsDataURL(blob);
              })
              .catch(e => {
                  console.error('Failed to fetch image', e);
                  setExifLoading(false);
              });
      } else {
          setExifData(null);
          setImgBase64(null);
      }
  }, [showExif, previewUrl, isImage, file?.name]);

  const handleExifChange = (group: string, tag: string, value: string) => {
      if (!exifData) return;
      
      const newExif = { ...exifData };
      if (!newExif[group]) newExif[group] = {};
      
      // Try to convert value to appropriate type if possible, mostly string for simplicity in this demo
      newExif[group][tag] = value;
      
      setExifData(newExif);
  };

  const saveExif = async () => {
      if (!imgBase64 || !exifData || !onSaveExif || !file) return;
      try {
          const exifBytes = piexif.dump(exifData);
          const newJpeg = piexif.insert(exifBytes, imgBase64);
          
          // Convert base64 to Blob/File
          const arr = newJpeg.split(',');
          // @ts-ignore
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          const newFile = new File([u8arr], file.name, {type: mime});
          await onSaveExif(newFile);
      } catch (e) {
          console.error('Failed to save EXIF', e);
          alert('保存 EXIF 失败: ' + (e as any).message);
      }
  };

  const renderExifEditor = () => {
      if (exifLoading) return <div>加载 EXIF 中...</div>;
      if (!exifData) return <div>无 EXIF 数据或不支持该格式</div>;

      const groups = ['0th', 'Exif', 'GPS', '1st'];
      
      return (
          <div style={{ padding: '16px', overflow: 'auto', height: '100%', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>EXIF 编辑</h3>
                  <button onClick={saveExif} className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FaSave /> 保存
                  </button>
              </div>
              
              {groups.map(group => {
                  if (!exifData[group]) return null;
                  const tags = exifData[group];
                  return (
                      <div key={group} style={{ marginBottom: '16px' }}>
                          <h4 style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>{group}</h4>
                          {Object.keys(tags).map(tagId => {
                              const val = tags[tagId];
                              const isEditable = typeof val === 'string' || typeof val === 'number';
                              
                              let tagName = tagId;
                              try {
                                  // @ts-ignore
                                  if (piexif.TAGS[group] && piexif.TAGS[group][tagId]) {
                                      // @ts-ignore
                                      tagName = piexif.TAGS[group][tagId].name;
                                  }
                              } catch(e) {}

                              return (
                                  <div key={tagId} style={{ marginBottom: '8px' }}>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{tagName} ({tagId})</div>
                                      {isEditable ? (
                                          <input 
                                              type="text" 
                                              value={val} 
                                              onChange={(e) => handleExifChange(group, tagId, e.target.value)}
                                              style={{ 
                                                  width: '100%', 
                                                  background: 'rgba(0,0,0,0.1)', 
                                                  border: '1px solid var(--border-glass)',
                                                  color: 'var(--text-primary)',
                                                  padding: '4px',
                                                  borderRadius: '4px'
                                              }}
                                          />
                                      ) : (
                                          <div style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {JSON.stringify(val)}
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  );
              })}
          </div>
      );
  };

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

  const { jsonData, jsonError } = useMemo(() => {
    if (!isJSON || !content) return { jsonData: null, jsonError: null };
    try {
        return { jsonData: JSON.parse(content), jsonError: null };
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { jsonData: null, jsonError: (e as any).message };
    }
  }, [isJSON, content]);

  const showDiff = isEditMode && originalEditContent !== null && isTextFile;

  if (!file) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)', flexDirection: 'column' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
        <div>请选择文件进行预览</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'transparent' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : showDiff ? (
             <DiffViewer 
                 original={originalEditContent || ''} 
                 modified={content} 
                 onApplyChange={(newContent) => onContentChange && onContentChange(newContent)}
                 onOriginalUpdate={(newContent) => setOriginalEditContent(newContent)}
                 isStreaming={loading}
             />
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
                    <ErrorBoundary>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {content}
                        </ReactMarkdown>
                    </ErrorBoundary>
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
            ) : isJSON ? (
                <div style={{ 
                    padding: '24px', 
                    fontSize: `${fontSize}px`,
                    overflow: 'auto',
                    height: '100%'
                }}>
                    <ErrorBoundary>
                        {jsonError ? (
                            <div style={{ color: 'var(--error, #ff4d4f)', fontFamily: 'monospace' }}>
                                <h3 style={{ marginTop: 0 }}>JSON Parse Error</h3>
                                <div style={{ marginBottom: 16 }}>{jsonError}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    Raw Content:
                                    <pre style={{ 
                                        background: 'rgba(0,0,0,0.1)', 
                                        padding: '16px', 
                                        overflow: 'auto',
                                        marginTop: '8px',
                                        borderRadius: '4px'
                                    }}>{content}</pre>
                                </div>
                            </div>
                        ) : (
                            <ReactJson 
                                src={jsonData || {}} 
                                theme={currentTheme === 'dark' ? 'monokai' : 'rjv-default'}
                                name={false} 
                                displayDataTypes={false}
                                enableClipboard={true}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onEdit={(edit: any) => {
                                    if (onContentChange) {
                                        onContentChange(JSON.stringify(edit.updated_src, null, 2));
                                    }
                                }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onAdd={(add: any) => {
                                    if (onContentChange) {
                                        onContentChange(JSON.stringify(add.updated_src, null, 2));
                                    }
                                }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onDelete={(del: any) => {
                                    if (onContentChange) {
                                        onContentChange(JSON.stringify(del.updated_src, null, 2));
                                    }
                                }}
                                style={{ backgroundColor: 'transparent', fontFamily: 'Consolas, Monaco, monospace' }}
                            />
                        )}
                    </ErrorBoundary>
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
          ) : isImage ? (
              <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      overflow: 'hidden',
                      backgroundColor: 'rgba(0,0,0,0.1)'
                  }}>
                      {previewUrl ? (
                          <img 
                              src={previewUrl} 
                              alt={file.name} 
                              style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '100%', 
                                  objectFit: 'contain',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }} 
                          />
                      ) : (
                          <div>无法加载预览</div>
                      )}
                  </div>
                  {showExif && (
                      <div style={{ 
                          width: '300px', 
                          borderLeft: '1px solid var(--border-glass)',
                          background: 'var(--bg-panel)'
                      }}>
                          {renderExifEditor()}
                      </div>
                  )}
              </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-secondary)' }}>
               <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
               <div>当前仅支持预览文本文件和图片，请下载查看</div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default FilePreview;