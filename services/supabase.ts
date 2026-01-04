
import { createClient } from '@supabase/supabase-js';

// Per platform standard, we prioritize process.env for injected keys 
// but allow Vite's import.meta.env for local development.
const getEnv = (key: string): string => {
  // @ts-ignore
  const v = (typeof process !== 'undefined' && (process.env[`VITE_${key}`] || process.env[key])) ||
            // @ts-ignore
            (import.meta.env && (import.meta.env[`VITE_${key}`] || import.meta.env[key])) ||
            '';
  return v.trim().replace(/['"]/g, '');
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials not found. Authentication will fail.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
