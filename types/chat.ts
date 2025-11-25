export type ConnectionStatus =
  | "idle"
  | "searching"
  | "connected"
  | "disconnected";

export type MessageStatus = "sending" | "sent" | "read";

export interface Message {
  id: string;
  text: string;
  sender: "me" | "stranger";
  timestamp: number;
  status?: MessageStatus;
  replyTo?: {
    id: string;
    text: string;
    sender: "me" | "stranger";
  };
}

export interface QueueEntry {
  id: string;
  user_id: string;
  socket_channel_id: string;
  interests: string[];
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  bad_actor_id: string;
  reason: string;
  chat_log_snapshot: Message[];
  created_at: string;
}

export interface MatchResult {
  roomId: string;
  partnerId: string;
}
