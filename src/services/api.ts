import { Post, Comment, Settings } from '../types';

const API_BASE = '/api';

export const api = {
  getSettings: async (): Promise<Settings> => {
    const res = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to fetch settings');
    }
    return res.json();
  },
  updateSettings: async (settings: Settings): Promise<void> => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to update settings');
    }
  },
  getPosts: async (): Promise<Post[]> => {
    const res = await fetch(`${API_BASE}/posts`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to fetch posts');
    }
    return res.json();
  },
  getPost: async (id: number | string): Promise<Post> => {
    const res = await fetch(`${API_BASE}/posts/${id}`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to fetch post');
    }
    return res.json();
  },
  createPost: async (formData: FormData, onProgress?: (percent: number) => void): Promise<{ id: number }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/posts`);
      xhr.withCredentials = true;

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve({ id: 0 } as any);
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Failed to create post'));
          } catch (e) {
            reject(new Error('Failed to create post'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error. The celestial connection failed.'));
      xhr.onabort = () => reject(new Error('Upload aborted.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out.'));
      
      xhr.timeout = 60000;
      xhr.send(formData);
    });
  },
  updatePost: async (id: number | string, formData: FormData, onProgress?: (percent: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PATCH', `${API_BASE}/posts/${id}`);
      xhr.withCredentials = true;

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Failed to update post'));
          } catch (e) {
            reject(new Error('Failed to update post'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error. The celestial connection failed.'));
      xhr.onabort = () => reject(new Error('Upload aborted.'));
      xhr.ontimeout = () => reject(new Error('Upload timed out.'));
      
      xhr.timeout = 60000;
      xhr.send(formData);
    });
  },
  deletePost: async (id: number | string): Promise<void> => {
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to delete post');
    }
  },
  getComments: async (postId: number | string): Promise<Comment[]> => {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to fetch comments');
    }
    return res.json();
  },
  getCaptcha: async (): Promise<{ id: string, question: string }> => {
    const res = await fetch(`${API_BASE}/captcha`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to fetch captcha');
    }
    return res.json();
  },
  getAdminComments: async (): Promise<Comment[]> => {
    const res = await fetch(`${API_BASE}/admin/comments`, { credentials: 'include' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to fetch comments');
    }
    return res.json();
  },
  addComment: async (postId: number | string, author: string, content: string, captchaId: string, captchaSolution: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, captchaId, captchaSolution }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to add comment');
    }
  },
  updateCommentStatus: async (id: number, status: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to update comment status');
    }
  },
  deleteComment: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Failed to delete comment');
    }
  },
  login: async (password: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(error.error || 'Login failed');
    }
  },
  logout: async (): Promise<void> => {
    await fetch(`${API_BASE}/admin/logout`, { method: 'POST', credentials: 'include' });
  },
  checkAuth: async (): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/admin/check-auth`, { credentials: 'include' });
    const data = await res.json();
    return data.isAdmin;
  },
  getStats: async (): Promise<{ total: number, unique: number }> => {
    const res = await fetch(`${API_BASE}/stats`, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Failed to fetch stats');
    }
    return res.json();
  },
};
