import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env file'
  );
}

/**
 * Dedicated Supabase client for Node.js tests
 * - No auto-refresh to avoid token conflicts during rapid test execution
 * - No session persistence (tests should be stateless)
 * - Explicit session management
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storage: undefined,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-test-client',
    },
  },
  db: {
    schema: 'public',
  },
});

/**
 * Helper to ensure clean session state before each test
 */
export async function cleanupSession() {
  try {
    await supabase.auth.signOut();
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 150));
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Helper to wait for database triggers to complete
 */
export async function waitForTrigger(ms: number = 250) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to retry failed operations (network issues, race conditions)
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 200
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries} after error:`, error instanceof Error ? error.message : error);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }

  throw lastError;
}
