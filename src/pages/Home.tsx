import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Post } from '../types';
import { motion } from 'motion/react';
import { Calendar, ArrowRight, Search } from 'lucide-react';

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getPosts().then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.excerpt && post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-96 glass rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4 mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl font-serif font-bold"
        >
          Celestial Insights
        </motion.h1>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
          Explore the mysteries of the cosmos and discover what the stars have in store for you.
        </p>
      </section>

      <section className="max-w-xl mx-auto mb-16 relative">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-slate-500 group-focus-within:text-pink-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search the cosmos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500 transition-all text-lg placeholder:text-slate-600"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Array.isArray(filteredPosts) && filteredPosts.map((post, index) => (
          <motion.article
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group glass rounded-3xl overflow-hidden flex flex-col hover:border-pink-500/50 transition-all hover:shadow-2xl hover:shadow-pink-500/10"
          >
            <Link to={`/post/${post.id}`} className="block aspect-video overflow-hidden">
              <img 
                src={post.images[0] || 'https://picsum.photos/seed/astro/800/600'} 
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/astro/800/600';
                }}
              />
            </Link>
            
            <div className="p-6 flex-grow flex flex-col space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest">
                <Calendar size={14} />
                {new Date(post.createdAt).toLocaleDateString()}
              </div>
              
              <h2 className="text-2xl font-serif font-bold group-hover:text-pink-400 transition-colors">
                <Link to={`/post/${post.id}`}>{post.title}</Link>
              </h2>
              
              <p className="text-slate-400 line-clamp-3 flex-grow">
                {post.excerpt || post.content.substring(0, 150) + '...'}
              </p>
              
              <Link 
                to={`/post/${post.id}`}
                className="inline-flex items-center gap-2 text-pink-400 font-medium group/link"
              >
                Read More 
                <ArrowRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.article>
        ))}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-24 glass rounded-3xl">
          <p className="text-slate-400">
            {searchTerm 
              ? `No celestial messages found matching "${searchTerm}". Try another search.`
              : "No celestial messages found yet. Check back soon!"}
          </p>
        </div>
      )}
    </div>
  );
}
