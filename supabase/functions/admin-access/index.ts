import { withSupabase } from "npm:@supabase/server";

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

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (request.method !== "POST") return response({ error: "Método não permitido." }, 405);

    const userId = context.userClaims?.sub;
    if (!userId) return response({ error: "Sessão inválida." }, 401);

    const { data: platformAdmin } = await context.supabaseAdmin
      .from("platform_admins")
      .select("profile_id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (!platformAdmin) return response({ error: "Acesso restrito ao administrador." }, 403);

    const { inviteId } = await request.json().catch(() => ({}));
    if (!inviteId) return response({ error: "Convite não informado." }, 400);

    const { data: invite, error: inviteError } = await context.supabaseAdmin
      .from("access_invites")
      .select("id,email,full_name,organization_id,role,active,claimed_by")
      .eq("id", inviteId)
      .single();
    if (inviteError || !invite?.active) return response({ error: "Convite não encontrado ou inativo." }, 404);
    if (invite.claimed_by) return response({ ok: true, status: "linked", userId: invite.claimed_by });

    const { data: organization } = await context.supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", invite.organization_id)
      .single();
    const accessLabel = invite.role === "manager"
      ? "Gestor · somente leitura"
      : invite.role === "admin" ? "Administrador" : "Social seller";

    const { data: invited, error: invitationError } = await context.supabaseAdmin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: "https://social.munnius.com.br/?invite=1",
      data: {
        full_name: invite.full_name,
        organization_name: organization?.name || "Munnius Social",
        access_label: accessLabel
      }
    });
    if (invitationError || !invited.user) {
      const alreadyRegistered = /already|registered|exists/i.test(invitationError?.message || "");
      const deliveryRestricted = /not authorized|smtp|rate limit|email/i.test(invitationError?.message || "");
      if (!alreadyRegistered && !deliveryRestricted) return response({ error: "Não foi possível preparar esse acesso agora." }, 400);
      return response({
        ok: true,
        status: "google_ready",
        message: "Acesso permitido; usuário pode entrar com Google usando o mesmo e-mail."
      });
    }

    const profileId = invited.user.id;
    const { error: profileError } = await context.supabaseAdmin.from("profiles").upsert({
      id: profileId,
      full_name: invite.full_name,
      email: invite.email,
      active: true,
      updated_at: new Date().toISOString()
    });
    if (profileError) return response({ error: "Convite enviado, mas o perfil não pôde ser preparado." }, 500);

    const { error: membershipError } = await context.supabaseAdmin.from("organization_members").upsert({
      organization_id: invite.organization_id,
      profile_id: profileId,
      role: invite.role,
      active: true
    });
    if (membershipError) return response({ error: "Convite enviado, mas o vínculo não pôde ser preparado." }, 500);

    await context.supabaseAdmin.from("access_invites").update({
      claimed_by: profileId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", invite.id);

    return response({ ok: true, status: "invited", userId: profileId });
  })
};
