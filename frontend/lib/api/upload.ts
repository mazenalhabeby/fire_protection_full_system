import { api } from './client';
import type { User } from '@/types/api';

export interface UploadAvatarResponse {
  message: string;
  profileImageUrl: string;
  thumbnailUrl: string;
  user: User;
}

export interface DeleteAvatarResponse {
  message: string;
  user: User;
}

export const uploadApi = {
  /**
   * Upload user avatar
   * @param file - The image file to upload
   */
  uploadAvatar: async (file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload avatar');
    }

    return response.json();
  },

  /**
   * Delete user avatar
   */
  deleteAvatar: async (): Promise<DeleteAvatarResponse> => {
    return api.delete('/upload/avatar');
  },
};
