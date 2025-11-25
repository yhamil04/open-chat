import { create } from "zustand";
import { supabase, getOrCreateUserId, isDemoMode } from "@/lib/supabase";
import type { ConnectionStatus, Message, MatchResult } from "@/types/chat";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Profanity filter - basic word list
const BLOCKED_WORDS = [
  // Add your blocked words here
  "spam",
  // This is intentionally minimal - extend as needed
];

interface ReplyTarget {
  id: string;
  text: string;
  sender: "me" | "stranger";
}

interface ChatState {
  // State
  status: ConnectionStatus;
  messages: Message[];
  roomId: string | null;
  partnerId: string | null;
  userId: string;
  isTyping: boolean;
  strangerTyping: boolean;
  interests: string[];
  skipCount: number;
  skipCooldownUntil: number | null;
  
  // Reply state
  replyingTo: ReplyTarget | null;

  // Realtime channel reference
  roomChannel: RealtimeChannel | null;
  matchChannel: RealtimeChannel | null;

  // Actions
  initialize: () => void;
  setInterests: (interests: string[]) => void;
  findMatch: () => Promise<void>;
  sendMessage: (text: string) => { success: boolean; error?: string };
  disconnect: () => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  reportUser: (reason: string) => Promise<void>;
  reset: () => void;
  
  // Reply actions
  setReplyingTo: (message: Message | null) => void;
  clearReply: () => void;
  
  // Message status actions
  markMessageAsRead: (messageId: string) => void;
}

