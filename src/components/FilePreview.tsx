import React, { useMemo, useEffect, useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
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
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
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
  const [excelData, setExcelData] = useState<any[][]>([]);
  const docxContainerRef = React.useRef<HTMLDivElement>(null);

  const isTextFile = file ? (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.csv')) : false;
  const isMarkdown = file ? file.name.endsWith('.md') : false;
  const isCSV = file ? file.name.endsWith('.csv') : false;
  const isJSON = file ? file.name.endsWith('.json') : false;
  const isImage = file ? (file.name.toLowerCase().endsWith('.jpg') || 
                  file.name.toLowerCase().endsWith('.jpeg') || 
                  file.name.toLowerCase().endsWith('.png') || 
                  file.name.toLowerCase().endsWith('.gif') || 
                  file.name.toLowerCase().endsWith('.webp')) : false;
  
  const isVideo = file ? (file.name.toLowerCase().endsWith('.mp4') || 
                   file.name.toLowerCase().endsWith('.webm') || 
                   file.name.toLowerCase().endsWith('.ogg')) : false;

   const isAudio = file ? (file.name.toLowerCase().endsWith('.mp3') || 
                   file.name.toLowerCase().endsWith('.wav') || 
                   file.name.toLowerCase().endsWith('.flac') || 
                   file.name.toLowerCase().endsWith('.aac') || 
                   file.name.toLowerCase().endsWith('.m4a')) : false;

  const isPDF = file ? file.name.toLowerCase().endsWith('.pdf') : false;
  const isDocx = file ? file.name.toLowerCase().endsWith('.docx') : false;
  const isExcel = file ? (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) : false;
  const isPPT = file ? (file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.ppt')) : false;
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

   useEffect(() => {
      if (isDocx && previewUrl && docxContainerRef.current) {
          fetch(previewUrl)
              .then(res => res.blob())
              .then(blob => {
                  if (docxContainerRef.current) {
                      // Clear previous content
                      docxContainerRef.current.innerHTML = '';
                      renderAsync(blob, docxContainerRef.current, docxContainerRef.current, {
                          className: 'docx-preview',
                          inWrapper: true,
                          ignoreWidth: false,
                          ignoreHeight: false,
                      });
                  }
              })
              .catch(err => console.error('Error loading docx:', err));
      }
   }, [isDocx, previewUrl]);

   useEffect(() => {
    if (isExcel && previewUrl) {
        fetch(previewUrl)
            .then(res => res.arrayBuffer())
            .then(ab => {
                const wb = XLSX.read(ab, { type: 'array' });
                const sheetName = wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                setExcelData(data as any[][]);
            })
            .catch(err => console.error('Error loading excel:', err));
    } else {
        setExcelData([]);
    }
   }, [isExcel, previewUrl]);

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
          ) : isPDF ? (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                  {previewUrl ? (
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                        <Viewer
                            fileUrl={previewUrl}
                            plugins={[defaultLayoutPluginInstance]}
                            theme={currentTheme === 'dark' ? 'dark' : 'light'}
                        />
                    </Worker>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        加载 PDF 中...
                    </div>
                  )}
              </div>
          ) : isDocx ? (
              <div 
                  ref={docxContainerRef}
                  style={{ 
                      height: '100%', 
                      overflow: 'auto', 
                      backgroundColor: '#fff', 
                      padding: '24px',
                      color: '#000' 
                  }}
              >
                  {!previewUrl && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                          加载文档中...
                      </div>
                  )}
              </div>
          ) : isExcel ? (
              <div style={{ padding: '24px', overflow: 'auto', height: '100%', backgroundColor: '#fff', color: '#000' }}>
                  {excelData.length > 0 ? (
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '14px' }}>
                          <tbody>
                              {excelData.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                      {row.map((cell, cellIndex) => (
                                          <td key={cellIndex} style={{ border: '1px solid #ddd', padding: '8px', minWidth: '50px' }}>
                                              {cell !== null && cell !== undefined ? String(cell) : ''}
                                          </td>
                                      ))}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : (
                       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                           {previewUrl ? '加载 Excel 中...' : '等待加载...'}
                       </div>
                  )}
              </div>
          ) : isPPT ? (
               <div style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}>
                   {previewUrl ? (
                       <iframe 
                           src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`}
                           width="100%"
                           height="100%"
                           frameBorder="0"
                           title="PPT Preview"
                       >
                           This is an embedded <a target="_blank" href="http://office.com" rel="noreferrer">Microsoft Office</a> document, powered by <a target="_blank" href="http://office.com/webapps" rel="noreferrer">Office Online</a>.
                       </iframe>
                   ) : (
                       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                           加载 PPT 中...
                       </div>
                   )}
               </div>
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
          ) : isVideo ? (
               <div style={{ 
                   display: 'flex', 
                   justifyContent: 'center', 
                   alignItems: 'center', 
                   height: '100%', 
                   backgroundColor: 'rgba(0,0,0,0.1)',
                   padding: '20px'
               }}>
                   {previewUrl ? (
                       <video 
                           controls
                           src={previewUrl} 
                           style={{ 
                               maxWidth: '100%', 
                               maxHeight: '100%', 
                               boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                               borderRadius: '8px'
                           }} 
                       >
                           您的浏览器不支持视频播放。
                       </video>
                   ) : (
                       <div>无法加载视频预览</div>
                   )}
               </div>
           ) : isAudio ? (
               <div style={{ 
                   display: 'flex', 
                   justifyContent: 'center', 
                   alignItems: 'center', 
                   height: '100%', 
                   backgroundColor: 'rgba(0,0,0,0.1)',
                   padding: '20px',
                   flexDirection: 'column'
               }}>
                   <div style={{ fontSize: 64, marginBottom: 24 }}>🎵</div>
                   {previewUrl ? (
                       <audio 
                           controls
                           src={previewUrl} 
                           style={{ 
                               width: '100%',
                               maxWidth: '500px',
                               boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                               borderRadius: '30px'
                           }} 
                       >
                           您的浏览器不支持音频播放。
                       </audio>
                   ) : (
                       <div>无法加载音频预览</div>
                   )}
                   <div style={{ marginTop: 20, fontSize: 16, fontWeight: 'bold' }}>{file.name}</div>
               </div>
           ) : (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📦</div>
                <div>当前仅支持预览文本文件、图片、视频和音频，请下载查看</div>
             </div>
           )
        )}
      </div>
    </div>
  );
};

export default FilePreview;