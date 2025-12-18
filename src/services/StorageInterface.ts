import type { OSSFile } from '../types';

export interface StorageService {
    list(prefix?: string): Promise<OSSFile[]>;
    upload(file: File, path: string): Promise<void>;
    delete(path: string): Promise<void>;
    deleteMulti(paths: string[]): Promise<void>;
    getUrl(path: string): Promise<string>;
    getContent(path: string): Promise<string>;
    putContent(path: string, content: string | Blob): Promise<void>;
    copy(source: string, destination: string): Promise<void>;
}
