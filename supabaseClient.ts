
import { createClient } from '@supabase/supabase-js';

// Credentials provided for the application
const DEFAULT_SUPABASE_URL = 'https://qngqankrmwlxxzdluqhe.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuZ3FhbmtybXdseHh6ZGx1cWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1OTY3NDEsImV4cCI6MjA5NDE3Mjc0MX0.7scdBsk1dH0sdFIS4L33Ek9Yt0QQ3Qmk_l_Ze8CnxXU';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
