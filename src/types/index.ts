export interface OSSConfigData {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  endpoint: string;
}

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
