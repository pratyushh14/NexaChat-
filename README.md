# 💬 NexaChat

**Live Demo:** [nexa-chat-seven.vercel.app](https://nexa-chat-seven.vercel.app/)

NexaChat is a premium real-time chat application built with **React** and **Supabase**, featuring an aurora-animated login experience, glassmorphism UI, real-time messaging, file sharing, and a full user management system.

---

## ✨ Features

- 🔐 **Authentication** – Secure login & signup with Supabase Auth
- 💬 **Real-time Messaging** – Instant chat powered by Supabase Realtime (WebSocket)
- 👥 **User Management** – Add, search, and manage contacts with duplicate & self-add prevention
- 📸 **Media Uploads** – Share images & files via Supabase Storage with type-aware previews
- 🎨 **Avatar System** – Gradient initial avatars (Discord/Google style) when no photo is set
- 🌌 **Aurora Login Page** – Canvas-based aurora animation with floating chat bubbles & grain texture
- 🌙 **Dark Glassmorphism UI** – Premium dark theme with smooth gradients and animations
- 😊 **Emoji Picker** – Full emoji support with click-to-insert
- 🚫 **Block System** – Block/unblock users with real-time state sync
- 📂 **File Previews** – Smart file cards with emoji icons per file type (PDF, Word, Excel, Zip, etc.)
- ⚡ **Responsive Design** – Works on desktop & mobile

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, JSX, CSS |
| **Backend / Database** | Supabase (PostgreSQL + Realtime) |
| **Authentication** | Supabase Auth |
| **File Storage** | Supabase Storage (`chat-images` bucket) |
| **State Management** | Zustand |
| **Styling** | Custom CSS — glassmorphism, gradients, animations |
| **Fonts** | Inter (app), Sora + DM Sans (login) |
| **Build Tool** | Vite |

---

## 🚀 Getting Started

### 1️⃣ Clone the repository
```bash
git clone https://github.com/pratyushh14/NexaChat-.git
cd NexaChat-
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Set up environment variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
> ⚠️ Never commit your `.env` file — it's already in `.gitignore`

### 4️⃣ Set up Supabase
Run the following SQL files in your Supabase SQL Editor **in order**:

1. `supabase_schema.sql` — Creates `users`, `chats`, `user_chats` tables
2. `supabase_trigger.sql` — Auto-creates user records on signup
3. `supabase_fix_rls.sql` — Row-level security policies
4. `supabase_storage_fix.sql` — Storage bucket policies for `chat-images`

### 5️⃣ Run locally
```bash
npm run dev
```

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Avatar.jsx          # Gradient initial avatar component
│   ├── chat/               # Chat panel (messages, file upload, emoji)
│   ├── detail/             # Contact detail panel (shared files, block)
│   ├── list/
│   │   ├── chatlist/       # Chat list + search + AddUser modal
│   │   └── userinfo/       # Logged-in user info bar
│   └── login/              # Aurora login/signup page
├── lib/
│   ├── supabase.js         # Supabase client
│   ├── chatStore.js        # Zustand — active chat state
│   ├── userStore.js        # Zustand — current user state
│   └── upload.js           # File upload to Supabase Storage
└── index.css               # Global styles & design tokens
```

---

## 🖼️ Screenshots

> Login Page — Aurora canvas animation with floating chat bubbles
<img width="1168" height="671" alt="image" src="https://github.com/user-attachments/assets/3032e1b6-f890-409b-83af-4423701348bc" />

> Chat Interface — WhatsApp-style header, glassmorphism bubbles, file previews
<img width="1202" height="686" alt="image" src="https://github.com/user-attachments/assets/2929b4cb-3a57-463f-8b34-688b215ff9b8" />

---

## 🔒 Security Notes

- Row-Level Security (RLS) is enabled on all Supabase tables
- Users can only read/write their own `user_chats` row
- Storage policies restrict uploads to authenticated users only
- Never expose your Supabase service role key on the frontend

---

## 📄 License

MIT © [Pratyush](https://github.com/pratyushh14)
