import React from 'react';
import { Settings } from '../types';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';

interface AboutMeProps {
  settings: Settings;
}

export function AboutMe({ settings }: AboutMeProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl lg:max-w-5xl mx-auto glass p-12 rounded-[3rem]"
    >
      <h1 className="text-4xl font-serif font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
        About Me
      </h1>
      
      <div className="prose prose-invert prose-pink max-w-none">
        <div className="markdown-body">
          <Markdown>{settings.aboutMe || 'Hello, I am the author of this blog.'}</Markdown>
        </div>
      </div>
    </motion.div>
  );
}
