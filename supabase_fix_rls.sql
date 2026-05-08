-- Fix 1: Allow public reads on users table (needed for username uniqueness check before auth)
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;
CREATE POLICY "Anyone can read user profiles" ON public.users
  FOR SELECT USING (true);
