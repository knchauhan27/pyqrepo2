// Supabase Configuration
// Replace these with your actual Supabase project URL and API key
// Get these from: https://app.supabase.com/project/[YOUR_PROJECT]/api?page=urls

const SUPABASE_URL = "https://qrznpipmgfwqdcomfcsu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_a9GXmG4WEL30ob5mXFaCiw_FpiicsBD";

// Initialize Supabase Client
const { createClient } = window.supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
