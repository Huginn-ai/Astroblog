export interface Settings {
  primaryColor: string;
  secondaryColor: string;
  siteName: string;
  skyLink: string;
  aboutMe: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  images: string[];
  createdAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  author: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  postTitle?: string;
}
