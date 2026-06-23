ALTER TABLE session_tokens
  ADD COLUMN stripe_checkout_session_id VARCHAR(255) UNIQUE,
  ADD COLUMN jwt_token TEXT;
