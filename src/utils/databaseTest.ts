import { supabase } from '../lib/supabase';

export async function testDatabaseConnectivity(): Promise<boolean> {
  console.log('🧪 Testing database connectivity...');
  
  try {
    // Very simple query to test connection - just get current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Database connectivity test failed:', error);
      return false;
    }
    
    console.log('✅ Database connectivity test passed, user:', user?.id || 'No user');
    return true;
  } catch (error) {
    console.error('❌ Database connectivity test error:', error);
    return false;
  }
}

export async function testAuthConnectivity(): Promise<boolean> {
  console.log('🧪 Testing auth connectivity...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth connectivity test failed:', error);
      return false;
    }
    
    console.log('✅ Auth connectivity test passed');
    return true;
  } catch (error) {
    console.error('❌ Auth connectivity test error:', error);
    return false;
  }
} 