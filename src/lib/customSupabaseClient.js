import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaprywsyjqmqinyggsjt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcHJ5d3N5anFtcWlueWdnc2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTE4ODMsImV4cCI6MjA4MzI4Nzg4M30.KKpPxKkGM9eZiJCqYr2CAZXvRSaKudgq9woQFiFoRdM';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
