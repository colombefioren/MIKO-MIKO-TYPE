import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://gkomrzyikqlxwntsnmyz.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdrb21yenlpa3FseHdudHNubXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3MjA1OTEsImV4cCI6MjA2MDI5NjU5MX0.tHcTTK2RE8qhP1cht6Kzj0iAQLODF2hDrWQOc5qBMdk";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    redirectTo: window.location.origin + '/MIKO-MIKO-TYPE/index.html',
    detectSessionInUrl: true
  }
});

//.env didnt work for our project unfortunately, our js are mostly client side
