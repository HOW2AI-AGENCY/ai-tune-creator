-- Create rate limiting table and functions for persistent rate limiting across function restarts
-- This addresses the critical issue of in-memory rate limiting that resets on function restarts

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('suno', 'mureka', 'openai')),
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint TEXT,
  request_ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_service_time 
ON api_rate_limits(user_id, service, request_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON api_rate_limits(created_at);

-- RPC function to check and update rate limits atomically
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_service TEXT,
  p_window_start TIMESTAMPTZ,
  p_max_requests INTEGER,
  p_window_ms INTEGER
) 
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  reset_time TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Count current requests in window
  SELECT COUNT(*) INTO current_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND service = p_service
    AND request_timestamp >= p_window_start;
  
  -- Calculate reset time
  reset_time := NOW() + (p_window_ms || ' milliseconds')::INTERVAL;
  
  -- Check if limit exceeded
  IF current_count >= p_max_requests THEN
    -- Find oldest request in window for accurate reset time
    SELECT request_timestamp + (p_window_ms || ' milliseconds')::INTERVAL INTO reset_time
    FROM api_rate_limits
    WHERE user_id = p_user_id
      AND service = p_service
      AND request_timestamp >= p_window_start
    ORDER BY request_timestamp ASC
    LIMIT 1;
    
    result := json_build_object(
      'allowed', false,
      'count', current_count,
      'reset_time', reset_time
    );
  ELSE
    -- Add new request record
    INSERT INTO api_rate_limits (user_id, service, request_timestamp)
    VALUES (p_user_id, p_service, NOW());
    
    current_count := current_count + 1;
    
    result := json_build_object(
      'allowed', true,
      'count', current_count,
      'reset_time', reset_time
    );
  END IF;
  
  RETURN result;
END;
$$;

-- RPC function to get rate limit status without incrementing
CREATE OR REPLACE FUNCTION get_rate_limit_status(
  p_user_id UUID,
  p_service TEXT,
  p_window_start TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  oldest_request TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Count and get oldest request in window
  SELECT 
    COUNT(*),
    MIN(request_timestamp)
  INTO current_count, oldest_request
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND service = p_service
    AND request_timestamp >= p_window_start;
    
  result := json_build_object(
    'count', COALESCE(current_count, 0),
    'oldest_request', oldest_request
  );
  
  RETURN result;
END;
$$;

-- RPC function to cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM api_rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- RPC function to reset rate limit for a user (admin function)
CREATE OR REPLACE FUNCTION reset_rate_limit(
  p_user_id UUID,
  p_service TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE user_id = p_user_id
    AND service = p_service;
  
  RETURN true;
END;
$$;

-- Enable RLS on the rate limits table
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only see their own rate limits
CREATE POLICY rate_limits_user_access ON api_rate_limits
  FOR ALL USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, DELETE ON api_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rate_limit_status(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO service_role;
GRANT EXECUTE ON FUNCTION reset_rate_limit(UUID, TEXT) TO service_role;

-- Create a scheduled cleanup job (if pg_cron is available)
-- This will run daily at 2 AM to clean up old rate limit records
-- Uncomment if pg_cron extension is enabled
-- SELECT cron.schedule('rate-limit-cleanup', '0 2 * * *', 'SELECT cleanup_rate_limits();');