// ==================== SUPABASE CLIENT ====================
// Supabase client for authentication
// Only used for login/logout, not for data operations

import { createClient } from '@supabase/supabase-js';
import { API_KEYS } from '../constants/Config';

const supabase = createClient(API_KEYS.SUPABASE_URL || '', API_KEYS.SUPABASE_ANON_KEY || '');

export default supabase;
