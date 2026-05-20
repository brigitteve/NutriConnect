-- Alter the app_role enum type to add 'admin' if it doesn't exist
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
