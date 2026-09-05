CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN('buyer','seller','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS listings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', price NUMERIC(14,2) NOT NULL CHECK(price>=0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','pending','approved','active','sold','rejected','archived')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS detail_requests (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
 buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, message TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending_payment',
 payment_status TEXT NOT NULL DEFAULT 'unpaid',
 amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
 mpesa_receipt TEXT,
 checkout_request_id TEXT,
 seller_response TEXT,
 rejection_reason TEXT,
 responded_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_seller_idx ON listings(seller_id);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check CHECK(status IN('draft','pending','approved','active','sold','rejected','archived'));

ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_payment';
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS seller_response TEXT;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS admin_response TEXT;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS response_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE detail_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE detail_requests DROP CONSTRAINT IF EXISTS detail_requests_status_check;
ALTER TABLE detail_requests ADD CONSTRAINT detail_requests_status_check CHECK(status IN('pending_payment','paid','pending_approval','approved','responded','rejected'));
ALTER TABLE detail_requests DROP CONSTRAINT IF EXISTS detail_requests_payment_status_check;
ALTER TABLE detail_requests ADD CONSTRAINT detail_requests_payment_status_check CHECK(payment_status IN('unpaid','pending','paid','failed'));
CREATE UNIQUE INDEX IF NOT EXISTS detail_requests_checkout_idx ON detail_requests(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS detail_requests_buyer_idx ON detail_requests(buyer_id,created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS name_locked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;


-- Latielle phone authentication and generic application records
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
-- A person may hold one buyer account and one seller account on the same phone.
-- Keep role as part of the account identity instead of globally unique phone numbers.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_role_unique_idx ON users(phone, role);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_docs JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_pin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subcounty TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;


CREATE TABLE IF NOT EXISTS uploads (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 filename TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 file_size INTEGER NOT NULL,
 is_private BOOLEAN NOT NULL DEFAULT false,
 data BYTEA NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS uploads_owner_idx ON uploads(owner_id);

CREATE TABLE IF NOT EXISTS otp_codes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), phone TEXT NOT NULL, code TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, consumed BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS entity_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), entity_name TEXT NOT NULL, data JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entity_records_name_idx ON entity_records(entity_name);
CREATE INDEX IF NOT EXISTS entity_records_data_idx ON entity_records USING GIN(data);

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE listings ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS mpesa_receipt TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_payment_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_payment_status_check CHECK(payment_status IN('unpaid','pending','paid','failed'));
CREATE UNIQUE INDEX IF NOT EXISTS listings_checkout_idx ON listings(checkout_request_id) WHERE checkout_request_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS pending_registrations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 phone TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'buyer' CHECK(role IN('buyer','seller','admin')),
 pin_hash TEXT NOT NULL,
 name TEXT NOT NULL DEFAULT '',
 merchant_request_id TEXT,
 checkout_request_id TEXT,
 amount NUMERIC(12,2) NOT NULL DEFAULT 100,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid','failed','expired')),
 mpesa_receipt TEXT,
 result_code INTEGER,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pending_registrations ADD COLUMN IF NOT EXISTS result_description TEXT;
ALTER TABLE pending_registrations DROP CONSTRAINT IF EXISTS pending_registrations_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS pending_registrations_phone_role_unique_idx ON pending_registrations(phone, role);
ALTER TABLE pending_registrations DROP CONSTRAINT IF EXISTS pending_registrations_role_check;
ALTER TABLE pending_registrations ADD CONSTRAINT pending_registrations_role_check CHECK(role IN('buyer','seller','admin'));
CREATE INDEX IF NOT EXISTS pending_reg_checkout_idx ON pending_registrations(checkout_request_id);


-- Browser Web Push subscriptions. One buyer can have multiple devices/browsers.
CREATE TABLE IF NOT EXISTS push_subscriptions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 endpoint TEXT NOT NULL UNIQUE,
 subscription JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
