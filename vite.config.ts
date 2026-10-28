
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env and .env.example variables are loaded
dotenv.config();
const examplePath = path.resolve(__dirname, '.env.example');
if (fs.existsSync(examplePath)) {
  const exampleEnv = dotenv.parse(fs.readFileSync(examplePath));
  for (const key in exampleEnv) {
    if (!process.env[key] && exampleEnv[key]) {
      process.env[key] = exampleEnv[key];
    }
  }
}

const supabaseUrl =
  process.env.VITE_SUPABASE_URL || 'https://qngqankrmwlxxzdluqhe.supabase.co';
const supabaseAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ3FhbmtybXdseHh6ZGx1cWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTY3NDEsImV4cCI6MjA5NDE3Mjc0MX0.7scdBsk1dH0sdFIS4L33Ek9Yt0QQ3Qmk_l_Ze8CnxXU';
const geminiApiKey =
  process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || 'AIzaSyC3XZAkLvDLBISvRpYF-8GTMY408IwMzBY';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
});
