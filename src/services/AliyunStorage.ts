import OSS from 'ali-oss';
import type { StorageService } from './StorageInterface';
import type { OSSConfigData, OSSFile } from '../types';

export class AliyunStorage implements StorageService {
    private client: OSS;

    constructor(config: OSSConfigData) {
        this.client = new OSS({
            region: config.region,
            accessKeyId: config.accessKeyId,
            accessKeySecret: config.accessKeySecret,
            bucket: config.bucket,
            secure: true,
        });
    }

    async list(prefix?: string): Promise<OSSFile[]> {
        const result = await this.client.list({
            'max-keys': 1000,
            prefix: prefix
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
        return fileList;
    }

    async upload(file: File, path: string): Promise<void> {
        await this.client.put(path, file);
    }

    async delete(path: string): Promise<void> {
        await this.client.delete(path);
    }

    async deleteMulti(paths: string[]): Promise<void> {
        await this.client.deleteMulti(paths, { quiet: true });
    }

    async getUrl(path: string): Promise<string> {
        return this.client.signatureUrl(path, { expires: 3600 });
    }

    async getContent(path: string): Promise<string> {
        const result = await this.client.get(path);
        if (result.content) {
            return result.content.toString();
        }
        return '';
    }

    async putContent(path: string, content: string | Blob): Promise<void> {
        await this.client.put(path, content);
    }

    async copy(source: string, destination: string): Promise<void> {
        await this.client.copy(destination, source);
    }
}
