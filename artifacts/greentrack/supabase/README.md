# Connect GreenTrack to Supabase

1. Create a Supabase project and open its SQL Editor.
2. Run `schema.sql` once. It creates the organization-scoped tables, row-level security policies, private `tree-images` bucket, account trigger, and demo records.
3. Add these shared Replit environment variables:
   - `VITE_SUPABASE_URL` — your Supabase project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` — the project's publishable (formerly anon) key. Never use a service-role key in the browser.
4. In Supabase Auth, set the allowed sign-in and redirect URLs to the GreenTrack preview and published app URLs. Email confirmation can remain enabled; users will be prompted to confirm before signing in.

The account trigger creates one organization and an administrator profile for each newly registered user, then adds clearly illustrative starter records: six species, four Bengaluru-area locations, 26 trees, maintenance entries, and related alerts. Existing empty organizations can be seeded with the commented `seed_greentrack_org` call in `seed.sql`.

Tree photos use the private `tree-images` bucket. Keep the generated storage policies from `schema.sql`; they restrict each file to its organization's folder and issue short-lived signed URLs for display and image analysis.

AI is optional. Without `OPENAI_API_KEY`, health-image analysis explicitly records that no diagnosis was made, survival output is labeled as an unvalidated rules-based estimate, and recommendations/chat use transparent rules or report insufficient data.
