
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  village TEXT,
  land_size_acres NUMERIC,
  crops_of_interest TEXT[] DEFAULT '{}',
  goals TEXT[] DEFAULT '{}',
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- gardens
CREATE TABLE public.gardens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_sqm NUMERIC,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gardens TO authenticated;
GRANT ALL ON public.gardens TO service_role;
ALTER TABLE public.gardens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own gardens" ON public.gardens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- plots
CREATE TABLE public.plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garden_id UUID NOT NULL REFERENCES public.gardens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  planted_on DATE NOT NULL DEFAULT CURRENT_DATE,
  area_sqm NUMERIC,
  status TEXT NOT NULL DEFAULT 'growing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plots TO authenticated;
GRANT ALL ON public.plots TO service_role;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plots" ON public.plots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- garden_events
CREATE TABLE public.garden_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.garden_events TO authenticated;
GRANT ALL ON public.garden_events TO service_role;
ALTER TABLE public.garden_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own garden events" ON public.garden_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- diagnoses
CREATE TABLE public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  crop TEXT,
  disease TEXT,
  confidence NUMERIC,
  severity TEXT,
  treatment TEXT,
  prevention TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnoses TO authenticated;
GRANT ALL ON public.diagnoses TO service_role;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own diagnoses" ON public.diagnoses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- products (marketplace)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_seed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "browse products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own listing" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "update own listing" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "delete own listing" ON public.products FOR DELETE TO authenticated USING (auth.uid() = seller_id);

-- orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR ALL USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

-- order_items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  title TEXT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items" ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()));

-- wallet_transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet" ON public.wallet_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- consulting_requests
CREATE TABLE public.consulting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  crop TEXT,
  reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consulting_requests TO authenticated;
GRANT ALL ON public.consulting_requests TO service_role;
ALTER TABLE public.consulting_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own consults" ON public.consulting_requests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- learning modules (public read)
CREATE TABLE public.learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 5,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_modules TO authenticated;
GRANT ALL ON public.learning_modules TO service_role;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read modules" ON public.learning_modules FOR SELECT TO authenticated USING (true);

-- certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.learning_modules(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own certificates" ON public.certificates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- auto-create profile + starter wallet credit on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallet_transactions (user_id, kind, amount_cents, reason)
  VALUES (NEW.id, 'credit', 50000, 'Welcome grant');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- wallet balance helper
CREATE OR REPLACE FUNCTION public.wallet_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN kind = 'credit' THEN amount_cents
         WHEN kind IN ('debit','payout') THEN -amount_cents
         ELSE 0 END
  ), 0)::INTEGER
  FROM public.wallet_transactions WHERE user_id = _user_id;
$$;

-- crop-photos storage policies (private, per-user folder)
CREATE POLICY "own crop photos read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own crop photos insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own crop photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crop-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- seed marketplace products (curated catalog)
INSERT INTO public.products (title, category, description, price_cents, unit, stock, image_url, is_seed) VALUES
  ('Organic Ginger Seedlings (1kg)', 'Seeds', 'High-yield disease-resistant ginger rhizomes.', 24000, 'kg', 200, 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400', true),
  ('Tomato Seeds — Heirloom Mix', 'Seeds', 'Six heirloom tomato varieties for kitchen gardens.', 8000, 'pack', 500, 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=400', true),
  ('Neem Oil (500ml)', 'Inputs', 'Cold-pressed organic neem oil, all-purpose pest control.', 32000, 'bottle', 120, 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=400', true),
  ('Vermicompost (10kg)', 'Inputs', 'Rich earthworm compost, boosts soil biology.', 18000, 'bag', 300, 'https://images.unsplash.com/photo-1585687433492-9fcd53c14cbf?w=400', true),
  ('Drip Irrigation Starter Kit', 'Tools', 'Covers 100 sqm; includes emitters, tubing, filter.', 145000, 'kit', 40, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', true),
  ('Hand Trowel & Weeder Set', 'Tools', 'Stainless steel gardening essentials.', 42000, 'set', 80, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', true),
  ('Panchagavya Bio-stimulant (1L)', 'Inputs', 'Traditional bio-stimulant blend for stronger crops.', 22000, 'bottle', 90, 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400', true),
  ('Chilli Seeds — Guntur Sannam', 'Seeds', 'Popular high-pungency chilli variety.', 6000, 'pack', 400, 'https://images.unsplash.com/photo-1583119912267-cc97c911e416?w=400', true),
  ('Turmeric Rhizomes (1kg)', 'Seeds', 'Certified curcumin-rich turmeric seed rhizomes.', 28000, 'kg', 150, 'https://images.unsplash.com/photo-1615485500704-8e990f9f4bc0?w=400', true),
  ('Rain Gauge', 'Tools', 'Simple analog rain gauge for the farm.', 12000, 'unit', 60, 'https://images.unsplash.com/photo-1504457047772-27faf1c00561?w=400', true),
  ('Mulching Sheet (50m)', 'Inputs', 'Biodegradable weed-suppressing mulch film.', 95000, 'roll', 25, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', true),
  ('Jaivik Bharat Marketplace Fee — Waived', 'Promotion', 'Zero-fee listing for smallholder farmers this season.', 0, 'promo', 999, 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=400', true);

-- seed learning modules
INSERT INTO public.learning_modules (title, summary, duration_min, body) VALUES
  ('Introduction to Natural Farming',
   'The four pillars: Jeevamrit, mulching, mixed cropping, indigenous seeds.',
   5,
   'Natural farming builds soil biology rather than replacing it. Start with (1) Jeevamrit fermented cow-based tonic, (2) constant mulch cover, (3) mixed cropping to break pest cycles, (4) local seed varieties that already tolerate your climate. Practice all four together — they reinforce each other.'),
  ('AI Crop Doctor — Reading a Diagnosis',
   'How to act on a photo diagnosis, and when to escalate to a human consultant.',
   4,
   'A high-confidence diagnosis (>80%) with mild severity: apply the suggested organic treatment and re-photograph after 5 days. Moderate severity or confidence 50–80%: request a consultation. Severe or below 50% confidence: get an expert to visit before acting.'),
  ('Selling on the Marketplace',
   'Pricing, quality grading, and payout basics for your first sale.',
   6,
   'Price at 10–15% below the mandi rate to move stock fast in the first month. Grade produce into A/B/C — mixing grades lowers your rating. Payouts land in your wallet on order delivery; request payout when balance exceeds ₹1000 to save on transfer costs.');
