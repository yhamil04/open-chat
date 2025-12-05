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

// Cross-platform UUID generator
const generateUUID = (): string => {
  // Try native crypto.randomUUID first (web)
  if (
    Platform.OS === "web" &&
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback: Generate UUID v4 manually (works on all platforms)
  const getRandomValues = (arr: Uint8Array): Uint8Array => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      return crypto.getRandomValues(arr);
    }
    // Fallback for environments without crypto
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  const bytes = getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

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

// In-memory storage for native user ID (persists for app session)
let nativeUserId: string | null = null;

// Generate or retrieve the anonymous user ID
export const getOrCreateUserId = (): string => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const storedId = window.localStorage.getItem("openchat_user_id");
    if (storedId) return storedId;

    const newId = generateUUID();
    window.localStorage.setItem("openchat_user_id", newId);
    return newId;
  }

  // For native, keep consistent ID during app session
  if (nativeUserId) return nativeUserId;
  nativeUserId = generateUUID();
  return nativeUserId;
};
