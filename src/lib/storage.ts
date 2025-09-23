import { put, del, list, head, copy } from '@vercel/blob';

import { env } from './env';

export class StorageService {
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!env.BLOB_BASE_URL) {
        return {
          success: false,
          message: 'Blob storage not configured - missing BLOB_BASE_URL',
        };
      }

      // Test by listing objects (this is a light operation)
      const { blobs } = await list({
        limit: 1,
        token: env.BLOB_READ_WRITE_TOKEN!,
      });

      return {
        success: true,
        message: `Blob storage connected successfully (${blobs.length} items accessible)`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Blob storage connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  static async uploadFile(
    filename: string,
    file: File | Buffer | Blob,
    options?: {
      contentType?: string;
      cacheControlMaxAge?: number;
      addRandomSuffix?: boolean;
      retries?: number;
      retryDelayMs?: number;
    }
  ): Promise<{ url: string; pathname: string }> {
    try {
      const putOptions: any = {
        access: 'public',
        cacheControlMaxAge: options?.cacheControlMaxAge || 3600, // 1 hour default
        addRandomSuffix: options?.addRandomSuffix ?? true,
      };

      if (options?.contentType) {
        putOptions.contentType = options.contentType;
      }

      // Add token to options
      putOptions.token = env.BLOB_READ_WRITE_TOKEN!;

      const maxRetries = options?.retries ?? 3;
      const baseDelay = options?.retryDelayMs ?? 250;
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const blob = await put(filename, file, putOptions);
          return {
            url: blob.url,
            pathname: blob.pathname,
          };
        } catch (err) {
          lastError = err;
          if (attempt === maxRetries) break;
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      throw lastError;
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  }

  static async uploadFromUrl(
    filename: string,
    url: string,
    options?: {
      contentType?: string;
      cacheControlMaxAge?: number;
      addRandomSuffix?: boolean;
      retries?: number;
      retryDelayMs?: number;
    }
  ): Promise<{ url: string; pathname: string }> {
    try {
      const putOptions: any = {
        access: 'public',
        cacheControlMaxAge: options?.cacheControlMaxAge || 3600,
        addRandomSuffix: options?.addRandomSuffix ?? true,
      };

      if (options?.contentType) {
        putOptions.contentType = options.contentType;
      }

      // Add token to options
      putOptions.token = env.BLOB_READ_WRITE_TOKEN!;

      const maxRetries = options?.retries ?? 3;
      const baseDelay = options?.retryDelayMs ?? 250;
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const blob = await put(filename, url, putOptions);
          return {
            url: blob.url,
            pathname: blob.pathname,
          };
        } catch (err) {
          lastError = err;
          if (attempt === maxRetries) break;
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      throw lastError;
    } catch (error) {
      console.error('Storage upload from URL error:', error);
      throw error;
    }
  }

  static async deleteFile(url: string): Promise<void> {
    try {
      await del(url, {
        token: env.BLOB_READ_WRITE_TOKEN!,
      });
    } catch (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  }

  static async getFileInfo(url: string) {
    try {
      const info = await head(url, {
        token: env.BLOB_READ_WRITE_TOKEN!,
      });
      return {
        url: info.url,
        pathname: info.pathname,
        size: info.size,
        uploadedAt: info.uploadedAt,
        contentType: info.contentType,
        contentDisposition: info.contentDisposition,
        cacheControl: info.cacheControl,
      };
    } catch (error) {
      console.error('Storage file info error:', error);
      throw error;
    }
  }

  static async listFiles(options?: {
    limit?: number;
    prefix?: string;
    cursor?: string;
  }) {
    try {
      const listOptions: any = {
        limit: options?.limit || 100,
      };

      if (options?.prefix) {
        listOptions.prefix = options.prefix;
      }

      if (options?.cursor) {
        listOptions.cursor = options.cursor;
      }

      // Add token to options
      listOptions.token = env.BLOB_READ_WRITE_TOKEN!;

      const result = await list(listOptions);

      return {
        blobs: result.blobs.map((blob) => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
        cursor: result.cursor,
        hasMore: result.hasMore,
      };
    } catch (error) {
      console.error('Storage list error:', error);
      throw error;
    }
  }

  static async copyFile(
    fromUrl: string,
    toPathname: string
  ): Promise<{ url: string; pathname: string }> {
    try {
      const blob = await copy(fromUrl, toPathname, {
        access: 'public',
        token: env.BLOB_READ_WRITE_TOKEN!,
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
      };
    } catch (error) {
      console.error('Storage copy error:', error);
      throw error;
    }
  }

  // Utility function to generate a unique filename
  static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');

    return `${nameWithoutExt}-${timestamp}-${randomString}.${extension}`;
  }

  // Utility function to validate file type
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  // Utility function to validate file size
  static validateFileSize(file: File, maxSizeInBytes: number): boolean {
    return file.size <= maxSizeInBytes;
  }
}
