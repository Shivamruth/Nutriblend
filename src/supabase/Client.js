import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://sbohbzqbpsgcwfdtrkzw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNib2hienFicHNnY3dmZHRya3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMTkxMjcsImV4cCI6MjA5MTg5NTEyN30.DzO6d71fLRRy2xPN9YrMgCbllpOB2UZcIIz7ZRgusm4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);