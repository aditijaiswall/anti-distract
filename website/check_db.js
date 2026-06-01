import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jtnqrswupbjqobasrrjm.supabase.co';
// Get the service key from env to query profiles
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error("Please provide SUPABASE_SERVICE_ROLE_KEY in the environment");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    // .limit(10);

    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Profiles:");
        console.dir(data, { depth: null });
    }
}

check();
