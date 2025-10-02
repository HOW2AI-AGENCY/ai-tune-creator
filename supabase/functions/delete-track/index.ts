import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { getAdminOnlyCorsHeaders, authenticateUser } from '../_shared/cors.ts';
import { DatabaseRateLimiter } from '../_shared/rate-limiter.ts';

export default async function handler(req: Request) {
  console.log('Delete track function called');
  
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

    const { trackId, softDelete = true } = await req.json();

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Track ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Deleting track');

    // Call the comprehensive delete function
    const { data: deleteResult, error: deleteError } = await adminSupabase.rpc(
      'delete_track_completely',
      {
        p_track_id: trackId,
        p_user_id: user.id,
        p_hard_delete: !softDelete
      }
    );

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete track',
          details: deleteError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!deleteResult?.success) {
      return new Response(
        JSON.stringify({ 
          error: deleteResult?.error || 'Delete operation failed' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Track deleted successfully:', deleteResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Track ${softDelete ? 'moved to trash' : 'permanently deleted'}`,
        result: deleteResult
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in delete-track function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}