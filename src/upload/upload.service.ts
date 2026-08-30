import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Client } from 'minio';
import * as path from 'path';
import { Express } from 'express';
import { UploadResponseDto } from './dto/upload.dto';

/**
 * Upload Service
 * Handles file uploads to MinIO object storage
 */
@Injectable()
export class UploadService {
  private minioClient: Client;
  private bucketName: string;
  private minioPublicUrl: string;

  constructor() {
    this.initializeMinIO();
  }

  /**
   * Initialize MinIO client
   */
  private initializeMinIO(): void {
    try {
      const config = {
        endPoint:
          process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, '').split(
            ':',
          )[0] || 'minio',
        port: parseInt(process.env.MINIO_PORT) || 9000,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretKey: process.env.MINIO_ROOT_PASSWORD || 'waras123',
        forcePathStyle: true,
      };

      this.minioClient = new Client(config);
      this.bucketName = process.env.MINIO_BUCKET_NAME || 'uploads';
      this.minioPublicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';

      console.log('MinIO client initialized with path style:', config);
    } catch (error) {
      console.error('Failed to initialize MinIO client:', error);
      throw error;
    }
  }

  /**
   * Ensure bucket exists and is publicly readable
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`],
            },
          ],
        });
        await this.minioClient.setBucketPolicy(this.bucketName, policy);
        console.log(
          `Bucket ${this.bucketName} created with public read policy`,
        );
      }
    } catch (error) {
      console.error('Bucket setup failed:', error);
      throw error;
    }
  }

  /**
   * Upload a file to MinIO
   * @param userId - The user's ID
   * @param file - The file to upload
   * @returns Upload response with public URL
   */
  async uploadFile(
    userId: number,
    file: Express.Multer.File | undefined,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: JPEG, PNG, GIF',
      );
    }

    // Validate file size (5MB max)
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        'File too large. Maximum size: 5MB.',
      );
    }

    try {
      // Ensure bucket exists
      await this.ensureBucketExists();

      // Generate filename
      const fileExtension = path.extname(file.originalname);
      const filename = `user-${userId}-${Date.now()}${fileExtension}`;

      // Upload to MinIO
      await this.minioClient.putObject(
        this.bucketName,
        filename,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      console.log(
        `File ${filename} uploaded to bucket ${this.bucketName}`,
      );

      // Generate public URL
      // Using a standard S3-compatible URL format
      const publicUrl = `${this.minioPublicUrl}/${this.bucketName}/${filename}`;

      return {
        success: true,
        url: publicUrl,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      console.error('Upload error:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message}`,
      );
    }
  }
}
