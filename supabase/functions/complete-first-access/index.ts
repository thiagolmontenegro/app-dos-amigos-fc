import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Usuário não autenticado.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Sessão inválida.");

    const body = await req.json().catch(() => ({}));
    const playerId = body.playerId ? String(body.playerId) : null;

    let query = adminClient
      .from("players")
      .select("*")
      .eq("user_id", user.id);

    if (playerId) {
      query = adminClient
        .from("players")
        .select("*")
        .eq("id", playerId)
        .eq("user_id", user.id);
    }

    const { data: player, error: playerError } = await query.maybeSingle();

    if (playerError) throw playerError;
    if (!player) throw new Error("Cadastro do jogador não encontrado para este login.");

    const { error: updateError } = await adminClient
      .from("players")
      .update({
        must_change_password: false,
        first_access_done: true,
        temp_password_created: false,
      })
      .eq("id", player.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ ok: true, message: "Primeiro acesso concluído." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "Erro ao concluir primeiro acesso.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
