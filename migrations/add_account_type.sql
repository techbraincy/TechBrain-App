-- Add account_type column to users table
-- Run this in the Supabase SQL editor

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type text
  CHECK (account_type IN ('caffe', 'restaurant'))
  DEFAULT NULL;

COMMENT ON COLUMN users.account_type IS
  'Restricts the user to a specific product view. NULL = full access.';
