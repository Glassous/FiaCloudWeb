export interface OSSConfigData {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  endpoint: string;
}

export interface R2ConfigData {
  accountId: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  customDomain?: string;
}

export type StorageProvider = 'aliyun' | 'r2';

export interface AIConfigData {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface OSSFile {
  name: string;
  url: string;
  lastModified: string;
  size: number;
  type?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'edit-card'; // Add message type
}
