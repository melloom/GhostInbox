-- Add customization fields to vent_links table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.vent_links
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS background_color TEXT,
ADD COLUMN IF NOT EXISTS background_image_url TEXT,
ADD COLUMN IF NOT EXISTS accent_color TEXT,
ADD COLUMN IF NOT EXISTS custom_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS header_text TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.vent_links.logo_url IS 'URL to the logo image to display on the vent page';
COMMENT ON COLUMN public.vent_links.background_color IS 'Background color for the vent page (hex color code)';
COMMENT ON COLUMN public.vent_links.background_image_url IS 'URL to background image for the vent page';
COMMENT ON COLUMN public.vent_links.accent_color IS 'Accent color for buttons and highlights (hex color code)';
COMMENT ON COLUMN public.vent_links.custom_links IS 'Array of custom links to display on the vent page: [{"label": "string", "url": "string", "icon": "string"}]';
COMMENT ON COLUMN public.vent_links.header_text IS 'Custom header text displayed at the top of the vent page';
COMMENT ON COLUMN public.vent_links.description IS 'Custom description text for the vent page';

