import { supabase } from '@/integrations/supabase/client';

interface FileValidationResult {
  valid: boolean;
  errors: string[];
  mime_type: string;
  max_size: number;
  allowed_types: string[];
}

/**
 * Secure file validation using database-backed MIME type checking
 * Prevents malicious file uploads and enforces strict type validation
 */
export class SecureFileValidator {
  static async validateFile(
    file: File,
    uploadType: 'image' | 'audio' | 'general' = 'general'
  ): Promise<FileValidationResult> {
    try {
      const { data, error } = await supabase.rpc('validate_file_upload', {
        p_file_name: file.name,
        p_mime_type: file.type,
        p_file_size: file.size,
        p_upload_type: uploadType
      });

      if (error) {
        console.error('File validation failed:', error);
        return {
          valid: false,
          errors: ['File validation service unavailable'],
          mime_type: file.type,
          max_size: 0,
          allowed_types: []
        };
      }

      return data as unknown as FileValidationResult;
    } catch (error) {
      console.error('File validator error:', error);
      return {
        valid: false,
        errors: ['File validation failed'],
        mime_type: file.type,
        max_size: 0,
        allowed_types: []
      };
    }
  }

  static async validateImageUpload(file: File): Promise<FileValidationResult> {
    const result = await this.validateFile(file, 'image');
    
    // Additional client-side validation for images
    if (result.valid) {
      const isValidImageFile = await this.validateImageContent(file);
      if (!isValidImageFile) {
        result.valid = false;
        result.errors.push('File does not appear to be a valid image');
      }
    }
    
    return result;
  }

  static async validateAudioUpload(file: File): Promise<FileValidationResult> {
    return this.validateFile(file, 'audio');
  }

  private static async validateImageContent(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 255);
  }
}