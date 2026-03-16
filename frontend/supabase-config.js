// Replace with your Supabase Project URL and anon key.
// You can find both in Supabase Dashboard -> Project Settings -> API.
window.SUPABASE_URL = "https://izfnlqkdhfzjioczkonz.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_J6fvPvkt5don3osUExCRJw_P6g2UBst";

window.getPowerzoneSupabaseClient = function getPowerzoneSupabaseClient() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        return null;
    }
    if (!window.__powerzoneSupabaseClient) {
        window.__powerzoneSupabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
    }
    return window.__powerzoneSupabaseClient;
};
