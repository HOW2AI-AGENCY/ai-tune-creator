import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

async function answerPreCheckoutQuery(queryId: string) {
  if (!botToken) throw new Error("Missing bot token");
  const apiUrl = `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`;
  await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pre_checkout_query_id: queryId, ok: true }),
  });
}

async function handleSuccessfulPayment(payment: any) {
  if (!botToken) throw new Error("Missing bot token");
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const telegramUserId = payment.from.id;
  const invoicePayload = payment.successful_payment.invoice_payload;
  const starsAmount = payment.successful_payment.total_amount;

  console.log('Processing successful payment');

  // Find user in your database by telegram_id
  const { data: userProfile, error } = await supabase
    .from('user_profiles') // Assuming you have a 'user_profiles' table
    .select('user_id, star_balance')
    .eq('telegram_id', telegramUserId)
    .single();

  if (error || !userProfile) {
    console.error(`User with telegram_id ${telegramUserId} not found.`);
    // Optionally, send a message back to the user via the bot
    return;
  }

  // Update user's star balance or grant item
  const newBalance = (userProfile.star_balance || 0) + starsAmount;
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({ star_balance: newBalance, last_purchase_at: new Date().toISOString() })
    .eq('user_id', userProfile.user_id);

  if (updateError) {
    console.error('Failed to update star balance:', updateError);
    return;
  }

  console.log('Successfully credited stars');

  // You could also send a confirmation message to the user via the bot API here
}

serve(async (req) => {
  try {
    const update = await req.json();

    if (update.pre_checkout_query) {
      await answerPreCheckoutQuery(update.pre_checkout_query.id);
    } else if (update.message && update.message.successful_payment) {
      await handleSuccessfulPayment(update.message);
    }

    return new Response("ok", { status: 200 });

  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
