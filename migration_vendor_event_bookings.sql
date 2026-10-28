-- Migration: Vendor Event Bookings & Booth Administration
CREATE TABLE IF NOT EXISTS vendor_event_bookings (
  id text PRIMARY KEY,
  booking_ref text UNIQUE NOT NULL,
  event_id text NOT NULL,
  event_title text NOT NULL,
  event_date text NOT NULL,
  event_city text NOT NULL,
  event_location text NOT NULL,

  vendor_id text,
  user_id text,
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  category text NOT NULL,
  website text,
  socials text,

  booth_package_id text NOT NULL,
  booth_package_name text NOT NULL,
  price numeric DEFAULT 0,
  currency text DEFAULT 'SEK',

  power_needed boolean DEFAULT true,
  power_type text DEFAULT 'standard_230v',
  tables_count integer DEFAULT 1,
  chairs_count integer DEFAULT 2,
  staff_count integer DEFAULT 2,
  special_requests text,
  showcase_pitch text,

  status text DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'CONFIRMED', 'WAITLIST', 'REJECTED', 'CANCELLED'
  payment_status text DEFAULT 'UNPAID', -- 'UNPAID', 'DEPOSIT_PAID', 'PAID_IN_FULL', 'REFUNDED'
  assigned_booth text DEFAULT '',
  admin_notes text DEFAULT '',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE vendor_event_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view vendor bookings" ON vendor_event_bookings;
CREATE POLICY "Public can view vendor bookings" ON vendor_event_bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert vendor bookings" ON vendor_event_bookings;
CREATE POLICY "Anyone can insert vendor bookings" ON vendor_event_bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update vendor bookings" ON vendor_event_bookings;
CREATE POLICY "Anyone can update vendor bookings" ON vendor_event_bookings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete vendor bookings" ON vendor_event_bookings;
CREATE POLICY "Anyone can delete vendor bookings" ON vendor_event_bookings FOR DELETE USING (true);
