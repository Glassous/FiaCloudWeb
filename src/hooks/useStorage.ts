import { useState, useCallback } from 'react';
import type { StorageService } from '../services/StorageInterface';
import { AliyunStorage } from '../services/AliyunStorage';
import { R2Storage } from '../services/R2Storage';
import type { OSSConfigData, R2ConfigData, OSSFile, StorageProvider } from '../types';
import { useUI } from '../contexts/UIContext';

export const useStorage = () => {
  const [service, setService] = useState<StorageService | null>(null);
  const [files, setFiles] = useState<OSSFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const { showToast } = useUI();

  const initClient = useCallback((provider: StorageProvider, config: OSSConfigData | R2ConfigData) => {
    try {
      let newService: StorageService;
      if (provider === 'aliyun') {
          newService = new AliyunStorage(config as OSSConfigData);
      } else {
          newService = new R2Storage(config as R2ConfigData);
      }
      setService(newService);
      return newService;
    } catch (error) {
      console.error('Failed to init storage client:', error);
      showToast('存储服务初始化失败，请检查配置', 'error');
      return null;
    }
  }, [showToast]);

  const PLACEHOLDER_FILENAME = 'new.fiacloud';

  const listFiles = useCallback(async (currentService: StorageService | null = service) => {
    if (!currentService) return;
    setLoading(true);
    try {
      const fileList = await currentService.list();
      setFiles(fileList);
    } catch (error) {
      console.error('List files error:', error);
      showToast('获取文件列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [service, showToast]);

  const uploadFile = useCallback(async (file: File, folderPath?: string) => {
    if (!service) return;
    setLoading(true);
    setUploadingFile(file.name);
    setUploadProgress(0);
    try {
       const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
       await service.upload(file, fullPath, (progress) => {
           setUploadProgress(progress);
       });

       const parts = fullPath.split('/');
       if (parts.length > 1) {
           const currentFolderPath = parts.slice(0, -1).join('/');
           const placeholderPath = `${currentFolderPath}/${PLACEHOLDER_FILENAME}`;
           try {
               await service.delete(placeholderPath);
           } catch (e) {
               // Ignore
           }
       }

       showToast(`${file.name} 上传成功`, 'success');
       await listFiles();
    } catch (error) {
        console.error('Upload error:', error);
        showToast(`${file.name} 上传失败`, 'error');
    } finally {
        setLoading(false);
        setUploadingFile(null);
        setUploadProgress(0);
    }
  }, [service, listFiles, showToast]);

  const getFileUrl = useCallback(async (fileName: string) => {
      if (!service) return '';
      return await service.getUrl(fileName);
  }, [service]);

  const getFileContent = useCallback(async (fileName: string) => {
      if (!service) return '';
      try {
          return await service.getContent(fileName);
      } catch (error) {
          console.error('Get content error:', error);
          showToast('获取文件内容失败', 'error');
          return '';
      }
  }, [service, showToast]);

  const saveFileContent = useCallback(async (fileName: string, content: string) => {
    if (!service) return;
    setLoading(true);
    try {
      await service.putContent(fileName, content);
      showToast('文件保存成功', 'success');
      await listFiles(); 
    } catch (error) {
      console.error('Save file content error:', error);
      showToast('文件保存失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [service, listFiles, showToast]);

  const deleteFile = useCallback(async (fileName: string) => {
    if (!service) return;
    setLoading(true);
    try {
      await service.delete(fileName);
      
      const parts = fileName.split('/');
      if (parts.length > 1) {
          const folderPath = parts.slice(0, -1).join('/');
          // We need to check if folder is empty. 
          // Our service.list(prefix) returns files.
          const files = await service.list(folderPath + '/');
          
          if (files.length === 0) {
              const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
              await service.putContent(placeholderPath, new Blob([''], { type: 'application/octet-stream' }));
          }
      }

      showToast(`${fileName} 删除成功`, 'success');
      await listFiles();
    } catch (error) {
      console.error('Delete error:', error);
      showToast(`${fileName} 删除失败`, 'error');
    } finally {
      setLoading(false);
    }
  }, [service, listFiles, showToast]);

  const deleteFolder = useCallback(async (folderPath: string) => {
    if (!service) return;
    setLoading(true);
    try {
        const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
        
        const files = await service.list(prefix);
        if (files.length > 0) {
            const keys = files.map(f => f.name);
            await service.deleteMulti(keys);
        }

        showToast(`文件夹删除成功`, 'success');
        await listFiles();
    } catch (error) {
        console.error('Delete folder error:', error);
        showToast(`文件夹删除失败`, 'error');
    } finally {
        setLoading(false);
    }
  }, [service, listFiles, showToast]);


  const renameFile = useCallback(async (oldName: string, newName: string) => {
    if (!service) return;
    setLoading(true);
    try {
      await service.copy(oldName, newName);
      await service.delete(oldName);

      // Handle placeholder logic for old folder
      const oldParts = oldName.split('/');
      if (oldParts.length > 1) {
          const folderPath = oldParts.slice(0, -1).join('/');
          const files = await service.list(folderPath + '/');
          if (files.length === 0) {
              const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
              await service.putContent(placeholderPath, new Blob([''], { type: 'application/octet-stream' }));
          }
      }

      // Handle placeholder logic for new folder
      const newParts = newName.split('/');
      if (newParts.length > 1) {
           const folderPath = newParts.slice(0, -1).join('/');
           const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
           try {
               await service.delete(placeholderPath);
           } catch (e) {
               // ignore
           }
      }

      showToast(`重命名成功`, 'success');
      await listFiles();
    } catch (error) {
      console.error('Rename error:', error);
      showToast(`重命名失败`, 'error');
    } finally {
      setLoading(false);
    }
  }, [service, listFiles, showToast]);

  const createFolder = useCallback(async (folderName: string, parentPath?: string) => {
      if (!service) return;
      setLoading(true);
      try {
          const cleanName = folderName.replace(/^\/+|\/+$/g, '');
          const fullPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
          const placeholderPath = `${fullPath}/${PLACEHOLDER_FILENAME}`;
          await service.putContent(placeholderPath, new Blob([''], { type: 'application/octet-stream' }));

          if (parentPath) {
             const parentPlaceholder = `${parentPath}/${PLACEHOLDER_FILENAME}`;
             try {
                 await service.delete(parentPlaceholder);
             } catch (e) {
                 // ignore
             }
          }

          showToast('文件夹创建成功', 'success');
          await listFiles();
      } catch (error) {
          console.error('Create folder error:', error);
          showToast('创建文件夹失败', 'error');
      } finally {
          setLoading(false);
      }
  }, [service, listFiles, showToast]);

  const createTextFile = useCallback(async (fileName: string, parentPath?: string, content: string = '') => {
      if (!service) return;
      setLoading(true);
      try {
          const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;
          await service.putContent(fullPath, content);

            const parts = fullPath.split('/');
            if (parts.length > 1) {
                const folderPath = parts.slice(0, -1).join('/');
                const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
                try {
                    await service.delete(placeholderPath);
                } catch (e) {
                    // Ignore error
                }
            }

          showToast(`${fileName} 创建成功`, 'success');
          await listFiles();
      } catch (error) {
          console.error('Create file error:', error);
          showToast('创建文件失败', 'error');
      } finally {
          setLoading(false);
      }
  }, [service, listFiles, showToast]);

  return {
    service,
    files,
    loading,
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
    createTextFile,
    uploadProgress,
    uploadingFile
  };
};
