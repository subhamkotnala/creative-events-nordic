-- Migration: Create organized_events table for events curated and organized by Creative Events
CREATE TABLE IF NOT EXISTS organized_events (
  id text PRIMARY KEY,
  title text NOT NULL,
  tagline text,
  description text NOT NULL,
  category text NOT NULL,
  start_date text NOT NULL,
  end_date text,
  time text,
  location_name text NOT NULL,
  city text NOT NULL,
  address text,
  image_url text NOT NULL,
  gallery_urls text[] DEFAULT '{}'::text[],
  price text DEFAULT 'Free Entry',
  capacity text,
  ticket_url text,
  registration_email text DEFAULT 'sandy@creativeventsnordic.com',
  registration_phone text,
  highlights text[] DEFAULT '{}'::text[],
  organizer text DEFAULT 'Creative Events Nordic',
  is_featured boolean DEFAULT true,
  status text DEFAULT 'UPCOMING', -- 'UPCOMING', 'ONGOING', 'COMPLETED', 'SOLD_OUT'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE organized_events ENABLE ROW LEVEL SECURITY;

-- Public can read all organized events
DROP POLICY IF EXISTS "Public organized events are viewable by everyone" ON organized_events;
CREATE POLICY "Public organized events are viewable by everyone" ON organized_events FOR SELECT USING (true);

-- Authenticated or public insert/update/delete (admins or managed through application)
DROP POLICY IF EXISTS "Enable insert for organized_events" ON organized_events;
CREATE POLICY "Enable insert for organized_events" ON organized_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for organized_events" ON organized_events;
CREATE POLICY "Enable update for organized_events" ON organized_events FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for organized_events" ON organized_events;
CREATE POLICY "Enable delete for organized_events" ON organized_events FOR DELETE USING (true);

-- Seed initial organized events
INSERT INTO organized_events (
  id, title, tagline, description, category, start_date, end_date, time,
  location_name, city, address, image_url, price, capacity,
  highlights, organizer, is_featured, status
) VALUES 
(
  'ce-event-1',
  'Nordic Grand Wedding & Bridal Showcase 2026',
  'Sweden''s premier gathering of luxury bridal designers, florist masters, caterers, and photographers.',
  'Join us for the pinnacle wedding planning event of the season curated exclusively by Creative Events Nordic. Explore breathtaking tablescape displays, meet verified photographers, sample bespoke wedding cakes, and experience our 14:00 bridal runway show with Scandinavia''s most acclaimed wedding houses.',
  'Bridal & Wedding Fair',
  '2026-11-14',
  '2026-11-14',
  '11:00 - 18:00',
  'Münchenbryggeriet Event Hall',
  'Stockholm',
  'Torkel Knutssonsgatan 2, 118 25 Stockholm',
  'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
  'Free Registration',
  '600 Attendees',
  ARRAY['Over 50 curated Nordic wedding specialists', 'Runway Fashion Showcase at 14:00', 'Complimentary sparkling wine tasting', 'Exclusive booking discounts and prize giveaways'],
  'Creative Events Nordic',
  true,
  'UPCOMING'
),
(
  'ce-event-2',
  'Stockholm Waterfront Food & Culture Festival',
  'A celebration of Nordic gastronomy, artisanal street food, craft mixology, and acoustic live stages.',
  'Creative Events brings together Stockholm''s finest caterers, food trucks, craft microbrewers, and artisan dessert creators for an unforgettable weekend by the water. Featuring interactive culinary masterclasses, acoustic sunset sessions, and activities for families.',
  'Festival & Culinary',
  '2026-12-05',
  '2026-12-06',
  '12:00 - 22:00',
  'Skeppsholmen Waterfront Grounds',
  'Stockholm',
  'Slupskjulsvägen 26, 111 49 Stockholm',
  'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
  '150 SEK (Kids under 12 Free)',
  '1200 Attendees',
  ARRAY['25+ Award-winning culinary stations', 'Live DJ sets & sunset waterfront lounge', 'Interactive cocktail & barista masterclasses', 'Family entertainment & games zone'],
  'Creative Events Nordic',
  true,
  'UPCOMING'
),
(
  'ce-event-3',
  'Nordic Event Industry Leadership & Vendor Gala',
  'Annual gala and networking summit honoring vendor excellence, sustainability, and collaborative growth.',
  'An exclusive black-tie gala hosted by Creative Events Nordic, celebrating the vendors, planners, and creatives who transform events across Sweden. The evening includes a seated 3-course dinner, vendor awards, panel discussions on event trends, and high-energy networking.',
  'Networking & Gala',
  '2027-01-22',
  '2027-01-22',
  '18:30 - 23:30',
  'Clarion Hotel Post Grand Ballroom',
  'Gothenburg',
  'Drottningtorget 10, 411 03 Göteborg',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
  '350 SEK',
  '350 Attendees',
  ARRAY['Keynotes on 2027 Event Design & Green Staging', 'Nordic Vendor of the Year Awards', 'Three-course Nordic banquet with wine pairing', 'Live swing & soul band afterparty'],
  'Creative Events Nordic',
  true,
  'UPCOMING'
),
(
  'ce-event-4',
  'Malmö Creative Pop-Up Market & Design Fair',
  'A vibrant indoor market showcasing indie florists, rental stylists, bakers, and sound engineers.',
  'Discover fresh event concepts and hire local indie talent directly. Creative Events transforms Lokstallarna into an immersive bazaar of creative table settings, photo installations, bespoke invitations, and live lighting demonstrations.',
  'Market & Fair',
  '2027-02-14',
  '2027-02-14',
  '10:00 - 17:00',
  'Lokstallarna i Kirseberg',
  'Malmö',
  'Södra Bulltoftavägen 51, 212 22 Malmö',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
  'Free Entry',
  '800 Attendees',
  ARRAY['40+ Boutique creators & rental specialists', 'Live floral arrangement and balloon styling workshops', 'Valentine photo installation stations', 'Local bakery & specialty coffee bar'],
  'Creative Events Nordic',
  false,
  'UPCOMING'
)
ON CONFLICT (id) DO NOTHING;
