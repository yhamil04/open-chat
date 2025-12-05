import { getOrCreateUserId, isDemoMode, supabase } from "@/lib/supabase";
import type { ConnectionStatus, MatchResult, Message } from "@/types/chat";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";

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
  reset: () => Promise<void>;

  // Reply actions
  setReplyingTo: (message: Message | null) => void;
  clearReply: () => void;

  // Message status actions
  markMessageAsRead: (messageId: string) => void;
}

const generateRoomId = () =>
  `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const containsProfanity = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lowerText.includes(word.toLowerCase()));
};

// Helper to wait for channel subscription with timeout
const waitForSubscription = (
  channel: RealtimeChannel,
  timeoutMs: number = 5000
): Promise<boolean> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
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
      try {
        await supabase.removeChannel(state.roomChannel);
      } catch (e) {
        console.log("Error removing room channel:", e);
      }
    }
    if (state.matchChannel) {
      try {
        await supabase.removeChannel(state.matchChannel);
      } catch (e) {
        console.log("Error removing match channel:", e);
      }
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
      // Simulate search delay (2-4 seconds for faster demo)
      const delay = 2000 + Math.random() * 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (get().status === "searching") {
        const roomId = generateRoomId();
        const fakePartnerId = `demo_${Math.random().toString(36).substr(2, 9)}`;
        handleMatch({ roomId, partnerId: fakePartnerId });
      }
    }

    // Helper function to handle when a match is found
    async function handleMatch(matchData: MatchResult) {
      const { roomId, partnerId } = matchData;

      // CRITICAL: Check if we're still in searching state
      // If user pressed home or disconnected, don't connect
      const currentState = get();
      if (currentState.status !== "searching") {
        console.log("Match received but no longer searching, ignoring");
        return;
      }

      // Prevent self-matching
      if (partnerId === currentState.userId) {
        console.warn("Prevented self-match");
        return;
      }

      // Subscribe to the room channel for messaging (only if not in demo mode)
      let roomChannel: RealtimeChannel | null = null;

      if (!isDemoMode) {
        roomChannel = supabase.channel(`room:${roomId}`, {
          config: {
            broadcast: { self: false },
          },
        });

        roomChannel
          .on("broadcast", { event: "message" }, (payload) => {
            const state = get();
            // Only process if we're connected and in the right room
            if (state.status !== "connected" || state.roomId !== roomId) return;

            const msg = payload.payload as {
              text: string;
              senderId: string;
              replyTo?: { id: string; text: string; sender: "me" | "stranger" };
            };
            if (msg.senderId !== state.userId) {
              const newMessage: Message = {
                id: `${Date.now()}_${Math.random()}`,
                text: msg.text,
                sender: "stranger",
                timestamp: Date.now(),
                replyTo: msg.replyTo,
              };
              set((s) => ({
                messages: [...s.messages, newMessage],
                strangerTyping: false,
              }));
            }
          })
          .on("broadcast", { event: "typing" }, (payload) => {
            const state = get();
            if (state.status !== "connected" || state.roomId !== roomId) return;

            const { senderId, isTyping } = payload.payload as {
              senderId: string;
              isTyping: boolean;
            };
            if (senderId !== state.userId) {
              set({ strangerTyping: isTyping });
            }
          })
          .on("broadcast", { event: "disconnect" }, (payload) => {
            const state = get();
            if (state.roomId !== roomId) return;

            const { senderId } = payload.payload as { senderId: string };
            if (senderId !== state.userId) {
              set({ status: "disconnected", strangerTyping: false });
            }
          })
          .on("broadcast", { event: "read_receipt" }, (payload) => {
            const state = get();
            if (state.status !== "connected" || state.roomId !== roomId) return;

            const { readerId } = payload.payload as {
              messageId: string;
              readerId: string;
            };
            if (readerId !== state.userId) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.sender === "me" &&
                  (m.status === "sent" || m.status === "sending")
                    ? { ...m, status: "read" as const }
                    : m
                ),
              }));
            }
          });

        // Wait for subscription to complete
        const subscribed = await waitForSubscription(roomChannel, 5000);
        if (!subscribed) {
          console.warn("Room channel subscription failed, continuing anyway");
        }
      }

      // Final check before connecting - state might have changed during subscription
      if (get().status !== "searching") {
        console.log("State changed during room subscription, aborting");
        if (roomChannel) {
          supabase.removeChannel(roomChannel);
        }
        return;
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

    // Create a unique channel ID for this user
    const userChannel = `match_${userId}_${Date.now()}`;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    // Helper to clean up polling
    const cleanupPolling = () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    try {
      // STEP 1: Check if there's anyone in the queue to match with
      let query = supabase
        .from("waiting_queue")
        .select("*")
        .neq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (interests.length > 0) {
        query = query.overlaps("interests", interests);
      }

      const { data: waitingUsers, error } = await query;

      if (error) {
        console.error("Error checking queue:", error);
        await simulateMatch();
        return;
      }

      // Helper to attempt matching with a partner
      const attemptMatch = async (partner: {
        id: string;
        user_id: string;
        socket_channel_id: string;
      }): Promise<boolean> => {
        const roomId = generateRoomId();

        // Atomically delete the partner from queue (claim them)
        const { data: deletedRows, error: deleteError } = await supabase
          .from("waiting_queue")
          .delete()
          .eq("id", partner.id)
          .select();

        if (deleteError || !deletedRows || deletedRows.length === 0) {
          console.log("Partner already claimed:", partner.user_id);
          return false;
        }

        // Record the match in active_rooms for the partner to find via polling
        const { error: roomError } = await supabase
          .from("active_rooms")
          .insert({
            room_id: roomId,
            user1_id: userId,
            user2_id: partner.user_id,
          });

        if (roomError) {
          console.warn("Failed to create room record:", roomError);
          // Continue anyway - realtime notification might work
        }

        // Best-effort realtime notification (non-blocking)
        try {
          const partnerChannel = supabase.channel(partner.socket_channel_id);
          partnerChannel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await partnerChannel.send({
                type: "broadcast",
                event: "matched",
                payload: { roomId, partnerId: userId } as MatchResult,
              });
              setTimeout(() => supabase.removeChannel(partnerChannel), 1000);
            }
          });
        } catch (e) {
          console.log("Realtime notification failed (partner will poll):", e);
        }

        // Handle our side of the match
        await handleMatch({ roomId, partnerId: partner.user_id });
        return true;
      };

      // Try to match with someone already in queue
      if (waitingUsers && waitingUsers.length > 0) {
        if (await attemptMatch(waitingUsers[0])) {
          return;
        }
      }

      // Try without interests filter if we had interests
      if (interests.length > 0) {
        const { data: anyUsers, error: anyError } = await supabase
          .from("waiting_queue")
          .select("*")
          .neq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (!anyError && anyUsers && anyUsers.length > 0) {
          if (await attemptMatch(anyUsers[0])) {
            return;
          }
        }
      }

      // STEP 2: No match found - join queue and wait for someone to find us
      const { error: insertError } = await supabase
        .from("waiting_queue")
        .insert({
          user_id: userId,
          socket_channel_id: userChannel,
          interests: interests,
        });

      if (insertError) {
        console.error("Error joining queue:", insertError);
        await simulateMatch();
        return;
      }

      console.log("Joined queue, waiting for match...");

      // Set up realtime listener (best effort, not required)
      const matchChannel = supabase.channel(userChannel, {
        config: { broadcast: { self: false } },
      });

      matchChannel.on("broadcast", { event: "matched" }, (payload) => {
        if (get().status !== "searching") return;
        cleanupPolling();
        const matchData = payload.payload as MatchResult;
        console.log("Matched via realtime:", matchData.roomId);
        handleMatch(matchData);
      });

      // Don't wait for subscription - just start it
      matchChannel.subscribe((status) => {
        console.log("Match channel status:", status);
      });
      set({ matchChannel });

      // STEP 3: Poll active_rooms for our match (reliable fallback)
      // This catches matches when realtime fails
      pollIntervalId = setInterval(async () => {
        if (get().status !== "searching") {
          cleanupPolling();
          return;
        }

        try {
          // Check if we've been matched (we'd be user2 in the room)
          const { data: room } = await supabase
            .from("active_rooms")
            .select("room_id, user1_id")
            .eq("user2_id", userId)
            .is("ended_at", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (room) {
            console.log("Found match via polling:", room.room_id);
            cleanupPolling();

            // Remove ourselves from queue if still there
            await supabase.from("waiting_queue").delete().eq("user_id", userId);

            // Handle the match
            await handleMatch({
              roomId: room.room_id,
              partnerId: room.user1_id,
            });
          }
        } catch (e) {
          // Single row not found is expected, ignore
        }
      }, 1500); // Poll every 1.5 seconds

      // Timeout after 60 seconds
      timeoutId = setTimeout(async () => {
        cleanupPolling();
        if (get().status === "searching") {
          console.log("Match timeout after 60s");
          await supabase.from("waiting_queue").delete().eq("user_id", userId);
          await simulateMatch();
        }
      }, 60000);
    } catch (err) {
      console.error("Error in findMatch:", err);
      cleanupPolling();
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
      return {
        success: false,
        error: "Message contains inappropriate content",
      };
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
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            text: replyingTo.text,
            sender: replyingTo.sender,
          }
        : undefined,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
      isTyping: false,
      replyingTo: null, // Clear reply after sending
    }));

    // Broadcast to room
    if (roomChannel) {
      roomChannel.send({
        type: "broadcast",
        event: "message",
        payload: {
          text: trimmedText,
          senderId: userId,
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                text: replyingTo.text,
                sender: replyingTo.sender === "me" ? "stranger" : "me", // Flip for receiver
              }
            : undefined,
        },
      });
    }

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
    const { roomChannel, matchChannel, userId, roomId, skipCount } = state;

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
      } catch (e) {
        console.log("Error during disconnect:", e);
      }
    }

    // Mark room as ended in database
    if (!isDemoMode && roomId) {
      try {
        await supabase
          .from("active_rooms")
          .update({ ended_at: new Date().toISOString() })
          .eq("room_id", roomId);
      } catch (e) {
        console.log("Error marking room as ended:", e);
      }
    }

    // Remove from queue if still there (only if not in demo mode)
    if (!isDemoMode) {
      try {
        await supabase.from("waiting_queue").delete().eq("user_id", userId);
      } catch (e) {
        console.log("Error removing from queue:", e);
      }
    }

    // Clean up match channel
    if (matchChannel) {
      try {
        await supabase.removeChannel(matchChannel);
      } catch (e) {
        console.log("Error removing match channel:", e);
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

    if (roomChannel) {
      roomChannel.send({
        type: "broadcast",
        event: "typing",
        payload: { senderId: userId, isTyping },
      });
    }
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
      } catch (e) {
        console.log("Error submitting report:", e);
      }
    }

    // Disconnect after reporting
    await get().disconnect();
  },

  reset: async () => {
    const state = get();
    const { roomChannel, matchChannel, userId, roomId, status } = state;

    // Notify partner of disconnect if we're connected
    if (roomChannel && (status === "connected" || status === "disconnected")) {
      try {
        await roomChannel.send({
          type: "broadcast",
          event: "disconnect",
          payload: { senderId: userId },
        });
      } catch (e) {
        console.log("Error sending disconnect notification during reset:", e);
      }
    }

    // Clean up room channel
    if (roomChannel) {
      try {
        await supabase.removeChannel(roomChannel);
      } catch (e) {
        console.log("Error removing room channel during reset:", e);
      }
    }

    // Clean up match channel
    if (matchChannel) {
      try {
        await supabase.removeChannel(matchChannel);
      } catch (e) {
        console.log("Error removing match channel during reset:", e);
      }
    }

    // Mark room as ended
    if (!isDemoMode && roomId) {
      try {
        await supabase
          .from("active_rooms")
          .update({ ended_at: new Date().toISOString() })
          .eq("room_id", roomId);
      } catch (e) {
        console.log("Error marking room as ended during reset:", e);
      }
    }

    // Remove from queue if still there
    if (!isDemoMode && userId) {
      try {
        await supabase.from("waiting_queue").delete().eq("user_id", userId);
      } catch (e) {
        console.log("Error removing from queue during reset:", e);
      }
    }

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
      roomChannel: null,
      matchChannel: null,
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
