// Preencha somente as chaves públicas em config.js. A service role nunca pertence ao navegador.
const config = window.MUNNIUS_SOCIAL_CONFIG || {};
export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

async function getClient() {
  if (!isSupabaseConfigured) return null;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

async function getContext(client) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  const { data: membership, error } = await client
    .from("organization_members")
    .select("organization_id, role")
    .eq("profile_id", user.id)
    .eq("active", true)
    .limit(1)
    .single();
  if (error || !membership) throw new Error("Usuário sem organização ativa.");
  return { user, organizationId: membership.organization_id, role: membership.role };
}

export const authGateway = {
  async signIn(email, password) {
    if (!isSupabaseConfigured) {
      const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
      return localHosts.has(location.hostname)
        ? { ok: true, user: { email, role: "social_seller" } }
        : { ok: false, message: "Ambiente ainda não conectado. Tente novamente em instantes." };
    }
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: "E-mail ou senha inválidos." } : { ok: true, user: data.user };
  },
  async signOut() {
    const client = await getClient();
    if (client) await client.auth.signOut();
  },
  async resetPassword(email) {
    if (!isSupabaseConfigured) {
      return { ok: false, message: "A recuperação de senha ainda não está configurada." };
    }
    try {
      const client = await getClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}${location.pathname}`
      });
      if (!error) {
        return { ok: true, message: "E-mail de recuperação enviado. Confira também o spam." };
      }
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        return {
          ok: false,
          message: "Muitos e-mails foram solicitados. Aguarde alguns minutos e tente novamente."
        };
      }
      return {
        ok: false,
        message: "Não foi possível enviar o e-mail agora. Tente novamente em instantes."
      };
    } catch (error) {
      console.warn("Falha ao solicitar recuperação de senha.", error);
      return {
        ok: false,
        message: "Não foi possível falar com o serviço de acesso. Verifique sua conexão e tente novamente."
      };
    }
  }
};

export const dataGateway = {
  async loadWorkspace() {
    if (!isSupabaseConfigured) return null;
    const client = await getClient();
    const { user, organizationId, role } = await getContext(client);
    const [{ data, error }, { data: profile, error: profileError }] = await Promise.all([
      client
      .from("app_snapshots")
      .select("payload")
      .eq("organization_id", organizationId)
      .eq("profile_id", user.id)
      .maybeSingle(),
      client.from("profiles").select("full_name, email").eq("id", user.id).single()
    ]);
    if (error) throw error;
    if (profileError) throw profileError;
    const name = profile.full_name || user.email?.split("@")[0] || "Usuário";
    return {
      snapshot: data?.payload || null,
      profile: {
        name,
        email: profile.email || user.email,
        initials: name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(),
        role
      }
    };
  },
  async saveSnapshot(payload) {
    if (!isSupabaseConfigured) return;
    const client = await getClient();
    const { user, organizationId } = await getContext(client);
    const { error } = await client.from("app_snapshots").upsert({
      organization_id: organizationId,
      profile_id: user.id,
      payload,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  },
  async saveSession(session) {
    const rows = JSON.parse(localStorage.getItem("munnius-social-sessions") || "[]");
    rows.push({ ...session, endedAt: session.endedAt || new Date().toISOString() });
    localStorage.setItem("munnius-social-sessions", JSON.stringify(rows.slice(-100)));
  }
};
