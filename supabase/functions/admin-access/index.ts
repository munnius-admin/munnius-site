import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://social.munnius.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") || "";
  if (!supabaseUrl || !serviceRoleKey || !authorization.startsWith("Bearer ")) {
    return response({ error: "Acesso não autorizado." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const token = authorization.replace("Bearer ", "");
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return response({ error: "Sessão inválida." }, 401);

  const { data: platformAdmin } = await admin
    .from("platform_admins")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!platformAdmin) return response({ error: "Acesso restrito ao administrador." }, 403);

  const { inviteId } = await request.json().catch(() => ({}));
  if (!inviteId) return response({ error: "Convite não informado." }, 400);

  const { data: invite, error: inviteError } = await admin
    .from("access_invites")
    .select("id,email,full_name,organization_id,role,active,claimed_by")
    .eq("id", inviteId)
    .single();
  if (inviteError || !invite?.active) return response({ error: "Convite não encontrado ou inativo." }, 404);

  if (invite.claimed_by) return response({ ok: true, status: "linked", userId: invite.claimed_by });

  const { data: invited, error: invitationError } = await admin.auth.admin.inviteUserByEmail(invite.email, {
    redirectTo: "https://social.munnius.com.br/",
    data: { full_name: invite.full_name }
  });
  if (invitationError || !invited.user) {
    const alreadyRegistered = /already|registered|exists/i.test(invitationError?.message || "");
    if (!alreadyRegistered) return response({ error: "Não foi possível enviar o convite agora." }, 400);
    return response({ ok: true, status: "allowed", message: "E-mail permitido; usuário pode entrar com Google." });
  }

  const profileId = invited.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: profileId,
    full_name: invite.full_name,
    email: invite.email,
    active: true,
    updated_at: new Date().toISOString()
  });
  if (profileError) return response({ error: "Convite enviado, mas o perfil não pôde ser preparado." }, 500);

  const { error: membershipError } = await admin.from("organization_members").upsert({
    organization_id: invite.organization_id,
    profile_id: profileId,
    role: invite.role,
    active: true
  });
  if (membershipError) return response({ error: "Convite enviado, mas o vínculo não pôde ser preparado." }, 500);

  await admin.from("access_invites").update({
    claimed_by: profileId,
    claimed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq("id", invite.id);

  return response({ ok: true, status: "invited", userId: profileId });
});
