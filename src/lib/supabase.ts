import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder credentials during Next.js build-time static prerendering
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isMockDatabase = supabaseUrl.includes('placeholder-project-id');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

