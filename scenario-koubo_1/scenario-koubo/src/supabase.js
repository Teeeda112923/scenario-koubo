import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pvwqigsggasnmnfijhmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2d3FpZ3NnZ2Fzbm1uZmlqaG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTgxMzAsImV4cCI6MjA5NTE5NDEzMH0.G-gZH7BYid4upzuVS87bI6m447AkoKe5kTeD02vBZxQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
