import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAdminOnlyCorsHeaders, authenticateUser } from '../_shared/cors.ts';
import { DatabaseRateLimiter } from '../_shared/rate-limiter.ts';

export default async function handler(req: Request) {
  const corsHeaders = getAdminOnlyCorsHeaders(req.headers.get('Origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user using secure helper
    const { user, error: authError, supabase } = await authenticateUser(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError || 'Authentication failed' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check rate limit for sensitive operations
    const rateLimitResult = await DatabaseRateLimiter.checkLimit(user.id, 'suno');
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter 
      }), { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create admin client for privileged operations
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the project ID from the request body.
    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call the PostgreSQL function to perform the secure, transactional delete.
    const { error: rpcError } = await adminSupabase.rpc(
      'delete_project_and_children',
      {
        p_project_id: projectId,
        p_user_id: user.id // Pass the user's ID for the ownership check inside the function.
      }
    );

    if (rpcError) {
      console.error('Error deleting project:', rpcError);
      return new Response(JSON.stringify({ error: 'Failed to delete project', details: rpcError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, message: 'Project and its related data deleted successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in delete-project function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
