# OpenChat

A modern, anonymous random chat platform. Connect instantly with strangers for text-based conversations — no accounts, no tracking, just conversation.

## Features

- **Anonymous Chat**: No accounts required. A random ID is generated and stored locally.
- **Instant Matching**: Find someone to chat with in seconds.
- **Real-time Messaging**: Messages appear instantly using Supabase Realtime.
- **Interest Matching**: Add interests to find like-minded people.
- **Dark Mode**: Beautiful dark theme by default.
- **Rate Limiting**: Prevents spam and bot abuse.
- **Profanity Filter**: Client-side content filtering.
- **Cross-Platform**: Works on web, iOS, and Android from a single codebase.

## Tech Stack

- **Frontend**: Expo (React Native) with Expo Router
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (Postgres + Realtime WebSockets)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Supabase account

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd open-chat
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up Supabase:

   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL from `supabase/schema.sql` in your Supabase SQL Editor
   - Enable Realtime for the `waiting_queue` table in Database > Replication

4. Configure environment variables:

   - Copy `.env.example` to `.env`
   - Add your Supabase URL and Anon Key:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. Start the development server:
   ```bash
   npm run web
   ```

### Running on Different Platforms

```bash
# Web
npm run web

# iOS (requires macOS and Xcode)
npm run ios

# Android (requires Android Studio)
npm run android
```

## Project Structure

```
open-chat/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Main chat screen
├── components/            # Reusable UI components
│   ├── ChatBubble.tsx    # Message bubble
│   ├── InputBar.tsx      # Message input
│   ├── ConnectionStatus.tsx
│   ├── NextButton.tsx
│   ├── InterestsInput.tsx
│   └── ScreenWrapper.tsx
├── lib/                   # Utilities
│   └── supabase.ts       # Supabase client
├── store/                 # State management
│   └── chatStore.ts      # Zustand store
├── supabase/             # Database
│   └── schema.sql        # SQL schema
└── types/                # TypeScript types
    └── chat.ts
```

## Future Roadmap

- **Phase 2**: Video chat integration with LiveKit
- **Phase 3**: Native mobile apps (iOS/Android) and premium features

## License

MIT
