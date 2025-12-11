-- Add handle change tracking to profiles table
-- Allows users to change their handle once after creation

-- Add column to track if handle has been changed
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS handle_changed BOOLEAN DEFAULT false;

-- Update existing profiles to have handle_changed = false (they haven't changed it yet)
UPDATE public.profiles 
SET handle_changed = false 
WHERE handle_changed IS NULL;

-- Set NOT NULL constraint after updating existing data
ALTER TABLE public.profiles 
  ALTER COLUMN handle_changed SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.handle_changed IS 'Tracks if the user has changed their handle. Users can only change their handle once.';

