import { useState, useCallback } from 'react';
import OSS from 'ali-oss';
import type { OSSConfigData, OSSFile } from '../types';

export const useOSS = () => {
  const [client, setClient] = useState<OSS | null>(null);
  const [files, setFiles] = useState<OSSFile[]>([]);
  const [loading, setLoading] = useState(false);

  const initClient = useCallback((config: OSSConfigData) => {
    try {
      const newClient = new OSS({
        region: config.region,
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        bucket: config.bucket,
        secure: true, // Use HTTPS
      });
      setClient(newClient);
      return newClient;
    } catch (error) {
      console.error('Failed to init OSS client:', error);
      alert('OSS初始化失败，请检查配置');
      return null;
    }
  }, []);

  const PLACEHOLDER_FILENAME = 'new.fiacloud';

  const listFiles = useCallback(async (currentClient: OSS | null = client) => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const result = await currentClient.list({
        'max-keys': 1000,
      }, {});
      
      const fileList: OSSFile[] = (result.objects || []).map((obj: any) => ({
        name: obj.name,
        url: obj.url,
        lastModified: obj.lastModified,
        size: obj.size,
        type: obj.name.split('.').pop()?.toLowerCase(),
      }));
      
      // Sort by last modified desc
      fileList.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      
      setFiles(fileList);
    } catch (error) {
      console.error('List files error:', error);
      alert('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [client]);

  const uploadFile = useCallback(async (file: File, folderPath?: string) => {
    if (!client) return;
    setLoading(true);
    try {
       // multipart upload for larger files, but simple put is fine for basic
       const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
       await client.put(fullPath, file);

       // Check if there's a placeholder in the same folder, and delete it if exists
       const parts = fullPath.split('/');
       if (parts.length > 1) {
           const currentFolderPath = parts.slice(0, -1).join('/');
           const placeholderPath = `${currentFolderPath}/${PLACEHOLDER_FILENAME}`;
           try {
               // We don't check if it exists to save a call, just try delete. 
               // Or better, check the current 'files' state if we have it?
               // But 'files' might be stale.
               // Let's just try to delete it silently.
               await client.delete(placeholderPath);
           } catch (e) {
               // Ignore error if placeholder doesn't exist
           }
       }

       alert(`${file.name} 上传成功`);
       await listFiles();
    } catch (error) {
        console.error('Upload error:', error);
        alert(`${file.name} 上传失败`);
    } finally {
        setLoading(false);
    }
  }, [client, listFiles]);

  const getFileUrl = useCallback((fileName: string) => {
      if (!client) return '';
      return client.signatureUrl(fileName, { expires: 3600 }); // 1 hour expiration
  }, [client]);

  const getFileContent = useCallback(async (fileName: string) => {
      if (!client) return '';
      try {
          const result = await client.get(fileName);
          if (result.content) {
              return result.content.toString();
          }
          return '';
      } catch (error) {
          console.error('Get content error:', error);
          alert('获取文件内容失败');
          return '';
      }
  }, [client]);

  const deleteFile = useCallback(async (fileName: string) => {
    if (!client) return;
    setLoading(true);
    try {
      await client.delete(fileName);
      
      // Check if folder needs a placeholder
      const parts = fileName.split('/');
      if (parts.length > 1) {
          const folderPath = parts.slice(0, -1).join('/');
          // List files in this folder to see if it's empty
          const result = await client.list({
              prefix: folderPath + '/',
              'max-keys': 2 // We only need to know if there is at least 1 file
          }, {});

          if (!result.objects || result.objects.length === 0) {
              // Folder is empty, create placeholder
              const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
              const blob = new Blob([''], { type: 'application/octet-stream' });
              await client.put(placeholderPath, blob);
          }
      }

      alert(`${fileName} 删除成功`);
      await listFiles();
    } catch (error) {
      console.error('Delete error:', error);
      alert(`${fileName} 删除失败`);
    } finally {
      setLoading(false);
    }
  }, [client, listFiles]);

  const renameFile = useCallback(async (oldName: string, newName: string) => {
    if (!client) return;
    setLoading(true);
    try {
      await client.copy(newName, oldName);
      await client.delete(oldName);

      // Handle placeholder logic for old folder
      const oldParts = oldName.split('/');
      if (oldParts.length > 1) {
          const folderPath = oldParts.slice(0, -1).join('/');
          const result = await client.list({
              prefix: folderPath + '/',
              'max-keys': 2
          }, {});
          if (!result.objects || result.objects.length === 0) {
              const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
              const blob = new Blob([''], { type: 'application/octet-stream' });
              await client.put(placeholderPath, blob);
          }
      }

      // Handle placeholder logic for new folder (remove placeholder if exists)
      const newParts = newName.split('/');
      if (newParts.length > 1) {
           const folderPath = newParts.slice(0, -1).join('/');
           const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
           try {
               await client.delete(placeholderPath);
           } catch (e) {
               // ignore
           }
      }

      alert(`重命名成功`);
      await listFiles();
    } catch (error) {
      console.error('Rename error:', error);
      alert(`重命名失败`);
    } finally {
      setLoading(false);
    }
  }, [client, listFiles]);

  const createFolder = useCallback(async (folderName: string, parentPath?: string) => {
      if (!client) return;
      setLoading(true);
      try {
          // Normalize folder name (remove leading/trailing slashes)
          const cleanName = folderName.replace(/^\/+|\/+$/g, '');
          const fullPath = parentPath ? `${parentPath}/${cleanName}` : cleanName;
          const placeholderPath = `${fullPath}/${PLACEHOLDER_FILENAME}`;
          const blob = new Blob([''], { type: 'application/octet-stream' });
          await client.put(placeholderPath, blob);

          // If created in a parent folder, remove parent's placeholder if it was empty
          if (parentPath) {
             const parentPlaceholder = `${parentPath}/${PLACEHOLDER_FILENAME}`;
             try {
                 await client.delete(parentPlaceholder);
             } catch (e) {
                 // ignore
             }
          }

          alert('文件夹创建成功');
          await listFiles();
      } catch (error) {
          console.error('Create folder error:', error);
          alert('创建文件夹失败');
      } finally {
          setLoading(false);
      }
  }, [client, listFiles]);

  const createTextFile = useCallback(async (fileName: string, parentPath?: string, content: string = '') => {
      if (!client) return;
      setLoading(true);
      try {
          const blob = new Blob([content], { type: 'text/plain' });
          const fullPath = parentPath ? `${parentPath}/${fileName}` : fileName;
          
          await client.put(fullPath, blob);

           // Check if there's a placeholder in the same folder, and delete it if exists
            const parts = fullPath.split('/');
            if (parts.length > 1) {
                const folderPath = parts.slice(0, -1).join('/');
                const placeholderPath = `${folderPath}/${PLACEHOLDER_FILENAME}`;
                try {
                    await client.delete(placeholderPath);
                } catch (e) {
                    // Ignore error
                }
            }

          alert(`${fileName} 创建成功`);
          await listFiles();
      } catch (error) {
          console.error('Create file error:', error);
          alert('创建文件失败');
      } finally {
          setLoading(false);
      }
  }, [client, listFiles]);

  return {
    client,
    files,
    loading,
    initClient,
    listFiles,
    uploadFile,
    getFileUrl,
    getFileContent,
    deleteFile,
    renameFile,
    createFolder,
    createTextFile
  };
};
