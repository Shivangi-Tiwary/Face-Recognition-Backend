const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testSupabase() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key (first 20 chars):', process.env.SUPABASE_KEY?.substring(0, 20) + '...');
  
  try {
    // Test connection by listing buckets
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Supabase Error:', error);
      return;
    }
    
    console.log('✅ Supabase connected successfully!');
    console.log('📦 Available buckets:', data.map(b => b.name));
    
    // Check if 'faces' bucket exists
    const facesBucket = data.find(b => b.name === 'faces');
    if (facesBucket) {
      console.log('✅ "faces" bucket exists');
    } else {
      console.log('❌ "faces" bucket NOT found. Create it in Supabase dashboard!');
    }
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    if (err.message.includes('ENOTFOUND')) {
      console.error('   → DNS resolution failed. Check your SUPABASE_URL');
    }
  }
}

testSupabase();