const generateRoomId = () => `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lowerText.includes(word.toLowerCase()));
};

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  status: "idle",
  messages: [],
  roomId: null,
  partnerId: null,
  userId: "",
  isTyping: false,
  strangerTyping: false,
  interests: [],
  skipCount: 0,
  skipCooldownUntil: null,
  roomChannel: null,
  matchChannel: null,
  replyingTo: null,

  initialize: () => {
    const userId = getOrCreateUserId();
    set({ userId });
  },

  setInterests: (interests: string[]) => {
    set({ interests });
  },

  findMatch: async () => {
    const state = get();
    const { userId, interests, skipCooldownUntil } = state;

    // Check for rate limiting cooldown
    if (skipCooldownUntil && Date.now() < skipCooldownUntil) {
      const remaining = Math.ceil((skipCooldownUntil - Date.now()) / 1000);
      console.log(`Cooldown active. Wait ${remaining} seconds.`);
      return;
    }

    // Clean up any existing channels
    if (state.roomChannel) {
      await supabase.removeChannel(state.roomChannel);
    }
    if (state.matchChannel) {
      await supabase.removeChannel(state.matchChannel);
    }

    set({
      status: "searching",
      messages: [],
      roomId: null,
      partnerId: null,
      strangerTyping: false,
      roomChannel: null,
      matchChannel: null,
    });

    // Helper function to simulate a match for demo purposes
    async function simulateMatch() {
      // Simulate search delay (2-5 seconds)
      const delay = 2000 + Math.random() * 3000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (get().status === "searching") {
        const roomId = generateRoomId();
        const fakePartnerId = `demo_${Math.random().toString(36).substr(2, 9)}`;
        handleMatch({ roomId, partnerId: fakePartnerId });
      }
    }

    // Helper function to handle when a match is found
    function handleMatch(matchData: MatchResult) {
      const { roomId, partnerId } = matchData;

      // Subscribe to the room channel for messaging (only if not in demo mode)
      let roomChannel: RealtimeChannel | null = null;
      
      if (!isDemoMode) {
        roomChannel = supabase.channel(`room:${roomId}`);

        roomChannel
          .on("broadcast", { event: "message" }, (payload) => {
            const msg = payload.payload as { 
              text: string; 
              senderId: string;
              replyTo?: { id: string; text: string; sender: "me" | "stranger" };
            };
            if (msg.senderId !== get().userId) {
              const newMessage: Message = {
                id: `${Date.now()}_${Math.random()}`,
                text: msg.text,
                sender: "stranger",
                timestamp: Date.now(),
                replyTo: msg.replyTo,
              };
              set((state) => ({
                messages: [...state.messages, newMessage],
                strangerTyping: false,
              }));
            }
          })
          .on("broadcast", { event: "typing" }, (payload) => {
            const { senderId, isTyping } = payload.payload as {
              senderId: string;
              isTyping: boolean;
            };
            if (senderId !== get().userId) {
              set({ strangerTyping: isTyping });
            }
          })
          .on("broadcast", { event: "disconnect" }, (payload) => {
            const { senderId } = payload.payload as { senderId: string };
            if (senderId !== get().userId) {
              set({ status: "disconnected", strangerTyping: false });
            }
          })
          .on("broadcast", { event: "read_receipt" }, (payload) => {
            const { messageId, readerId } = payload.payload as {
              messageId: string;
              readerId: string;
            };
            // If someone else read a message, mark all our sent messages as read
            // This means "the other person has seen my messages"
            if (readerId !== get().userId) {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.sender === "me" && (m.status === "sent" || m.status === "sending")
                    ? { ...m, status: "read" as const }
                    : m
                ),
              }));
            }
          })
          .subscribe();
      }

      set({
        status: "connected",
        roomId,
        partnerId,
        roomChannel,
      });
    }

    // In demo mode, always simulate a match
    if (isDemoMode) {
      await simulateMatch();
      return;
    }

    // Create a unique channel for this user to receive match notifications
    const userChannel = `match_${userId}`;

    // Subscribe to match notifications first
    const matchChannel = supabase.channel(userChannel);

    matchChannel
      .on("broadcast", { event: "matched" }, (payload) => {
        const matchData = payload.payload as MatchResult;
        handleMatch(matchData);
      })
      .subscribe();

    set({ matchChannel });

    try {
      // Check if there's anyone in the queue (with matching interests if provided)
      let query = supabase
        .from("waiting_queue")
        .select("*")
        .neq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      // If we have interests, try to match on those first
      if (interests.length > 0) {
        query = query.overlaps("interests", interests);
      }

      const { data: waitingUsers, error } = await query;

      if (error) {
        console.error("Error checking queue:", error);
        // For MVP/demo: simulate a match after delay
        await simulateMatch();
        return;
      }

      if (waitingUsers && waitingUsers.length > 0) {
        // Found a match! Remove them from queue and connect
        const partner = waitingUsers[0];

        // Delete partner from queue
        await supabase.from("waiting_queue").delete().eq("id", partner.id);

        // Generate room ID
        const roomId = generateRoomId();

        // Notify the partner about the match
        await supabase.channel(partner.socket_channel_id).send({
          type: "broadcast",
          event: "matched",
          payload: { roomId, partnerId: userId } as MatchResult,
        });

        // Handle our side of the match
        handleMatch({ roomId, partnerId: partner.user_id });
      } else {
        // No match found, add ourselves to queue
        // If interests match failed, try without interests
        if (interests.length > 0) {
          const { data: anyUsers } = await supabase
            .from("waiting_queue")
            .select("*")
            .neq("user_id", userId)
            .order("created_at", { ascending: true })
            .limit(1);

          if (anyUsers && anyUsers.length > 0) {
            const partner = anyUsers[0];
            await supabase.from("waiting_queue").delete().eq("id", partner.id);
            const roomId = generateRoomId();
            await supabase.channel(partner.socket_channel_id).send({
              type: "broadcast",
              event: "matched",
              payload: { roomId, partnerId: userId } as MatchResult,
            });
            handleMatch({ roomId, partnerId: partner.user_id });
            return;
          }
        }

        // No one available, join queue and wait
        const { error: insertError } = await supabase.from("waiting_queue").insert({
          user_id: userId,
          socket_channel_id: userChannel,
          interests: interests,
        });

        if (insertError) {
          console.error("Error joining queue:", insertError);
          // For MVP: simulate a match
          await simulateMatch();
        }
      }
    } catch (err) {
      console.error("Error in findMatch:", err);
      // For MVP: simulate a match
      await simulateMatch();
    }
  },

  sendMessage: (text: string) => {
    const state = get();
    const { status, roomId, userId, roomChannel, replyingTo } = state;

    if (status !== "connected" || !roomId) {
      return { success: false, error: "Not connected" };
    }

    // Check for profanity
    if (containsProfanity(text)) {
      return { success: false, error: "Message contains inappropriate content" };
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      return { success: false, error: "Message is empty" };
    }

    // Add message locally with reply info if present
    const newMessage: Message = {
      id: `${Date.now()}_${Math.random()}`,
      text: trimmedText,
      sender: "me",
      timestamp: Date.now(),
      status: "sending",
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        sender: replyingTo.sender,
      } : undefined,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      isTyping: false,
      replyingTo: null, // Clear reply after sending
    }));

    // Broadcast to room
    roomChannel?.send({
      type: "broadcast",
      event: "message",
      payload: { 
        text: trimmedText, 
        senderId: userId,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          sender: replyingTo.sender === "me" ? "stranger" : "me", // Flip for receiver
        } : undefined,
      },
    });

    // Mark as sent after a short delay (simulating network confirmation)
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === newMessage.id ? { ...m, status: "sent" as const } : m
        ),
      }));
    }, 300);

    return { success: true };
  },

  disconnect: async () => {
    const state = get();
    const { roomChannel, matchChannel, userId, skipCount } = state;

    // Track skips for rate limiting
    const newSkipCount = skipCount + 1;
    let cooldownUntil = null;

    if (newSkipCount >= 10) {
      // 30 second cooldown after 10 skips
      cooldownUntil = Date.now() + 30000;
    }

    // Notify partner of disconnect (only if we have a real channel)
    if (roomChannel) {
      try {
        await roomChannel.send({
          type: "broadcast",
          event: "disconnect",
          payload: { senderId: userId },
        });
        await supabase.removeChannel(roomChannel);
      } catch {
        // Ignore errors in demo mode
      }
    }

    // Remove from queue if still there (only if not in demo mode)
    if (!isDemoMode) {
      try {
        await supabase.from("waiting_queue").delete().eq("user_id", userId);
      } catch {
        // Ignore errors
      }
    }

    // Clean up match channel
    if (matchChannel) {
      try {
        await supabase.removeChannel(matchChannel);
      } catch {
        // Ignore errors in demo mode
      }
    }

    set({
      status: "idle",
      messages: [],
      roomId: null,
      partnerId: null,
      roomChannel: null,
      matchChannel: null,
      strangerTyping: false,
      skipCount: newSkipCount,
      skipCooldownUntil: cooldownUntil,
    });

    // Reset skip count after 1 minute of no skipping
    setTimeout(() => {
      set({ skipCount: 0 });
    }, 60000);
  },

  setTyping: (isTyping: boolean) => {
    const state = get();
    const { roomChannel, userId, status } = state;

    if (status !== "connected") return;

    set({ isTyping });

    roomChannel?.send({
      type: "broadcast",
      event: "typing",
      payload: { senderId: userId, isTyping },
    });
  },

  reportUser: async (reason: string) => {
    const state = get();
    const { userId, partnerId, messages } = state;

    if (!partnerId) return;

    // Get last 10 messages for the report
    const chatSnapshot = messages.slice(-10);

    // Only submit report if not in demo mode
    if (!isDemoMode) {
      try {
        await supabase.from("reports").insert({
          reporter_id: userId,
          bad_actor_id: partnerId,
          reason,
          chat_log_snapshot: chatSnapshot,
        });
      } catch {
        // Ignore errors in demo mode
      }
    }

    // Disconnect after reporting
    await get().disconnect();
  },

  reset: () => {
    set({
      status: "idle",
      messages: [],
      roomId: null,
      partnerId: null,
      isTyping: false,
      strangerTyping: false,
      skipCount: 0,
      skipCooldownUntil: null,
      replyingTo: null,
    });
  },

  setReplyingTo: (message: Message | null) => {
    if (message) {
      set({
        replyingTo: {
          id: message.id,
          text: message.text,
          sender: message.sender,
        },
      });
    } else {
      set({ replyingTo: null });
    }
  },

  clearReply: () => {
    set({ replyingTo: null });
  },

  markMessageAsRead: (messageId: string) => {
    const state = get();
    const { roomChannel, userId, messages } = state;

    // Find the message to mark as read
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.sender !== "stranger") {
      return; // Only mark stranger messages as read
    }

    // Check if we already sent a read receipt for this message
    // (We can track this by checking if message has a special flag, or just send it)
    // For now, we'll send it every time - Supabase will handle deduplication

    // Notify sender that their message was read
    if (roomChannel) {
      try {
        roomChannel.send({
          type: "broadcast",
          event: "read_receipt",
          payload: { messageId, readerId: userId },
        });
      } catch (error) {
        console.error("Error sending read receipt:", error);
      }
    }
  },
}));

