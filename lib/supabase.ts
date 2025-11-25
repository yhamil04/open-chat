import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

// Use placeholder values if env vars are not set (demo mode)
// Ensure we don't pass empty string if the env var is defined but empty
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl =
  envUrl && envUrl.trim() !== "" ? envUrl : "https://placeholder.supabase.co";

const supabaseAnonKey =
  envKey && envKey.trim() !== "" ? envKey : "placeholder-key";

// Flag to check if we're in demo mode (no real Supabase connection)
export const isDemoMode = supabaseUrl.includes("placeholder");

// For web, we use localStorage; for native, we'd use SecureStore
const getStorage = () => {
  if (Platform.OS === "web") {
    return {
      getItem: (key: string) => {
        if (typeof window !== "undefined") {
          return Promise.resolve(window.localStorage.getItem(key));
        }
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, value);
        }
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(key);
        }
        return Promise.resolve();
      },
    };
  }
  // For native, return a basic in-memory storage (in production, use SecureStore)
  const storage: Record<string, string> = {};
  return {
    getItem: (key: string) => Promise.resolve(storage[key] || null),
    setItem: (key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      delete storage[key];
      return Promise.resolve();
    },
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Generate or retrieve the anonymous user ID
export const getOrCreateUserId = (): string => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const storedId = window.localStorage.getItem("openchat_user_id");
    if (storedId) return storedId;

    const newId = crypto.randomUUID();
    window.localStorage.setItem("openchat_user_id", newId);
    return newId;
  }

  // For native, generate a new ID each time (in production, use SecureStore)
  return crypto.randomUUID();
};
