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
      data: { user: adminUser },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !adminUser) throw new Error("Sessão inválida.");

    const { data: adminPlayer, error: adminPlayerError } = await adminClient
      .from("players")
      .select("role, email")
      .eq("user_id", adminUser.id)
      .maybeSingle();

    if (adminPlayerError) throw adminPlayerError;

    const isSuperAdmin = adminUser.email === "thiagolmontenegro@gmail.com";
    const isAdmin = isSuperAdmin || adminPlayer?.role === "admin";

    if (!isAdmin) throw new Error("Apenas Admin pode remover jogador.");

    const body = await req.json();
    const playerId = String(body.playerId || "");

    if (!playerId) throw new Error("playerId obrigatório.");

    const { data: target, error: targetError } = await adminClient
      .from("players")
      .select("*")
      .eq("id", playerId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) throw new Error("Jogador não encontrado.");

    const targetEmail = String(target.email || "").toLowerCase();

    if (targetEmail === "thiagolmontenegro@gmail.com" && !isSuperAdmin) {
      throw new Error("O Super Admin não pode ser removido por outro Admin.");
    }

    if (target.user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        target.user_id,
        false
      );

      if (deleteAuthError) throw deleteAuthError;
    }

    const { error: deletePlayerError } = await adminClient
      .from("players")
      .delete()
      .eq("id", playerId);

    if (deletePlayerError) throw deletePlayerError;

    return new Response(
      JSON.stringify({ ok: true, message: "Jogador removido com sucesso." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "Erro ao remover jogador.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
