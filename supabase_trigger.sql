-- Auto-create user profile & user_chats row when a new auth user signs up
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar, blocked)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar', './avatar.png'),
    '{}'::UUID[]
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_chats (user_id, chats)
  VALUES (NEW.id, '[]'::JSONB)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
