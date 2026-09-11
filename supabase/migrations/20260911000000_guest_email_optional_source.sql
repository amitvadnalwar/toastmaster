-- The guest check-in flow now mirrors the passwordless member flow: guests
-- enter Email, Full Name and Mobile Number — no QR scan, and no
-- "how did you find us?" source question. Add an email column, and let the
-- source column be absent (the CHECK still constrains any value that IS set;
-- Postgres CHECK constraints pass on NULL).

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.guests ALTER COLUMN source DROP NOT NULL;
