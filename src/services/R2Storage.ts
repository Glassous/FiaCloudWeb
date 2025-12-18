import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";
import type { StorageService } from './StorageInterface';
import type { R2ConfigData, OSSFile } from '../types';

export class R2Storage implements StorageService {
    private client: S3Client;
    private bucket: string;
    private customDomain?: string;

    constructor(config: R2ConfigData) {
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.accessKeySecret,
            },
        });
        this.bucket = config.bucket;
        this.customDomain = config.customDomain;
    }

    async list(prefix?: string): Promise<OSSFile[]> {
        const command = new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            MaxKeys: 1000,
        });
        const response = await this.client.send(command);
        
        const fileList: OSSFile[] = (response.Contents || []).map((obj) => ({
            name: obj.Key || '',
            url: '', // R2 list doesn't provide public URLs by default
            lastModified: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
            size: obj.Size || 0,
            type: obj.Key?.split('.').pop()?.toLowerCase(),
        }));

        fileList.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        return fileList;
    }

    // Helper for public URL
    private getPublicUrl(key: string): string {
        if (this.customDomain) {
            // Remove trailing slash from domain if present
            const domain = this.customDomain.replace(/\/$/, '');
            // Ensure key starts with slash if not present? No, usually domain/key
            return `${domain}/${key}`;
        }
        return ''; 
    }

    async upload(file: File, path: string): Promise<void> {
        const parallelUploads3 = new Upload({
            client: this.client,
            params: {
                Bucket: this.bucket,
                Key: path,
                Body: file,
                ContentType: file.type, 
            },
        });
        await parallelUploads3.done();
    }

    async delete(path: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: path,
        });
        await this.client.send(command);
    }

    async deleteMulti(paths: string[]): Promise<void> {
        if (paths.length === 0) return;
        const command = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
                Objects: paths.map(key => ({ Key: key })),
                Quiet: true,
            },
        });
        await this.client.send(command);
    }

    async getUrl(path: string): Promise<string> {
        if (this.customDomain) {
             return this.getPublicUrl(path);
        }
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: path,
        });
        return await getSignedUrl(this.client, command, { expiresIn: 3600 });
    }

    async getContent(path: string): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: path,
        });
        const response = await this.client.send(command);
        if (response.Body) {
            return await response.Body.transformToString();
        }
        return '';
    }

    async putContent(path: string, content: string | Blob): Promise<void> {
        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: path,
            Body: content,
        });
        await this.client.send(command);
    }

    async copy(source: string, destination: string): Promise<void> {
        // CopyObjectCommand expects CopySource to be "bucket/key"
        const command = new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${source}`,
            Key: destination,
        });
        await this.client.send(command);
    }
}
