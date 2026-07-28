// Preencha somente as chaves públicas em config.js. A service role nunca pertence ao navegador.
const config = window.MUNNIUS_SOCIAL_CONFIG || {};
export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);

async function getClient() {
  if (!isSupabaseConfigured) return null;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export const authGateway = {
  async signIn(email, password) {
    if (!isSupabaseConfigured) return { ok: true, user: { email, role: "social_seller" } };
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: "E-mail ou senha inválidos." } : { ok: true, user: data.user };
  },
  async signOut() {
    const client = await getClient();
    if (client) await client.auth.signOut();
  }
};

export const dataGateway = {
  async saveSession(session) {
    if (!isSupabaseConfigured) {
      const rows = JSON.parse(localStorage.getItem("munnius-social-sessions") || "[]");
      rows.push({ ...session, endedAt: Date.now() });
      localStorage.setItem("munnius-social-sessions", JSON.stringify(rows.slice(-100)));
      return;
    }
    const client = await getClient();
    await client.from("work_sessions").insert({
      clinic_id: session.clinicId,
      started_at: new Date(session.startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      ...Object.fromEntries(Object.entries(session.counts).map(([key, value]) => [`${key}_count`, value]))
    });
  }
};
