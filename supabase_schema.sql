-- =============================================================
-- NexaChat Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar TEXT DEFAULT './avatar.png',
  blocked UUID[] DEFAULT '{}'::UUID[]
);

-- 2. CHATS TABLE  (stores messages, sharedPhotos, sharedFiles as JSONB)
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  messages JSONB DEFAULT '[]'::JSONB,
  shared_photos JSONB DEFAULT '[]'::JSONB,
  shared_files JSONB DEFAULT '[]'::JSONB
);

-- 3. USER_CHATS TABLE  (mirrors Firebase userchats — one row per user, chats as JSONB array)
CREATE TABLE IF NOT EXISTS public.user_chats (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  chats JSONB DEFAULT '[]'::JSONB
);

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chats ENABLE ROW LEVEL SECURITY;

-- users: anyone authenticated can read, users manage their own row
CREATE POLICY "Users can read all profiles" ON public.users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- chats: any authenticated user can CRUD (chat access is controlled in app logic)
CREATE POLICY "Authenticated users can read chats" ON public.chats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert chats" ON public.chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update chats" ON public.chats
  FOR UPDATE USING (auth.role() = 'authenticated');

-- user_chats: any authenticated user can CRUD
CREATE POLICY "Authenticated users can read user_chats" ON public.user_chats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert user_chats" ON public.user_chats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update user_chats" ON public.user_chats
  FOR UPDATE USING (auth.role() = 'authenticated');

-- =============================================================
-- REALTIME (for live chat updates)
-- =============================================================

ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.user_chats REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chats;

-- =============================================================
-- STORAGE BUCKET  (for image/file uploads)
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access on chat-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload to chat-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from chat-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');
