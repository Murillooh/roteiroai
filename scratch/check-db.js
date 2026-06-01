const fetch = require('node-fetch');

const SUPABASE_URL = 'https://aozyeuhfqqnsrfkbrsre.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Pad-SAGpdApE85PEIU0ucw_BIfTK_7X';

async function checkTasks() {
  console.log('Querying all tasks in database...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Number of tasks returned (under RLS or generally):', data.length);
  if (Array.isArray(data)) {
    console.log('Sample tasks:');
    console.log(data.slice(0, 10));
  } else {
    console.log('Error/Response:', data);
  }
}

checkTasks();
