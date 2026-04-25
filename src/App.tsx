import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { BlogPost } from './pages/BlogPost';
import { Admin } from './pages/Admin';
import { AboutMe } from './pages/AboutMe';
import { api } from './services/api';
import { Settings } from './types';
import { Moon, Sun, Sparkles, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<Settings>({
    primaryColor: '#0f172a',
    secondaryColor: '#db2777',
    siteName: 'AstroBlog',
    skyLink: 'https://google.com',
    aboutMe: 'Hello, I am the author of this blog.'
  });
  const [stats, setStats] = useState<{ total: number; unique: number }>({ total: 0, unique: 0 });

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.getStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
  }, [settings]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 glass border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-2xl font-serif font-bold tracking-tight">
              <Sparkles className="text-pink-500" />
              <span>{settings.siteName}</span>
            </Link>
            
            <nav className="flex items-center gap-6">
              <Link to="/" className="hover:text-pink-400 transition-colors">Home</Link>
              <a 
                href={settings.skyLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-pink-400 transition-colors"
              >
                Sky
              </a>
              <Link to="/about" className="hover:text-pink-400 transition-colors">About Me</Link>
              <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <SettingsIcon size={20} />
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<BlogPost />} />
            <Route path="/about" element={<AboutMe settings={settings} />} />
            <Route path="/admin" element={<Admin settings={settings} onSettingsUpdate={setSettings} />} />
          </Routes>
        </main>

        <footer className="glass border-t border-white/10 py-12 mt-24">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400">© 2026 {settings.siteName}. Written in the stars.</p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-500 font-mono">
              <div className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                <span>Total Access: <span className="text-pink-400 font-bold">{stats.total.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Unique IP: <span className="text-blue-400 font-bold">{stats.unique.toLocaleString()}</span></span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
