import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;

  async onModuleInit() {
    this.bucketName = process.env.MINIO_BUCKET || 'file-storage';

    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    await this.ensureBucketExists();
    this.logger.log('MinIO client initialized successfully');
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      this.logger.error('Error ensuring bucket exists', error);
      throw error;
    }
  }

  generateObjectPath(userId: number, fileExtension: string): string {
    const uuid = uuidv4();
    return `users/${userId}/${uuid}.${fileExtension}`;
  }

  async uploadFile(
    objectPath: string,
    fileBuffer: Buffer,
    fileSize: number,
    contentType: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.minioClient.putObject(
        this.bucketName,
        objectPath,
        fileBuffer,
        fileSize,
        { 'Content-Type': contentType },
        (err) => {
          if (err) {
            this.logger.error('Error uploading file to MinIO', err);
            reject(err);
          } else {
            this.logger.log(`File uploaded successfully: ${objectPath}`);
            resolve();
          }
        },
      );
    });
  }

  async downloadFile(objectPath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.minioClient.getObject(
        this.bucketName,
        objectPath,
        (err, dataStream) => {
          if (err) {
            this.logger.error('Error downloading file from MinIO', err);
            reject(err);
            return;
          }

          dataStream.on('data', (chunk) => {
            chunks.push(chunk);
          });

          dataStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            this.logger.log(`File downloaded successfully: ${objectPath}`);
            resolve(buffer);
          });

          dataStream.on('error', (err) => {
            this.logger.error('Error in data stream', err);
            reject(err);
          });
        },
      );
    });
  }

  async deleteFile(objectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.minioClient.removeObject(this.bucketName, objectPath, (err) => {
        if (err) {
          this.logger.error('Error deleting file from MinIO', err);
          reject(err);
        } else {
          this.logger.log(`File deleted successfully: ${objectPath}`);
          resolve();
        }
      });
    });
  }

  async getFileUrl(objectPath: string, expirySeconds: number = 3600): Promise<string> {
    return new Promise((resolve, reject) => {
      this.minioClient.presignedGetObject(
        this.bucketName,
        objectPath,
        expirySeconds,
        (err, presignedUrl) => {
          if (err) {
            this.logger.error('Error generating presigned URL', err);
            reject(err);
          } else {
            resolve(presignedUrl);
          }
        },
      );
    });
  }
}