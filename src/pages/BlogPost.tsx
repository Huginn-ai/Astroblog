import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Post, Comment } from '../types';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Calendar, User, MessageSquare, ArrowLeft, Send, Play } from 'lucide-react';
import { getYoutubeThumbnail, getYoutubeId, getYoutubeThumbnailFallback } from '../utils/youtube';
import { toast } from 'sonner';

function YouTubePlayer({ videoId, index }: { videoId: string, index: number }) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/20">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={`YouTube video player ${index}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  return (
    <div 
      className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 cursor-pointer group bg-black/20"
      onClick={() => setIsPlaying(true)}
    >
      <img 
        src={getYoutubeThumbnail(`https://www.youtube.com/watch?v=${videoId}`) || ''} 
        alt="YouTube thumbnail"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
        <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center shadow-2xl shadow-pink-500/50 transform group-hover:scale-110 transition-transform">
          <Play size={32} fill="white" className="text-white ml-2" />
        </div>
      </div>
      <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-white font-bold uppercase tracking-widest flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        YouTube Link {index + 1}
      </div>
    </div>
  );
}

export function BlogPost() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [captcha, setCaptcha] = useState<{ id: string, question: string } | null>(null);
  const [captchaSolution, setCaptchaSolution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCaptcha = async () => {
    try {
      const data = await api.getCaptcha();
      setCaptcha(data);
    } catch (err) {
      console.error('Failed to fetch captcha:', err);
    }
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getPost(id),
      api.getComments(id)
    ]).then(([postData, commentData]) => {
      setPost(postData);
      setComments(commentData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch post data:', err);
      toast.error(err.message || 'Failed to fetch celestial insight');
      setLoading(false);
    });
    fetchCaptcha();
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentContent.trim() || !captcha) return;
    
    setSubmitting(true);
    setError(null);
    try {
      await api.addComment(id, commentAuthor, commentContent, captcha.id, captchaSolution);
      setCommentAuthor('');
      setCommentContent('');
      setCaptchaSolution('');
      setSubmitted(true);
      toast.success('Thought transmitted successfully! Awaiting moderation.');
      fetchCaptcha();
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      toast.error(err.message || 'Transmission failed');
      fetchCaptcha();
      setCaptchaSolution('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen glass rounded-3xl animate-pulse" />;
  if (!post) return <div className="text-center py-24">Post not found.</div>;

  return (
    <div className="max-w-4xl lg:max-w-5xl mx-auto space-y-12">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-pink-400 transition-colors">
        <ArrowLeft size={16} /> Back to Home
      </Link>

      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <header className="space-y-6">
          <h1 className="text-5xl md:text-6xl font-serif font-bold leading-tight">
            {post.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-6 text-slate-400">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2">
              <User size={18} />
              By Celestial Guide
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              {comments.length} Comments
            </div>
          </div>
        </header>

        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            <img 
              src={post.images[0]} 
              alt={post.title}
              className="w-full rounded-3xl shadow-2xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/astro/1200/800';
              }}
            />
            {post.images.slice(1).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {post.images.slice(1).map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    alt={`${post.title} ${i + 2}`}
                    className="w-full aspect-square object-cover rounded-2xl"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/astro-${i}/400/400`;
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {post.youtubeLinks && post.youtubeLinks.length > 0 && (
          <div className="grid grid-cols-1 gap-8">
            {post.youtubeLinks.map((url, i) => {
              const videoId = getYoutubeId(url);
              if (!videoId) return null;
              return <YouTubePlayer key={i} videoId={videoId} index={i} />;
            })}
          </div>
        )}

        <div className="markdown-body">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      </motion.article>

      <hr className="border-white/10" />

      <section className="space-y-12">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-serif font-bold flex items-center gap-3">
            <MessageSquare className="text-pink-500" />
            Comments
          </h2>
        </div>

        <form onSubmit={handleCommentSubmit} className="glass p-8 rounded-3xl space-y-6">
          <h3 className="text-xl font-serif font-bold">Leave a comment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 uppercase tracking-widest">Name (Optional)</label>
              <input 
                type="text" 
                value={commentAuthor}
                onChange={e => setCommentAuthor(e.target.value)}
                placeholder="Anonymous"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400 uppercase tracking-widest">Comment</label>
            <textarea 
              value={commentContent}
              onChange={e => setCommentContent(e.target.value)}
              required
              rows={4}
              placeholder="What do the stars tell you?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm text-slate-400 uppercase tracking-widest">
                Verification: <span className="text-pink-400 font-bold">{captcha?.question}</span>
              </label>
              <input 
                type="number" 
                value={captchaSolution}
                onChange={e => setCaptchaSolution(e.target.value)}
                required
                placeholder="Your answer"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting}
              className="astro-gradient px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 h-[50px]"
            >
              {submitting ? 'Sending...' : 'Post Comment'}
              <Send size={18} />
            </button>
          </div>

          {error && (
            <p className="text-rose-400 text-sm font-medium">{error}</p>
          )}
          {submitted && (
            <p className="text-emerald-400 text-sm font-medium">Your comment has been sent for moderation. Thank you!</p>
          )}
        </form>

        <div className="space-y-6">
          {Array.isArray(comments) && comments.map(comment => (
            <motion.div 
              key={comment.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-6 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-pink-400">{comment.author}</span>
                <span className="text-xs text-slate-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">{comment.content}</p>
            </motion.div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-slate-500 py-12">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </section>
    </div>
  );
}
