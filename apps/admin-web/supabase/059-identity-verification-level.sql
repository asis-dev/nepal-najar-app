-- Add verification_level to user_identity_profile
-- Tracks how thoroughly the user's identity has been verified during onboarding.
-- 'phone' = phone OTP only, 'voice' = phone + voice fields, 'document' = phone + document scan

alter table user_identity_profile
  add column if not exists verification_level text
    default 'phone'
    check (verification_level in ('phone', 'voice', 'document', 'verified'));

-- Also add onboarding_completed_at to know when they finished
alter table user_identity_profile
  add column if not exists onboarding_completed_at timestamptz;

comment on column user_identity_profile.verification_level is
  'How the user identity was verified: phone (OTP only), voice (spoke details), document (scanned ID), verified (admin-confirmed)';
