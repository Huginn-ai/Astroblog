import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Post, Comment, Settings } from '../types';
import { motion } from 'motion/react';
import imageCompression from 'browser-image-compression';
import { 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Image as ImageIcon, 
  Save, 
  Layout, 
  MessageSquare, 
  FileText,
  Palette,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  LogOut,
  Lock
} from 'lucide-react';

interface AdminProps {
  settings: Settings;
  onSettingsUpdate: (settings: Settings) => void;
}

export function Admin({ settings, onSettingsUpdate }: AdminProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'new-post' | 'manage-posts' | 'comments' | 'settings' | 'menu-link' | 'about-me'>('new-post');
  const [posts, setPosts] = useState<Post[]>([]);
  const [adminComments, setAdminComments] = useState<Comment[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', excerpt: '' });
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedImages, setSelectedImages] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postToDelete, setPostToDelete] = useState<number | null>(null);

  useEffect(() => {
    api.checkAuth().then(setIsAdmin);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      refreshData();
    }
  }, [isAdmin]);

  const [debugInfo, setDebugInfo] = useState<any>(null);

  const checkDebug = async () => {
    try {
      const res = await fetch('/api/admin/debug', { credentials: 'include' });
      const data = await res.json();
      setDebugInfo(data);
    } catch (err) {
      setDebugInfo({ error: 'Failed to fetch debug info' });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.login(loginPassword);
      setIsAdmin(true);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setIsAdmin(false);
  };

  const refreshData = async () => {
    try {
      const postsData = await api.getPosts();
      setPosts(postsData);
      const commentsData = await api.getAdminComments();
      setAdminComments(commentsData);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Failed to refresh data:', err);
      const msg = err.message || '';
      if (msg === 'Unauthorized' || msg.includes('401')) {
        setIsAdmin(false);
      } else {
        setError(msg || 'Failed to refresh data');
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('title', newPost.title);
    formData.append('content', newPost.content);
    formData.append('excerpt', newPost.excerpt);
    
    if (editingPost) {
      formData.append('existingImages', JSON.stringify(editingPost.images));
    }
    
    if (selectedImages) {
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        
        // Skip non-image files
        if (!file.type.startsWith('image/')) {
          continue;
        }

        try {
          // Compress image if it's larger than 1MB
          if (file.size > 1024 * 1024) {
            setCompressionStatus(`Optimizing image ${i + 1} of ${selectedImages.length}...`);
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true
            };
            const compressedFile = await imageCompression(file, options);
            formData.append('images', compressedFile, file.name);
          } else {
            formData.append('images', file);
          }
        } catch (error) {
          console.error('Compression error:', error);
          formData.append('images', file); // Fallback to original
        }
      }
    }
    setCompressionStatus(null);


    try {
      if (editingPost) {
        await api.updatePost(editingPost.id, formData);
      } else {
        await api.createPost(formData);
      }
      
      setNewPost({ title: '', content: '', excerpt: '' });
      setSelectedImages(null);
      setEditingPost(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      refreshData();
      setActiveTab('manage-posts');
    } catch (err: any) {
      setError(err.message || 'Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (post: Post) => {
    setEditingPost(post);
    setNewPost({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt
    });
    setActiveTab('new-post');
  };

  const handleDeletePost = async (id: number) => {
    setPostToDelete(id);
  };

  const confirmDeletePost = async () => {
    if (postToDelete === null) return;
    try {
      await api.deletePost(postToDelete);
      setPostToDelete(null);
      refreshData();
    } catch (error) {
      console.error('Failed to delete post:', error);
      setError('Failed to delete post');
    }
  };

  const handleCommentAction = async (id: number, status: 'approved' | 'rejected' | 'delete') => {
    if (status === 'delete') {
      await api.deleteComment(id);
    } else {
      await api.updateCommentStatus(id, status);
    }
    refreshData();
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (!editingPost) return;
    const newImages = [...editingPost.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setEditingPost({ ...editingPost, images: newImages });
  };

  const removeImage = (index: number) => {
    if (!editingPost) return;
    const newImages = editingPost.images.filter((_, i) => i !== index);
    setEditingPost({ ...editingPost, images: newImages });
  };

  const handleSettingsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateSettings(settings);
    alert('Settings updated successfully!');
  };

  if (isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 border border-white/10"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="text-pink-500" size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold">Admin Portal</h2>
            <p className="text-slate-400 mt-2">Enter the celestial key to proceed</p>
            <button 
              type="button"
              onClick={checkDebug}
              className="mt-4 text-xs text-slate-500 hover:text-slate-300 underline"
            >
              Debug Session
            </button>
            {debugInfo && (
              <pre className="mt-4 p-4 bg-slate-900/50 rounded-xl text-[10px] text-slate-400 overflow-auto max-h-40 text-left">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-widest">Celestial Key</label>
              <input 
                type="password"
                required
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-rose-400 text-sm font-medium">{error}</p>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full astro-gradient py-4 rounded-xl font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Unlock Portal'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-serif font-bold">Admin Dashboard</h1>
            <button 
              onClick={refreshData}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              title="Refresh Data"
            >
              <ArrowUp className="rotate-180" size={20} />
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
        
        <div className="flex flex-wrap bg-white/5 p-1 rounded-2xl border border-white/10">
          <button 
            onClick={() => {
              setActiveTab('new-post');
              setEditingPost(null);
              setNewPost({ title: '', content: '', excerpt: '' });
            }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'new-post' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <Plus size={18} /> New Post
          </button>
          <button 
            onClick={() => setActiveTab('manage-posts')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'manage-posts' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <FileText size={18} /> Manage Posts
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'comments' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <MessageSquare size={18} /> Comments
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'settings' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <Palette size={18} /> Design
          </button>
          <button 
            onClick={() => setActiveTab('menu-link')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'menu-link' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <LinkIcon size={18} /> Menu Link
          </button>
          <button 
            onClick={() => setActiveTab('about-me')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === 'about-me' ? 'astro-gradient shadow-lg' : 'hover:bg-white/5'}`}
          >
            <FileText size={18} /> About Me
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <X size={20} />
            <p className="font-medium">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'new-post' && (
        <div className="max-w-3xl lg:max-w-6xl mx-auto">
          <form onSubmit={handleCreatePost} className="glass p-8 lg:p-12 rounded-3xl space-y-6">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              {editingPost ? <FileText className="text-pink-500" /> : <Plus className="text-pink-500" />}
              {editingPost ? 'Edit Post' : 'New Post'}
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Title</label>
                <input 
                  type="text" 
                  required
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Excerpt</label>
                <textarea 
                  value={newPost.excerpt}
                  onChange={e => setNewPost({ ...newPost, excerpt: e.target.value })}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">Content (Markdown)</label>
                <textarea 
                  required
                  value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  rows={8}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-widest">
                  {editingPost ? 'Add More Images' : 'Images'}
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500/50 transition-colors"
                >
                  <ImageIcon className="mx-auto mb-2 text-slate-500" />
                  <span className="text-sm text-slate-400">
                    {selectedImages ? `${selectedImages.length} files selected` : 'Click to upload images'}
                  </span>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    multiple 
                    accept="image/*"
                    onChange={e => {
                      setSelectedImages(e.target.files);
                      setError(null);
                    }}
                    className="hidden" 
                  />
                </div>

                {selectedImages && selectedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {Array.from(selectedImages).map((file, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                        <img 
                          src={URL.createObjectURL(file)} 
                          className="w-full h-full object-cover" 
                          onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                          New
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editingPost && editingPost.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {editingPost.images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                        <img src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveImage(i, 'up')}
                            disabled={i === 0}
                            className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(i, 'down')}
                            disabled={i === editingPost.images.length - 1}
                            className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30"
                            title="Remove Image"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 astro-gradient py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : editingPost ? 'Update Celestial Insight' : 'Publish Celestial Insight'}</span>
                </div>
                {compressionStatus && (
                  <span className="text-xs text-white/70 italic font-normal">{compressionStatus}</span>
                )}
              </button>
              {editingPost && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingPost(null);
                    setNewPost({ title: '', content: '', excerpt: '' });
                    setActiveTab('manage-posts');
                  }}
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'manage-posts' && (
        <section className="space-y-6">
          <h2 className="text-2xl font-serif font-bold">Manage Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(posts) && posts.map(post => (
              <div key={post.id} className="glass p-6 rounded-2xl flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => handleEditClick(post)}>
                  <img 
                    src={post.images[0] || 'https://picsum.photos/seed/astro/100/100'} 
                    className="w-16 h-16 object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/astro/100/100';
                    }}
                  />
                  <div>
                    <h3 className="font-serif font-bold text-lg group-hover:text-pink-400 transition-colors">{post.title}</h3>
                    <p className="text-sm text-slate-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="p-3 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition-colors"
                  title="Delete Post"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'comments' && (
        <section className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            {Array.isArray(adminComments) && adminComments.map(comment => (
              <motion.div 
                key={comment.id}
                layout
                className="glass p-8 rounded-3xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-pink-400">{comment.author}</span>
                    <p className="text-xs text-slate-500">
                      On: <span className="text-slate-300">{comment.postTitle}</span> • {new Date(comment.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleCommentAction(comment.id, 'approved')}
                          className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                          title="Approve"
                        >
                          <Check size={20} />
                        </button>
                        <button 
                          onClick={() => handleCommentAction(comment.id, 'rejected')}
                          className="p-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                          title="Reject"
                        >
                          <X size={20} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleCommentAction(comment.id, 'delete')}
                      className="p-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed italic">"{comment.content}"</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md ${
                    comment.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    comment.status === 'rejected' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {comment.status}
                  </span>
                </div>
              </motion.div>
            ))}
            {adminComments.length === 0 && (
              <div className="text-center py-24 glass rounded-3xl">
                <p className="text-slate-400">No comments to moderate.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="max-w-2xl lg:max-w-5xl mx-auto">
          <form onSubmit={handleSettingsUpdate} className="glass p-12 rounded-[3rem] space-y-10">
            <h2 className="text-3xl font-serif font-bold text-center">Site Customization</h2>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm text-slate-400 uppercase tracking-widest block">Site Name</label>
                <input 
                  type="text" 
                  value={settings.siteName}
                  onChange={e => onSettingsUpdate({ ...settings, siteName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm text-slate-400 uppercase tracking-widest block">Primary Color (Deep Blue)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings.primaryColor}
                      onChange={e => onSettingsUpdate({ ...settings, primaryColor: e.target.value })}
                      className="w-16 h-16 rounded-2xl cursor-pointer bg-transparent border-none"
                    />
                    <span className="font-mono text-slate-400">{settings.primaryColor}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm text-slate-400 uppercase tracking-widest block">Secondary Color (Pink Blue)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings.secondaryColor}
                      onChange={e => onSettingsUpdate({ ...settings, secondaryColor: e.target.value })}
                      className="w-16 h-16 rounded-2xl cursor-pointer bg-transparent border-none"
                    />
                    <span className="font-mono text-slate-400">{settings.secondaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full astro-gradient py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-2xl shadow-pink-500/20"
            >
              <Save size={24} /> Save Cosmic Configuration
            </button>
          </form>
        </section>
      )}

      {activeTab === 'menu-link' && (
        <section className="max-w-2xl lg:max-w-5xl mx-auto">
          <form onSubmit={handleSettingsUpdate} className="glass p-12 rounded-[3rem] space-y-10">
            <h2 className="text-3xl font-serif font-bold text-center">Menu Link Configuration</h2>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm text-slate-400 uppercase tracking-widest block">Sky Tab URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://example.com"
                  value={settings.skyLink}
                  onChange={e => onSettingsUpdate({ ...settings, skyLink: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:border-pink-500"
                />
                <p className="text-xs text-slate-500">This URL will be used for the "Sky" tab in the main navigation.</p>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full astro-gradient py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-2xl shadow-pink-500/20"
            >
              <Save size={24} /> Save Menu Link
            </button>
          </form>
        </section>
      )}

      {activeTab === 'about-me' && (
        <section className="max-w-3xl lg:max-w-6xl mx-auto">
          <form onSubmit={handleSettingsUpdate} className="glass p-12 rounded-[3rem] space-y-10">
            <h2 className="text-3xl font-serif font-bold text-center">About Me Configuration</h2>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm text-slate-400 uppercase tracking-widest block">About Me Content (Markdown)</label>
                <textarea 
                  required
                  rows={15}
                  value={settings.aboutMe || ''}
                  onChange={e => onSettingsUpdate({ ...settings, aboutMe: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm focus:outline-none focus:border-pink-500"
                  placeholder="Write your about me content here using Markdown..."
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full astro-gradient py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform shadow-2xl shadow-pink-500/20"
            >
              <Save size={24} /> Save About Me
            </button>
          </form>
        </section>
      )}

      {postToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-8 rounded-3xl max-w-md w-full border border-white/10 shadow-2xl"
          >
            <h3 className="text-2xl font-serif font-bold mb-4">Delete Post</h3>
            <p className="text-slate-300 mb-8">
              Are you sure you want to delete this celestial insight? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setPostToDelete(null)}
                className="flex-1 px-6 py-3 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePost}
                className="flex-1 px-6 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/50 rounded-xl font-bold hover:bg-rose-500/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
