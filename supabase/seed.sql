-- =========================================================
-- NutriBlend — Supabase Seed Data
-- File: supabase/seed.sql
-- =========================================================

-- =========================================================
-- Seed Products
-- =========================================================
insert into public.products (
  name,
  protein,
  price,
  category,
  description,
  image,
  ingredients,
  benefits,
  calories,
  quantity,
  stock_status,
  is_active
)
values
(
  '10g Natural Shake',
  '10g',
  59,
  'Natural',
  'Budget-friendly natural protein shake for students and beginners.',
  '/products/10gNatural.webp',
  '[{"name":"Milk","qty":"250ml"},{"name":"Banana","qty":"1"},{"name":"Peanut Butter","qty":"1 tsp"}]'::jsonb,
  '["Budget friendly","Good for beginners","Easy daily protein"]'::jsonb,
  '250 kcal',
  '300ml',
  'In Stock',
  true
),
(
  '20g Natural Shake',
  '20g',
  99,
  'Natural',
  'Fresh banana peanut butter natural shake with extra protein.',
  '/products/20gNaturalShake.webp',
  '[{"name":"Milk","qty":"300ml"},{"name":"Banana","qty":"1"},{"name":"Peanut Butter","qty":"1.5 tsp"},{"name":"Oats","qty":"15g"}]'::jsonb,
  '["100% natural ingredients","Rich in fiber","High energy base"]'::jsonb,
  '380 kcal',
  '350ml',
  'In Stock',
  true
),
(
  '20g Whey Shake',
  '20g',
  119,
  'Whey',
  'Pure whey isolate shake with balanced nutrients for daily workout recovery.',
  '/products/20gWhey.webp',
  '[{"name":"Water/Milk","qty":"250ml"},{"name":"Whey Isolate","qty":"1 scoop"},{"name":"Cocoa","qty":"1 tsp"}]'::jsonb,
  '["Fast absorption","Post-workout recovery","Lean muscle support"]'::jsonb,
  '180 kcal',
  '300ml',
  'In Stock',
  true
),
(
  '30g Natural Shake',
  '30g',
  139,
  'Natural',
  'Heavy natural shake with double peanut butter and high natural protein.',
  '/products/30gNatural.webp',
  '[{"name":"Soy Milk","qty":"300ml"},{"name":"Soya Chunks Powder","qty":"20g"},{"name":"Peanut Butter","qty":"2 tbsp"},{"name":"Almonds","qty":"5 pcs"}]'::jsonb,
  '["Dairy free option","High calorie bulking","Rich in healthy fats"]'::jsonb,
  '520 kcal',
  '400ml',
  'In Stock',
  true
),
(
  '30g Whey Shake',
  '30g',
  149,
  'Whey',
  'High-protein whey shake with added oats for sustained energy release.',
  '/products/30gWhey.webp',
  '[{"name":"Milk","qty":"300ml"},{"name":"Whey","qty":"1.2 scoop"},{"name":"Oats","qty":"20g"}]'::jsonb,
  '["Muscle recovery","High protein","Gym friendly"]'::jsonb,
  '360 kcal',
  '350ml',
  'In Stock',
  true
),
(
  '40g Protein Shake',
  '40g',
  279,
  'Premium',
  'Premium high-protein shake for bulking, recovery, and serious gym users.',
  '/products/40gProShake.webp',
  '[{"name":"Milk","qty":"250ml"},{"name":"Whey Protein","qty":"1 scoop"},{"name":"Peanut Butter","qty":"1 tbsp"},{"name":"Oats","qty":"20g"},{"name":"Almonds","qty":"5 pcs"}]'::jsonb,
  '["40g protein","Whey plus natural ingredients","Good for bulking","Strong post-workout option"]'::jsonb,
  '500-650 kcal',
  '350ml',
  'In Stock',
  true
),
(
  '50g Protein Shake',
  '50g',
  329,
  'Premium',
  'Heavy premium protein shake for high-calorie bulking and intense training routines.',
  '/products/50gPro.webp',
  '[{"name":"Milk","qty":"300ml"},{"name":"Whey Protein","qty":"1.5 scoop"},{"name":"Peanut Butter","qty":"1.5 tbsp"},{"name":"Oats","qty":"20g"},{"name":"Almonds","qty":"5 pcs"}]'::jsonb,
  '["50g protein","Premium gym option","Best for bulking","Strong calorie and protein support"]'::jsonb,
  '650-800 kcal',
  '400ml',
  'In Stock',
  true
),
(
  'Basic Pre-Workout',
  'Energy',
  69,
  'Preworkout',
  'Watermelon and L-Citrulline basic pre-workout shake.',
  '/products/BasicPre.webp',
  '[{"name":"Water","qty":"250ml"},{"name":"Watermelon juice","qty":"50ml"},{"name":"Caffeine","qty":"150mg"},{"name":"L-Citrulline","qty":"2g"}]'::jsonb,
  '["Increased energy","Better blood flow","Focus booster"]'::jsonb,
  '45 kcal',
  '300ml',
  'In Stock',
  true
)
on conflict do nothing;

