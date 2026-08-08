// Configuração pública do frontend. Não coloque senhas nem a service_role aqui.
window.MUNNIUS_SOCIAL_CONFIG = {
  supabaseUrl: "https://fyjerbxkjxlxtccyutyn.supabase.co",
  supabaseAnonKey: "sb_publishable_CMxzNmKp5GwKODEU_Jx74Q_4RNKmtaD",
  appUrl: "https://social.munnius.com.br/",
  googleEnabled: false,
};

// Mantém a prévia local independente do projeto remoto e dos dados reais.
if (["127.0.0.1", "localhost"].includes(location.hostname)) {
  window.MUNNIUS_SOCIAL_CONFIG.supabaseUrl = "";
  window.MUNNIUS_SOCIAL_CONFIG.supabaseAnonKey = "";
}
