import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    const { prompt, projectId, style = 'artistic' } = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Generating image with prompt:', prompt)

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
            prompt: prompt,
            image_size: 'square_hd',
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
              const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
              )

              // Download and upload to Supabase storage
              const imageResponse = await fetch(imageUrl)
              const imageBlob = await imageResponse.blob()
              const fileName = `${projectId}-cover-${Date.now()}.jpg`
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('project-covers')
                .upload(fileName, imageBlob, {
                  contentType: 'image/jpeg',
                  upsert: true
                })

              if (!uploadError) {
                const { data: urlData } = supabase.storage
                  .from('project-covers')
                  .getPublicUrl(fileName)
                
                return new Response(
                  JSON.stringify({ 
                    imageUrl: urlData.publicUrl,
                    metadata: { 
                      provider: 'falai', 
                      model: 'flux-schnell',
                      prompt: prompt,
                      fileName: fileName
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
            prompt: prompt,
            modelId: 'e316348f-7773-490e-adcd-46757c738eb7', // Leonardo Kino XL
            width: 1024,
            height: 1024,
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
                    const supabase = createClient(
                      Deno.env.get('SUPABASE_URL') ?? '',
                      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                    )

                    const imageResponse = await fetch(imageUrl)
                    const imageBlob = await imageResponse.blob()
                    const fileName = `${projectId}-cover-${Date.now()}.jpg`
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('project-covers')
                      .upload(fileName, imageBlob, {
                        contentType: 'image/jpeg',
                        upsert: true
                      })

                    if (!uploadError) {
                      const { data: urlData } = supabase.storage
                        .from('project-covers')
                        .getPublicUrl(fileName)
                      
                      return new Response(
                        JSON.stringify({ 
                          imageUrl: urlData.publicUrl,
                          metadata: { 
                            provider: 'leonardo', 
                            model: 'kino-xl',
                            prompt: prompt,
                            fileName: fileName
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