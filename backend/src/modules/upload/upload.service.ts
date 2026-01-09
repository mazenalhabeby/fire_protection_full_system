import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;
  private readonly maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    const backendUrl = this.configService.get<string>('BACKEND_URL');
    if (!backendUrl && process.env.NODE_ENV === 'production') {
      throw new Error('BACKEND_URL environment variable is required in production');
    }
    this.baseUrl = backendUrl || 'http://localhost:3001';

    // Ensure upload directories exist
    this.ensureDirectoryExists(path.join(this.uploadDir, 'avatars'));
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Process and save avatar image
   * Creates multiple sizes for different use cases
   */
  async processAndSaveAvatar(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ original: string; thumbnail: string }> {
    this.validateFile(file);

    const uniqueId = uuidv4();
    const avatarDir = path.join(this.uploadDir, 'avatars', userId);
    this.ensureDirectoryExists(avatarDir);

    // Delete old avatars for this user
    await this.deleteUserAvatars(userId);

    // Process original size (max 400x400 for profile display)
    const originalFilename = `${uniqueId}-original.webp`;
    const originalPath = path.join(avatarDir, originalFilename);

    await sharp(file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toFile(originalPath);

    // Process thumbnail (80x80 for navbar, comments, etc.)
    const thumbnailFilename = `${uniqueId}-thumb.webp`;
    const thumbnailPath = path.join(avatarDir, thumbnailFilename);

    await sharp(file.buffer)
      .resize(80, 80, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    this.logger.log(`Avatar processed and saved for user ${userId}`);

    return {
      original: `/uploads/avatars/${userId}/${originalFilename}`,
      thumbnail: `/uploads/avatars/${userId}/${thumbnailFilename}`,
    };
  }

  /**
   * Delete all avatars for a user
   */
  async deleteUserAvatars(userId: string): Promise<void> {
    const avatarDir = path.join(this.uploadDir, 'avatars', userId);

    if (fs.existsSync(avatarDir)) {
      const files = fs.readdirSync(avatarDir);
      for (const file of files) {
        fs.unlinkSync(path.join(avatarDir, file));
      }
      this.logger.log(`Deleted old avatars for user ${userId}`);
    }
  }

  /**
   * Delete a specific file by path
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted file: ${filePath}`);
    }
  }

  /**
   * Get the full URL for a file path
   */
  getFileUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    return `${this.baseUrl}${filePath}`;
  }
}
