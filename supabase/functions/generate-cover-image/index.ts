import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Basic in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30; // 30 requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Require authenticated user (Edge Functions have JWT verification enabled by default)
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const jwtPayload = token.split('.')[1]
    const userId = jwtPayload ? JSON.parse(atob(jwtPayload)).sub as string : undefined

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate limiting per user
    const now = Date.now()
    const rl = rateMap.get(userId)
    if (!rl || now > rl.reset) {
      rateMap.set(userId, { count: 1, reset: now + RATE_LIMIT_WINDOW })
    } else if (rl.count >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      rl.count++
    }

    const { prompt, projectId, style = 'artistic', type = 'cover' } = await req.json()

    if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Generating image with prompt:', prompt)

    // Create authed client for ownership checks using the caller's JWT
    const supabaseAuthed = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // If a project is provided, ensure the user can access it (RLS will enforce ownership)
    if (projectId) {
      const { data: projectRow, error: projectError } = await supabaseAuthed
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .maybeSingle()

      if (projectError) {
        console.error('Project ownership check error:', projectError)
        return new Response(JSON.stringify({ error: 'Project access check failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!projectRow) {
        return new Response(JSON.stringify({ error: 'Forbidden: no access to project' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Try FALAI first
    const falaiApiKey = Deno.env.get('FALAI_API_KEY')
    
    if (falaiApiKey) {
      try {
        console.log('Using FALAI for image generation')
        
        const falaiResponse = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${falaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: type === 'banner' ? 
              `Wide banner image: ${prompt}. Professional music cover art, cinematic style, 16:9 aspect ratio, high quality` : 
              `Album cover art: ${prompt}. Square format, artistic, professional music cover design`,
            image_size: type === 'banner' ? 'landscape_16_9' : 'square_hd',
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: true
          })
        })

        if (falaiResponse.ok) {
          const falaiData = await falaiResponse.json()
          console.log('FALAI response:', falaiData)
          
          if (falaiData.images && falaiData.images.length > 0) {
            const imageUrl = falaiData.images[0].url
            
            // Save to storage if projectId provided
            if (projectId && imageUrl) {
              const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
              )

              // Download and upload to Supabase storage under a namespaced path
              const imageResponse = await fetch(imageUrl)
              const imageBlob = await imageResponse.blob()
              const fileName = `projects/${projectId}/${type}-${Date.now()}.jpg`
              
              const { error: uploadError } = await supabaseAdmin.storage
                .from('project-covers')
                .upload(fileName, imageBlob, {
                  contentType: 'image/jpeg',
                  upsert: true
                })

              if (!uploadError) {
                // Prefer signed URL (works even if bucket becomes private later)
                const { data: signed, error: signErr } = await supabaseAdmin.storage
                  .from('project-covers')
                  .createSignedUrl(fileName, 60 * 60) // 1 hour
                
                const finalUrl = signErr ? imageUrl : signed?.signedUrl
                return new Response(
                  JSON.stringify({ 
                    imageUrl: finalUrl,
                    metadata: { 
                      provider: 'falai', 
                      model: 'flux-schnell',
                      prompt: prompt,
                      filePath: fileName
                    }
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
              }
            }
            
            return new Response(
              JSON.stringify({ 
                imageUrl: imageUrl,
                metadata: { 
                  provider: 'falai', 
                  model: 'flux-schnell',
                  prompt: prompt
                }
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (error) {
        console.error('FALAI error:', error)
      }
    }

    // Fallback to Leonardo AI
    const leonardoApiKey = Deno.env.get('LEONARDOAI_API_KEY')
    
    if (leonardoApiKey) {
      try {
        console.log('Using Leonardo AI for image generation')
        
        const leonardoResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${leonardoApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: type === 'banner' ? 
              `Wide banner image: ${prompt}. Professional music cover art, cinematic style, 16:9 aspect ratio, high quality` : 
              `Album cover art: ${prompt}. Square format, artistic, professional music cover design`,
            modelId: 'e316348f-7773-490e-adcd-46757c738eb7', // Leonardo Kino XL
            width: type === 'banner' ? 1792 : 1024,
            height: type === 'banner' ? 1008 : 1024,
            num_images: 1,
            guidance_scale: 7,
            num_inference_steps: 10
          })
        })

        if (leonardoResponse.ok) {
          const leonardoData = await leonardoResponse.json()
          console.log('Leonardo AI response:', leonardoData)
          
          if (leonardoData.sdGenerationJob?.generationId) {
            const generationId = leonardoData.sdGenerationJob.generationId
            
            // Poll for completion
            let attempts = 0
            const maxAttempts = 30
            
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000))
              
              const statusResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
                headers: {
                  'Authorization': `Bearer ${leonardoApiKey}`,
                }
              })
              
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                
                if (statusData.generations_by_pk?.status === 'COMPLETE' && 
                    statusData.generations_by_pk?.generated_images?.length > 0) {
                  
                  const imageUrl = statusData.generations_by_pk.generated_images[0].url
                  
                  // Save to storage if projectId provided
                  if (projectId && imageUrl) {
                    const supabaseAdmin = createClient(
                      Deno.env.get('SUPABASE_URL') ?? '',
                      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                    )

                    const imageResponse = await fetch(imageUrl)
                    const imageBlob = await imageResponse.blob()
                    const fileName = `projects/${projectId}/${type}-${Date.now()}.jpg`
                    
                    const { error: uploadError } = await supabaseAdmin.storage
                      .from('project-covers')
                      .upload(fileName, imageBlob, {
                        contentType: 'image/jpeg',
                        upsert: true
                      })

                    if (!uploadError) {
                      const { data: signed, error: signErr } = await supabaseAdmin.storage
                        .from('project-covers')
                        .createSignedUrl(fileName, 60 * 60)
                      
                      const finalUrl = signErr ? imageUrl : signed?.signedUrl
                      return new Response(
                        JSON.stringify({ 
                          imageUrl: finalUrl,
                          metadata: { 
                            provider: 'leonardo', 
                            model: 'kino-xl',
                            prompt: prompt,
                            filePath: fileName
                          }
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                      )
                    }
                  }
                  
                  return new Response(
                    JSON.stringify({ 
                      imageUrl: imageUrl,
                      metadata: { 
                        provider: 'leonardo', 
                        model: 'kino-xl',
                        prompt: prompt
                      }
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  )
                }
              }
              
              attempts++
            }
          }
        }
      } catch (error) {
        console.error('Leonardo AI error:', error)
      }
    }

    return new Response(
      JSON.stringify({ error: 'No working AI provider available. Please check your API keys.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )

  } catch (error) {
    console.error('Error in generate-cover-image function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
