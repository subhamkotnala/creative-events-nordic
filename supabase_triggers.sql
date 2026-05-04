-- 1. CLEANUP: Drop existing triggers and functions to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_update();

DROP FUNCTION IF EXISTS public.delete_user_by_admin(text);

-- 2. CREATE FUNCTION: Sync new users to the 'profiles' table
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, auth_id, role, joined_at)
  VALUES (
    gen_random_uuid(), 
    new.email, 
    new.id,
    'USER', -- Default role, verified vendors get updated to VENDOR
    now()
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE TRIGGER: Listen for new users on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. CREATE FUNCTION: Sync email updates from auth.users to profiles and applications
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  -- If email changes in auth.users, update it in profiles
  IF old.email <> new.email THEN
    UPDATE public.profiles SET email = new.email WHERE auth_id = new.id;
    UPDATE public.applications SET email = new.email WHERE auth_id = new.id;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CREATE TRIGGER: Listen for user updates on auth.users
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_update();


-- 6. CREATE FUNCTION: Allow admins to securely delete users completely (including auth.users)
-- This runs with admin privileges (SECURITY DEFINER)
-- and deletes the user from everywhere.
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id text)
RETURNS void AS $$
DECLARE
  caller_role text;
BEGIN
  -- Check if the user calling this function is an ADMIN
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid()::text;
  
  IF caller_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users';
  END IF;

  -- Delete from all related tables first
  DELETE FROM public.applications WHERE auth_id = target_user_id::uuid;
  DELETE FROM public.profiles WHERE auth_id = target_user_id::uuid;
  
  -- Finally, delete the user from auth.users securely
  DELETE FROM auth.users WHERE id = target_user_id::uuid;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER: Handle email confirmation
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS trigger AS $$
BEGIN
  IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
    UPDATE public.applications SET status = 'VERIFIED', verified = true WHERE auth_id = new.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_email_confirmation();
