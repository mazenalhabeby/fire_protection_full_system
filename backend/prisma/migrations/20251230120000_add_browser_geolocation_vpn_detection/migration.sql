-- Add browser geolocation fields for GPS-based location (more accurate than IP)
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserLatitude" DOUBLE PRECISION;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserLongitude" DOUBLE PRECISION;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserCity" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserCountry" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "browserAccuracy" DOUBLE PRECISION;

-- Add VPN/Proxy detection fields
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "isVpnDetected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "vpnDetectedAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "locationMismatch" BOOLEAN NOT NULL DEFAULT false;