-- =========================================================
-- Seed Plans
-- =========================================================
insert into public.plans (
  name,
  price,
  duration,
  protein,
  category,
  description,
  image,
  includes,
  features,
  is_active
)
values
(
  'Weekly Natural Shake Plan',
  499,
  '6 Days',
  '10g - 15g Protein',
  'Subscription',
  'Budget-friendly weekly plan for students and daily protein users.',
  '🥤',
  '["1 natural shake per day", "Banana / oats / peanut butter base", "Budget-friendly daily nutrition", "Morning or evening delivery option"]'::jsonb,
  '["Good for hostelers", "Daily protein support", "Affordable"]'::jsonb,
  true
),
(
  'Weekly Whey Shake Plan',
  699,
  '6 Days',
  '20g Protein',
  'Subscription',
  'Most popular weekly whey shake plan for workout consistency.',
  '💪',
  '["1 whey shake per day", "20g protein serving", "Good for daily protein intake", "Suitable for post-workout"]'::jsonb,
  '["Gym beginners", "Busy students", "Sustained muscle recovery"]'::jsonb,
  true
),
(
  'Monthly Natural Shake Plan',
  1899,
  '26 Days',
  '10g - 15g Protein',
  'Subscription',
  'Affordable monthly plan of natural protein shakes for continuous nutrition.',
  '🌿',
  '["26 natural shakes", "Affordable monthly plan", "Natural ingredients", "Good for daily energy"]'::jsonb,
  '["Daily protein consistency", "Natural fuel", "Budget choice"]'::jsonb,
  true
),
(
  'Monthly Whey Shake Plan',
  2499,
  '26 Days',
  '20g Protein',
  'Subscription',
  'Premium whey subscription plan for fitness enthusiasts and regular gym users.',
  '🏋️',
  '["26 whey shakes", "20g protein per shake", "Good for muscle recovery", "Monthly consistency plan"]'::jsonb,
  '["Best value", "Muscle support", "Sustained training results"]'::jsonb,
  true
),
(
  'Pre-Workout Combo Plan',
  899,
  '12 Servings',
  'Energy + Pump',
  'Subscription',
  'Pre-workout fuel plan to boost muscle pump and training performance.',
  '⚡',
  '["Coffee based pre-workout", "Beetroot / lemon / honey options", "Electrolyte support", "Best before workout"]'::jsonb,
  '["Energy boost", "Performance focus", "Electrolyte hydration"]'::jsonb,
  true
),
(
  'Premium Gym Plan',
  3499,
  '26 Days',
  '30g - 50g Protein',
  'Subscription',
  'Ultimate high-protein plan for bodybuilders, athletes, and intense bulking.',
  '🔥',
  '["High protein shake plan", "30g to 50g protein options", "Premium ingredients", "Best for bulking and competitions"]'::jsonb,
  '["Maximum recovery", "Bulking support", "Professional athlete standard"]'::jsonb,
  true
)
on conflict do nothing;
