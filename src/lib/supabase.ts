import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Supabase configuration
// Using the project info from utils/supabase/info.tsx
const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseAnonKey = publicAnonKey;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for user profile
export interface UserProfile {
  id: string;
  user_id: string; // UUID from auth.users
  unique_id: string; // P123456, D123456, or L123456
  name: string;
  role: 'patient' | 'doctor' | 'lab';
  phone: string;
  age?: number;
  gender?: string;
  gov_id?: string; // For doctors and labs
  created_at: string;
  updated_at: string;
}

// Generate unique ID based on role
export function generateUniqueId(role: 'patient' | 'doctor' | 'lab'): string {
  const prefix = role === 'patient' ? 'P' : role === 'doctor' ? 'D' : 'L';
  const randomId = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${randomId}`;
}
