import { authGateway, dataGateway, isSupabaseConfigured } from "./supabase-client.js?v=16";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = "munnius-social-v3";
const LEGACY_STORAGE_KEY = "munnius-social-v2";
const countLabels = { profiles: "Novos follows", likes: "Curtidas", comments: "Comentários", directs: "Directs", responses: "Responderam", phones: "Telefones captados" };
const titles = { home: "Visão geral", session: "Sessão", leads: "Leads", followups: "Follow-ups", more: "Mais", clinics: "Clínicas", reports: "Relatórios" };
const statusNames = {
  new: "Lead mapeado",
  talking: "Conversando",
  follow_up: "Em follow-up",
  lost: "Perdido",
  sent_to_hunter: "Qualificado e encaminhado",
  scheduled: "Agendamento confirmado",
  attended: "Compareceu",
  no_show: "Não compareceu",
  finished: "Finalizado"
};
const clinicPriorities = {
  A: { label: "Alta prioridade", minutes: 30, range: "R$ 5 mil ou mais", order: 1, tone: "#9b5b4a" },
  B: { label: "Média prioridade", minutes: 20, range: "R$ 3 mil a R$ 4.999", order: 2, tone: "#a37a2f" },
  C: { label: "Baixa prioridade", minutes: 15, range: "Até R$ 2.999", order: 3, tone: "#487163" }
};
const qualificationGroups = [
  {
    key: "B",
    title: "Momento e investimento",
    helper: "Entenda o repertório da pessoa antes de entrar em valores.",
    prompt: "Você já chegou a pesquisar ou investir em algum procedimento parecido antes?",
    items: [
      ["priorInvestment", "Já pesquisou ou investiu em estética antes"],
      ["valueUnderstood", "Entendeu o valor do atendimento"]
    ]
  },
  {
    key: "A",
    title: "Decisão",
    helper: "Descubra com naturalidade quem participa dessa escolha.",
    prompt: "Essa é uma decisão que você está olhando por conta própria ou costuma conversar com alguém antes?",
    items: [
      ["decisionAuthority", "A decisão depende dela"],
      ["knowsDoctor", "Conhece ou confia no trabalho da Dra."]
    ]
  },
  {
    key: "N",
    title: "Necessidade",
    helper: "Confirme o incômodo e se a solução faz sentido.",
    prompt: "O que mais te incomoda hoje e o que você gostaria de melhorar?",
    items: [
      ["procedureDiscussed", "Falou sobre o procedimento ou incômodo"],
      ["fitConfirmed", "Respondeu se a solução faz sentido para ela"]
    ]
  },
  {
    key: "T",
    title: "Tempo",
    helper: "Entenda urgência sem pressionar pelo agendamento.",
    prompt: "Você pensa em fazer isso ainda este mês ou tem alguma data importante em mente?",
    items: [
      ["interestedThisMonth", "Tem interesse em fazer ainda este mês"],
      ["importantDate", "Existe uma data ou prazo importante"]
    ]
  }
];
const qualificationItems = qualificationGroups.flatMap(group => group.items);
const googleEnabled = Boolean(window.MUNNIUS_SOCIAL_CONFIG?.googleEnabled);
const recoveryLinkDetected = new URLSearchParams(location.hash.slice(1)).get("type") === "recovery"
  || new URLSearchParams(location.search).get("type") === "recovery";

const seed = {
  version: 3,
  profile: { name: "Usuário", initials: "US", role: "social_seller" },
  clinics: [
    { id: "bella", name: "Clínica Bella", doctor: "Dra. Beatriz", instagram: "@clinicabella", hunter: "Ana", hunterPhone: "5541999990001", protocol: "Glow", location: "Curitiba, PR", evaluationPrice: 300, trafficInvestment: 6000, priority: "A", target: 8, color: "#75566f", active: true },
    { id: "aura", name: "Instituto Aura", doctor: "Dra. Camila", instagram: "@institutoaura", hunter: "Marina", hunterPhone: "5541999990002", protocol: "Aura Natural", location: "São Paulo, SP", evaluationPrice: 250, trafficInvestment: 4000, priority: "B", target: 6, color: "#df765f", active: true },
    { id: "leve", name: "Clínica Leve", doctor: "Dra. Renata", instagram: "@clinicaleve", hunter: "Clara", hunterPhone: "5541999990003", protocol: "Leve Face", location: "Belo Horizonte, MG", evaluationPrice: 280, trafficInvestment: 2500, priority: "C", target: 5, color: "#1f6b57", active: true }
  ],
  leads: [
    { id: "lead-1", name: "Mariana Costa", instagram: "@maricosta", whatsapp: "", clinicId: "bella", status: "talking", interest: "Harmonização facial", location: "Curitiba", temperature: "warm", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: null, timeline: [{ at: new Date().toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-2", name: "Júlia Martins", instagram: "@jumartins", whatsapp: "", clinicId: "aura", status: "follow_up", interest: "Botox", location: "São Paulo", temperature: "warm", prospectedAt: new Date(Date.now() - 86400000).toISOString(), lastContactAt: new Date(Date.now() - 86400000).toISOString(), sentToHunterAt: null, timeline: [{ at: new Date(Date.now() - 86400000).toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-3", name: "Fernanda Lima", instagram: "@fernandalima", whatsapp: "41999990010", clinicId: "leve", status: "sent_to_hunter", interest: "Preenchimento labial", location: "Belo Horizonte", temperature: "hot", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: new Date().toISOString(), timeline: [{ at: new Date().toISOString(), label: "Enviado para closer" }] }
  ],
  directs: [],
  followups: [
    { id: "fu-1", leadId: "lead-2", scheduledFor: new Date(Date.now() - 3600000).toISOString(), step: "1º follow-up", status: "pending" },
    { id: "fu-2", leadId: "lead-1", scheduledFor: new Date(Date.now() + 5400000).toISOString(), step: "Pedir WhatsApp", status: "pending" }
  ],
  sessions: [],
  templates: [
    { id: "first", title: "1º contato", category: "first_contact", message: "Oi, {{nome}}! Vi seu perfil e achei que talvez você gostasse de conhecer o trabalho da {{clinica}}. Posso te contar mais?" },
    { id: "follow1", title: "1º follow-up", category: "first_follow_up", message: "Oi, {{nome}}! Passando só para saber se você conseguiu ver minha mensagem 😊" },
    { id: "follow2", title: "2º follow-up", category: "second_follow_up", message: "Oi, {{nome}}! Prometo não te incomodar mais depois dessa 😅 Se ainda tiver interesse, posso te passar as informações por aqui." },
    { id: "phone", title: "Pedir WhatsApp", category: "ask_phone", message: "Posso pedir para nossa equipe entrar em contato com você? Qual é o melhor WhatsApp?" }
  ]
};

function normalizeState(candidate) {
  const normalized = candidate;
  normalized.version = 3;
  normalized.clinics ||= [];
  normalized.leads ||= [];
  normalized.directs ||= [];
  normalized.followups ||= [];
  normalized.sessions ||= [];
  normalized.templates ||= structuredClone(seed.templates);
  normalized.clinics.forEach(clinic => {
    clinic.priority = priorityFromInvestment(clinic.trafficInvestment, clinic.priority);
  });
  normalized.leads.forEach(lead => {
    if (lead.status === "no_response") lead.status = "lost";
    if (lead.status === "qualified") lead.status = lead.whatsapp ? "sent_to_hunter" : "talking";
    lead.qualification ||= {};
    lead.timeline ||= [];
    lead.scheduledAt ||= null;
    lead.attendedAt ||= null;
    lead.noShowAt ||= null;
  });
  normalized.directs.forEach(direct => {
    direct.status ||= direct.phoneAt ? "phone" : direct.respondedAt ? "responded" : "sent";
    direct.timeline ||= [];
  });
  return normalized;
}

function loadState() {
  const base = isSupabaseConfigured
    ? { ...structuredClone(seed), profile: { name: "Carregando", initials: "··", role: "social_seller" }, clinics: [], leads: [], directs: [], followups: [], sessions: [] }
    : structuredClone(seed);
  if (isSupabaseConfigured) {
    return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
  }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    if (stored?.version >= 2) {
      const { profile: _ignoredProfile, ...operationalState } = stored;
      return normalizeState({ ...base, ...operationalState, profile: base.profile, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" });
    }
  } catch (error) { console.warn("Não foi possível recuperar os dados locais.", error); }
  return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
}

let state = loadState();
let syncTimer;
let workspaceOpened = false;
let recoveryMode = recoveryLinkDetected;
let stopWorkspaceRealtime;
let stopExtensionRealtime;
const processedExtensionEvents = new Set();
function operationalStorageKey(profileId = state.profile?.id) {
  return isSupabaseConfigured && profileId ? `${STORAGE_KEY}:${profileId}` : STORAGE_KEY;
}
function legacyOperationalStorageKey(profileId = state.profile?.id) {
  return isSupabaseConfigured && profileId ? `${LEGACY_STORAGE_KEY}:${profileId}` : LEGACY_STORAGE_KEY;
}
function loadLocalOperational(profile) {
  const base = { ...structuredClone(seed), profile, clinics: [], leads: [], directs: [], followups: [], sessions: [] };
  try {
    const stored = JSON.parse(
      localStorage.getItem(operationalStorageKey(profile?.id))
      || localStorage.getItem(legacyOperationalStorageKey(profile?.id))
    );
    if (stored?.version >= 2) {
      const { profile: _ignoredProfile, ...operationalState } = stored;
      return normalizeState({ ...base, ...operationalState, profile, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" });
    }
  } catch (error) { console.warn("Não foi possível recuperar o cache desta conta.", error); }
  return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
}
function mergeById(localItems = [], remoteItems = []) {
  const merged = new Map();
  localItems.forEach(item => item?.id && merged.set(item.id, item));
  remoteItems.forEach(item => item?.id && merged.set(item.id, item));
  return [...merged.values()];
}
function mergeOperationalState(localState, remoteState, profile) {
  const local = normalizeState(localState);
  const remote = normalizeState(remoteState);
  return normalizeState({
    ...local,
    ...remote,
    profile,
    clinics: mergeById(local.clinics, remote.clinics),
    leads: mergeById(local.leads, remote.leads),
    directs: mergeById(local.directs, remote.directs),
    followups: mergeById(local.followups, remote.followups),
    sessions: mergeById(local.sessions, remote.sessions),
    templates: mergeById(local.templates, remote.templates),
    session: null,
    timerId: null,
    lastAction: null,
    leadFilter: "all",
    followupFilter: "today",
    reportPeriod: "day"
  });
}
function operationalSnapshot() {
  const { profile, timerId, session, lastAction, leadFilter, priorityFilter, followupFilter, reportPeriod, ...serializable } = state;
  return serializable;
}
function persist() {
  const serializable = operationalSnapshot();
  localStorage.setItem(operationalStorageKey(), JSON.stringify(serializable));
  if (isSupabaseConfigured) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => dataGateway.saveSnapshot(serializable).catch(error => {
      console.warn("Sincronização adiada.", error);
      showToast("Salvo neste aparelho; sincronização pendente");
    }), 500);
  }
}
async function persistImmediately() {
  const serializable = operationalSnapshot();
  localStorage.setItem(operationalStorageKey(), JSON.stringify(serializable));
  if (isSupabaseConfigured) await dataGateway.saveSnapshot(serializable);
}

async function hydrateRemoteState() {
  if (!isSupabaseConfigured) return;
  const workspace = await dataGateway.loadWorkspace();
  const remote = workspace?.snapshot;
  const local = loadLocalOperational(workspace.profile);
  if (!remote || Number(remote.version || 0) < 2) {
    state = local;
    persist();
    return;
  }
  const base = { ...structuredClone(seed), clinics: [], leads: [], directs: [], followups: [], sessions: [] };
  const { profile: _ignoredProfile, ...operationalState } = remote;
  state = mergeOperationalState(local, { ...base, ...operationalState }, workspace.profile);
  const { profile, timerId, session, lastAction, leadFilter, priorityFilter, followupFilter, reportPeriod, ...serializable } = state;
  localStorage.setItem(operationalStorageKey(profile.id), JSON.stringify(serializable));
  persist();
}

function applyRemoteSnapshot(remote) {
  if (!remote || Number(remote.version || 0) < 2 || state.session) return;
  const profile = state.profile;
  const base = { ...structuredClone(seed), clinics: [], leads: [], directs: [], followups: [], sessions: [] };
  const { profile: _ignoredProfile, ...operationalState } = remote;
  state = mergeOperationalState(state, { ...base, ...operationalState }, profile);
  localStorage.setItem(operationalStorageKey(profile.id), JSON.stringify(state));
  renderDashboard();
  renderLeads();
  renderFollowups();
  renderReport();
  showToast("Dados atualizados por outro aparelho");
}

const extensionCounterMap = {
  follow: "profiles",
  like: "likes",
  comment: "comments",
  direct_sent: "directs",
  response_detected: "responses",
  phone_captured: "phones"
};

function ensureExtensionSession(event) {
  let session = state.sessions.find(item => item.id === event.session_id);
  if (session) return session;
  session = {
    id: event.session_id,
    clinicId: event.clinic_id,
    startedAt: event.payload?.startedAt || event.event_at,
    endedAt: null,
    durationSeconds: 0,
    counts: Object.fromEntries(Object.keys(countLabels).map(key => [key, 0])),
    source: "chrome_extension"
  };
  state.sessions.push(session);
  return session;
}

function isOpenCommercialStatus(status) {
  return !["sent_to_hunter", "scheduled", "attended", "no_show", "finished"].includes(status);
}

function upsertLeadFromActivity({ clinicId, instagram: rawInstagram = "", stage = "mapped", at = new Date().toISOString(), phone = "", source = "manual_web" }) {
  const instagram = instagramHandle(rawInstagram);
  if (instagram === "@") return null;
  let lead = state.leads.find(item => item.clinicId === clinicId && instagramHandle(item.instagram) === instagram);
  if (!lead) {
    lead = {
      id: uid("lead"),
      clinicId,
      name: "",
      instagram,
      whatsapp: "",
      status: stage === "mapped" ? "new" : "talking",
      interest: "",
      temperature: "warm",
      qualification: {},
      prospectedAt: at,
      lastContactAt: at,
      sentToHunterAt: null,
      source,
      timeline: []
    };
    state.leads.unshift(lead);
  }
  lead.lastContactAt = at;
  lead.timeline ||= [];
  if (stage === "phone") {
    if (isOpenCommercialStatus(lead.status)) lead.status = "talking";
    lead.whatsapp = phoneDigits(phone || lead.whatsapp || "");
    lead.phoneCapturedAt = at;
    lead.timeline.push({ at, label: source === "chrome_extension" ? "Telefone captado pela extensão" : "Telefone captado" });
  } else if (stage === "responded") {
    if (isOpenCommercialStatus(lead.status)) lead.status = "talking";
    lead.respondedAt = at;
    lead.timeline.push({ at, label: source === "chrome_extension" ? "Resposta registrada pela extensão" : "Lead respondeu ao direct" });
  } else {
    lead.directSentAt ||= at;
    if (!lead.status || lead.status === "lost") lead.status = "new";
    lead.timeline.push({ at, label: source === "chrome_extension" ? "Direct enviado pela extensão" : "Direct enviado" });
  }
  return lead;
}

function findLatestDirect(clinicId, instagram) {
  const normalized = instagramHandle(instagram);
  return state.directs
    .filter(item => item.clinicId === clinicId && instagramHandle(item.instagram || "") === normalized)
    .sort((a, b) => new Date(b.sentAt || b.createdAt) - new Date(a.sentAt || a.createdAt))[0] || null;
}

function recordDirectProgress({ clinicId, instagram: rawInstagram = "", stage = "sent", at = new Date().toISOString(), phone = "", source = "manual_web", sessionId = null }) {
  const instagram = instagramHandle(rawInstagram);
  if (instagram === "@") return { direct: null, lead: null };
  let direct = findLatestDirect(clinicId, instagram);
  const shouldCreate = !direct || (stage === "sent" && ["phone", "lost"].includes(direct.status));
  if (shouldCreate) {
    direct = {
      id: uid("direct"),
      clinicId,
      instagram,
      leadId: null,
      sessionId,
      sentAt: stage === "sent" ? at : null,
      respondedAt: null,
      phoneAt: null,
      phone: "",
      status: stage === "sent" ? "sent" : stage,
      source,
      createdAt: at,
      timeline: []
    };
    state.directs.unshift(direct);
  }
  direct.timeline ||= [];
  if (stage === "sent") {
    direct.sentAt ||= at;
    direct.status = direct.status === "sent" ? "sent" : direct.status;
    direct.timeline.push({ at, label: "Direct enviado" });
  }
  if (stage === "responded") {
    direct.respondedAt ||= at;
    direct.status = direct.status === "phone" ? "phone" : "responded";
    direct.timeline.push({ at, label: "Resposta recebida" });
  }
  if (stage === "phone") {
    direct.respondedAt ||= at;
    direct.phoneAt = at;
    direct.phone = phoneDigits(phone || direct.phone || "");
    direct.status = "phone";
    direct.timeline.push({ at, label: "Telefone captado" });
  }
  const lead = upsertLeadFromActivity({
    clinicId,
    instagram,
    stage: stage === "sent" ? "mapped" : stage,
    at,
    phone,
    source
  });
  direct.leadId = lead?.id || direct.leadId;
  return { direct, lead };
}

function upsertLeadFromExtension(event, stage = "mapped") {
  const eventStage = stage === "mapped" ? "sent" : stage;
  const result = recordDirectProgress({
    clinicId: event.clinic_id,
    instagram: event.instagram_handle || "",
    stage: eventStage,
    at: event.event_at || new Date().toISOString(),
    phone: event.payload?.phone || "",
    source: "chrome_extension",
    sessionId: event.session_id
  });
  if (eventStage === "phone" && result.lead) {
    result.lead.qualification = { ...(result.lead.qualification || {}), ...(event.payload?.qualification || {}) };
    result.lead.interest = event.payload?.interest || result.lead.interest || "";
    result.lead.temperature = event.payload?.temperature || result.lead.temperature || "warm";
    if (event.payload?.sendToHunter) {
      result.lead.status = "sent_to_hunter";
      result.lead.sentToHunterAt ||= event.event_at || new Date().toISOString();
      result.lead.timeline.push({ at: result.lead.sentToHunterAt, label: "Encaminhado para a Hunter pela extensão" });
    }
  }
  return result.lead;
}

async function applyExtensionEvents(events, notify = false) {
  const freshEvents = (Array.isArray(events) ? events : [events])
    .filter(event => event?.id && !processedExtensionEvents.has(event.id))
    .sort((a, b) => new Date(a.event_at) - new Date(b.event_at));
  if (!freshEvents.length) return;
  let changed = false;
  for (const event of freshEvents) {
    const session = ensureExtensionSession(event);
    const eventAt = new Date(event.event_at || Date.now());
    session.durationSeconds = Math.max(
      Number(session.durationSeconds || 0),
      Math.max(1, Math.floor((eventAt - new Date(session.startedAt)) / 1000))
    );
    if (event.event_type === "session_finished") {
      session.endedAt = event.event_at;
      session.durationSeconds = Number(event.payload?.context?.durationSeconds || session.durationSeconds);
      if (event.payload?.context?.counts) {
        session.counts = { ...session.counts, ...event.payload.context.counts };
      }
    } else {
      const countKey = extensionCounterMap[event.event_type];
      if (countKey) session.counts[countKey] = Number(session.counts[countKey] || 0) + 1;
      if (event.event_type === "direct_sent") upsertLeadFromExtension(event, "mapped");
      if (event.event_type === "response_detected") upsertLeadFromExtension(event, "responded");
      if (event.event_type === "phone_captured") upsertLeadFromExtension(event, "phone");
    }
    processedExtensionEvents.add(event.id);
    changed = true;
  }
  if (!changed) return;
  await persistImmediately();
  await dataGateway.markExtensionEventsProcessed?.(freshEvents.map(event => event.id));
  renderDashboard();
  renderSessionClinicTracker();
  renderDirectHistory();
  renderLeads();
  renderReport();
  if (notify) showToast("Ação do Instagram sincronizada");
}

async function syncPendingExtensionEvents() {
  if (!isSupabaseConfigured || !dataGateway.loadPendingExtensionEvents) return;
  const events = await dataGateway.loadPendingExtensionEvents();
  await applyExtensionEvents(events, false);
}

function expireUnansweredLeads() {
  const mappedCutoff = Date.now() - 7 * 86400000;
  const talkingCutoff = Date.now() - 14 * 86400000;
  let changed = false;
  state.leads.forEach(lead => {
    const referenceDate = new Date(lead.lastContactAt || lead.prospectedAt || 0).getTime();
    const mappedExpired = lead.status === "new" && referenceDate && referenceDate < mappedCutoff;
    const conversationExpired = lead.status === "talking" && referenceDate && referenceDate < talkingCutoff;
    if (mappedExpired || conversationExpired) {
      const now = new Date().toISOString();
      lead.status = "lost";
      lead.timeline ||= [];
      lead.timeline.push({ at: now, label: mappedExpired ? "Sem resposta após 7 dias" : "Conversa sem evolução após 14 dias" });
      const direct = findLatestDirect(lead.clinicId, lead.instagram);
      if (direct && direct.status !== "phone") direct.status = "lost";
      changed = true;
    }
  });
  if (changed) persist();
}

function renderProfile() {
  const name = state.profile?.name || "Usuário";
  const firstName = name.split(/\s+/)[0];
  const initials = state.profile?.initials || firstName.slice(0, 2).toUpperCase();
  $("#greeting").textContent = `Olá, ${firstName}`;
  $("#profile-avatar-button").textContent = initials;
  $("#profile-avatar-large").textContent = initials;
  $("#profile-name").textContent = name;
  $("#profile-role").textContent = state.profile?.role === "admin" ? "Admin · Social seller" : "Social seller";
}

function showRecoveryForm() {
  recoveryMode = true;
  $("#login-form").classList.add("hidden");
  $("#recovery-form").classList.remove("hidden");
  requestAnimationFrame(() => $("#new-password").focus());
}

async function openWorkspace(message = "Bem-vindo") {
  if (workspaceOpened) return;
  workspaceOpened = true;
  let identity;
  try {
    identity = await dataGateway.loadIdentity();
    if (identity) state.profile = identity;
    await hydrateRemoteState();
  } catch (error) {
    console.warn("Não foi possível carregar a nuvem.", error);
    if (!identity && isSupabaseConfigured) {
      workspaceOpened = false;
      showToast("Sua sessão expirou. Entre novamente.");
      return;
    }
    state = loadLocalOperational(identity || state.profile);
    message = "Conta aberta · sincronização será retomada";
  }
  $("#auth-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  expireUnansweredLeads();
  renderProfile();
  renderDashboard();
  renderLeads();
  renderFollowups();
  renderReport();
  renderDirectHistory();
  stopWorkspaceRealtime?.();
  try {
    stopWorkspaceRealtime = await dataGateway.subscribeToWorkspace?.(applyRemoteSnapshot);
  } catch (error) {
    console.warn("Atualização em tempo real será retomada depois.", error);
  }
  stopExtensionRealtime?.();
  try {
    await syncPendingExtensionEvents();
    stopExtensionRealtime = await dataGateway.subscribeToExtensionEvents?.(event => {
      applyExtensionEvents(event, true).catch(error => console.warn("Evento da extensão pendente.", error));
    });
  } catch (error) {
    console.info("Extensão Chrome ainda não conectada.", error);
  }
  showToast(message);
}

function uid(prefix) { return crypto.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
function clinicById(id) { return state.clinics.find(clinic => clinic.id === id); }
function leadById(id) { return state.leads.find(lead => lead.id === id); }
function formatDate(value, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" }).format(new Date(value));
}
function isSameDay(a, b = new Date()) { const date = new Date(a); return date.toDateString() === new Date(b).toDateString(); }
function periodStart(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);
  if (period === "month") start.setDate(start.getDate() - 29);
  return start;
}
function inPeriod(value, period) { return new Date(value) >= periodStart(period); }

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add("hidden"), 2300);
}

function navigate(view) {
  const currentView = $(".view.active")?.dataset.viewPanel;
  if (currentView === "session" && view !== "session") pauseSessionTimer();
  if (view === "session") resumeSessionTimer();
  $$(".view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = titles[view];
  if (view === "home") renderDashboard();
  if (view === "clinics") renderClinics();
  if (view === "leads") renderLeads();
  if (view === "followups") renderFollowups();
  if (view === "reports") renderReport();
  if (view === "session") {
    renderSessionClinicTracker();
    renderDirectHistory();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function periodStats(period = state.period || "day") {
  const leads = state.leads.filter(lead => inPeriod(lead.prospectedAt, period));
  const sessions = state.sessions.filter(session => inPeriod(session.startedAt, period));
  if (state.session && inPeriod(state.session.startedAt, period)) {
    sessions.push({
      ...state.session,
      durationSeconds: activeSessionElapsed(state.session)
    });
  }
  const counts = sessions.reduce((total, session) => {
    Object.keys(countLabels).forEach(key => total[key] += Number(session.counts?.[key] || 0));
    total.seconds += Number(session.durationSeconds || 0);
    return total;
  }, { profiles: 0, likes: 0, comments: 0, directs: 0, responses: 0, phones: 0, seconds: 0 });
  return {
    leads: leads.length,
    hunters: state.leads.filter(lead => lead.sentToHunterAt && inPeriod(lead.sentToHunterAt, period)).length,
    scheduled: state.leads.filter(lead => lead.scheduledAt && inPeriod(lead.scheduledAt, period)).length,
    attended: state.leads.filter(lead => lead.attendedAt && inPeriod(lead.attendedAt, period)).length,
    noShows: state.leads.filter(lead => lead.noShowAt && inPeriod(lead.noShowAt, period)).length,
    sessions,
    ...counts
  };
}

function renderDashboard() {
  expireUnansweredLeads();
  const stats = periodStats(state.period);
  const activeClinics = state.clinics.filter(clinic => clinic.active);
  const pending = state.followups.filter(item => item.status === "pending").length;
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const talking = state.leads.filter(lead => lead.status === "talking").length;
  const followingUp = state.leads.filter(lead => lead.status === "follow_up").length;
  const lost = state.leads.filter(lead => lead.status === "lost").length;
  const qualified = state.leads.filter(lead => lead.status === "sent_to_hunter").length;
  const scheduled = state.leads.filter(lead => lead.status === "scheduled").length;
  const attended = state.leads.filter(lead => lead.status === "attended").length;
  $("#actions-total").textContent = actions;
  $("#leads-total").textContent = stats.leads;
  $("#clinics-total").textContent = activeClinics.length;
  $("#hunters-total").textContent = stats.hunters;
  $("#followups-total").textContent = pending;
  $("#pipeline-mapped").textContent = stats.directs;
  $("#pipeline-talking").textContent = talking;
  $("#pipeline-followups").textContent = followingUp;
  $("#pipeline-lost").textContent = lost;
  $("#pipeline-qualified").textContent = qualified;
  $("#pipeline-scheduled").textContent = scheduled;
  $("#pipeline-attended").textContent = attended;
  $("#hero-summary").textContent = actions
    ? `${stats.directs} directs · ${stats.responses} respostas · ${stats.phones} telefones`
    : activeClinics.length ? "Escolha uma clínica abaixo e comece a sessão." : "Cadastre sua primeira clínica para começar.";
  const badge = $(".bottom-nav [data-view='followups'] i");
  badge.textContent = pending;
  badge.classList.toggle("hidden", pending === 0);
  renderClinics();
}

function clinicLeadCount(clinicId, period = "day") { return state.leads.filter(lead => lead.clinicId === clinicId && inPeriod(lead.prospectedAt, period)).length; }
function clinicMarkup(clinic, detailed = false) {
  const leads = clinicLeadCount(clinic.id);
  const pct = Math.min(100, clinic.target ? leads / clinic.target * 100 : 0);
  const active = state.session?.clinicId === clinic.id;
  const priority = clinicPriority(clinic);
  return `<article class="clinic-card ${detailed ? "clickable" : ""} ${active ? "has-active-session" : ""}" ${detailed ? `data-clinic-detail="${clinic.id}"` : ""}>
    <div class="clinic-avatar" style="background:${clinic.color}">${clinic.name.split(" ").slice(-1)[0][0]}</div>
    <div class="clinic-main"><strong>${clinic.name} <em class="priority-pill priority-${clinic.priority.toLowerCase()}">${clinic.priority}</em></strong><span>${clinic.instagram} · Closer ${clinic.hunter} · ${priority.minutes} min</span><div class="progress"><i style="width:${pct}%"></i></div></div>
    <div class="clinic-card-side"><div class="clinic-score"><strong>${leads}/${clinic.target}</strong><span>leads hoje</span></div>
      ${detailed ? `<span class="material-symbols-outlined clinic-chevron">chevron_right</span>` : `<button class="clinic-start ${active ? "active" : ""}" data-start-session="${clinic.id}"><span class="material-symbols-outlined">${active ? "timer" : "play_arrow"}</span>${active ? "Continuar" : "Iniciar"}</button>`}
    </div>
  </article>`;
}
function renderClinics() {
  const active = state.clinics.filter(clinic => clinic.active);
  $("#clinic-list").innerHTML = active.map(clinic => clinicMarkup(clinic)).join("") || emptyState("Nenhuma clínica ativa.");
  $("#clinics-page-list").innerHTML = active.map(clinic => clinicMarkup(clinic, true)).join("") || emptyState("Cadastre sua primeira clínica.");
  $$("[data-start-session]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const clinicId = button.dataset.startSession;
    if (state.session?.clinicId === clinicId) return navigate("session");
    if (state.session) return showToast("Encerre a sessão atual antes de iniciar outra.");
    startSession(clinicId);
  }));
  $$("[data-clinic-detail]").forEach(card => card.addEventListener("click", () => openClinicForm(card.dataset.clinicDetail)));
  renderSessionClinicTracker();
}

function sessionActionCount(session) {
  return Object.keys(countLabels).reduce((total, key) => total + Number(session.counts?.[key] || 0), 0);
}

function compactDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  if (safeSeconds < 60) return safeSeconds ? "<1 min" : "0 min";
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours ? `${hours}h${minutes ? ` ${minutes}min` : ""}` : `${minutes} min`;
}

function priorityFromInvestment(value = 0, fallback = "C") {
  const investment = Number(value || 0);
  if (investment >= 5000) return "A";
  if (investment >= 3000) return "B";
  if (investment > 0) return "C";
  return clinicPriorities[fallback] ? fallback : "C";
}

function clinicPriority(clinic = {}) {
  const key = priorityFromInvestment(clinic.trafficInvestment, clinic.priority);
  return { key, ...clinicPriorities[key] };
}

function clinicActivityToday(clinicId) {
  const completed = state.sessions.filter(session => session.clinicId === clinicId && isSameDay(session.startedAt));
  const active = state.session?.clinicId === clinicId ? state.session : null;
  const sessions = active ? [...completed, {
    ...active,
    durationSeconds: activeSessionElapsed(active)
  }] : completed;
  return {
    active: Boolean(active),
    worked: sessions.length > 0,
    visits: sessions.length,
    actions: sessions.reduce((total, session) => total + sessionActionCount(session), 0),
    seconds: sessions.reduce((total, session) => total + Number(session.durationSeconds || 0), 0)
  };
}

function renderSessionClinicTracker() {
  const list = $("#session-clinic-list");
  if (!list) return;
  const clinics = state.clinics.filter(clinic => clinic.active);
  const rows = clinics.map(clinic => ({ clinic, activity: clinicActivityToday(clinic.id) }))
    .sort((a, b) => clinicPriority(a.clinic).order - clinicPriority(b.clinic).order
      || Number(b.activity.active) - Number(a.activity.active)
      || Number(a.activity.worked) - Number(b.activity.worked)
      || a.clinic.name.localeCompare(b.clinic.name, "pt-BR"));
  const worked = rows.filter(row => row.activity.worked).length;
  const missing = Math.max(0, rows.length - worked);
  $("#session-day-progress-label").textContent = `${worked} de ${rows.length}`;
  $("#session-day-progress-bar").style.width = `${rows.length ? worked / rows.length * 100 : 0}%`;
  $("#session-day-summary").textContent = rows.length
    ? missing
      ? `${missing} ${missing === 1 ? "conta ainda falta" : "contas ainda faltam"} na ronda de hoje.`
      : "Ronda completa. Todas as clínicas foram trabalhadas hoje."
    : "Cadastre uma clínica para montar sua ronda diária.";
  list.innerHTML = Object.keys(clinicPriorities).map(priorityKey => {
    const priority = clinicPriorities[priorityKey];
    const groupRows = rows.filter(row => clinicPriority(row.clinic).key === priorityKey);
    if (!groupRows.length) return "";
    const completed = groupRows.filter(row => row.activity.worked).length;
    const groupMarkup = groupRows.map(({ clinic, activity }) => {
      const status = activity.active ? "Agora" : activity.worked ? "Trabalhada" : "Pendente";
      const buttonLabel = activity.active ? "Continuar" : state.session ? "Em fila" : activity.worked ? "Nova sessão" : "Iniciar";
      const buttonIcon = activity.active ? "timer" : activity.worked ? "replay" : "play_arrow";
      const spentPct = Math.min(100, activity.seconds / (priority.minutes * 60) * 100);
      return `<article class="session-clinic-row ${activity.active ? "active" : ""} ${activity.worked ? "worked" : "pending"}">
        <span class="session-clinic-avatar" style="--clinic-color:${clinic.color}">${initials(clinic.name).slice(0, 1)}</span>
        <div class="session-clinic-copy">
          <div><strong>${escapeHtml(clinic.name)}</strong><span class="session-round-status ${activity.active ? "active" : activity.worked ? "worked" : "pending"}">${status}</span></div>
          <small>${escapeHtml(clinic.instagram)} · ${compactDuration(activity.seconds)} de ${priority.minutes} min · ${activity.actions} ${activity.actions === 1 ? "ação" : "ações"}</small>
          <span class="clinic-time-track" aria-hidden="true"><i style="width:${spentPct}%"></i></span>
        </div>
        <button class="session-round-button ${activity.active ? "active" : ""}" data-session-clinic="${clinic.id}" ${state.session && !activity.active ? "disabled" : ""}>
          <span class="material-symbols-outlined">${buttonIcon}</span>${buttonLabel}
        </button>
      </article>`;
    }).join("");
    return `<section class="priority-group priority-group-${priorityKey.toLowerCase()}">
      <div class="priority-group-heading">
        <span class="priority-letter">${priorityKey}</span>
        <div><strong>${priority.label}</strong><small>${priority.range} · até ${priority.minutes} min por clínica</small></div>
        <b>${completed}/${groupRows.length}</b>
      </div>
      <div class="priority-group-list">${groupMarkup}</div>
    </section>`;
  }).join("") || emptyState("Nenhuma clínica ativa.");
  $$("[data-session-clinic]").forEach(button => button.addEventListener("click", () => {
    const clinicId = button.dataset.sessionClinic;
    if (state.session?.clinicId === clinicId) return navigate("session");
    if (state.session) return showToast("Encerre a sessão atual antes de iniciar outra.");
    startSession(clinicId);
  }));
}

function renderDirectHistory() {
  const list = $("#session-direct-history");
  if (!list) return;
  const activeClinicId = state.session?.clinicId;
  const directs = state.directs
    .filter(item => activeClinicId ? item.clinicId === activeClinicId : inPeriod(item.sentAt || item.createdAt, "day"))
    .sort((a, b) => new Date(b.phoneAt || b.respondedAt || b.sentAt || b.createdAt) - new Date(a.phoneAt || a.respondedAt || a.sentAt || a.createdAt))
    .slice(0, 20);
  $("#session-directs-total").textContent = directs.length;
  list.innerHTML = directs.map(direct => {
    const clinic = clinicById(direct.clinicId);
    const status = direct.status === "phone" ? "Telefone" : direct.status === "responded" ? "Respondido" : direct.status === "lost" ? "Sem retorno" : "Aguardando";
    const statusIcon = direct.status === "phone" ? "phone_in_talk" : direct.status === "responded" ? "mark_chat_read" : direct.status === "lost" ? "person_cancel" : "schedule";
    const canAdvance = state.session?.clinicId === direct.clinicId;
    return `<article class="direct-history-card direct-${direct.status}">
      <span class="direct-history-icon"><span class="material-symbols-outlined">${statusIcon}</span></span>
      <div><strong>${escapeHtml(direct.instagram || "Perfil não informado")}</strong><small>${escapeHtml(clinic?.name || "Clínica")} · ${formatDate(direct.phoneAt || direct.respondedAt || direct.sentAt || direct.createdAt, true)}</small></div>
      <span class="direct-stage">${status}</span>
      <div class="direct-history-actions">
        ${["sent", "lost"].includes(direct.status) ? `<button data-direct-responded="${direct.id}" ${canAdvance ? "" : "disabled"}>Respondeu</button>` : ""}
        ${direct.status !== "phone" ? `<button class="phone" data-direct-phone="${direct.id}" ${canAdvance ? "" : "disabled"}>Telefone</button>` : ""}
      </div>
    </article>`;
  }).join("") || `<div class="empty-inline compact-empty"><span class="material-symbols-outlined">alternate_email</span><p>Os directs com @ aparecerão aqui.</p></div>`;
  $$("[data-direct-responded]").forEach(button => button.addEventListener("click", () => {
    const direct = state.directs.find(item => item.id === button.dataset.directResponded);
    if (!direct || !state.session) return;
    recordDirectProgress({
      clinicId: direct.clinicId,
      instagram: direct.instagram,
      stage: "responded",
      at: new Date().toISOString(),
      source: "manual_web",
      sessionId: state.session.id
    });
    updateAction("responses");
    persist();
    renderLeads();
    renderDirectHistory();
    showToast(`${direct.instagram} avançou para Conversando`);
  }));
  $$("[data-direct-phone]").forEach(button => button.addEventListener("click", () => {
    const direct = state.directs.find(item => item.id === button.dataset.directPhone);
    if (direct) openActivityCapture("phone", { directId: direct.id, instagram: direct.instagram });
  }));
}

function renderLeads() {
  expireUnansweredLeads();
  const query = $("#lead-search").value.trim().toLowerCase();
  const priorityFilter = state.priorityFilter || "all";
  const filtered = state.leads
    .filter(lead => `${lead.name} ${lead.instagram}`.toLowerCase().includes(query))
    .filter(lead => {
      if (priorityFilter === "all") return true;
      return clinicPriority(clinicById(lead.clinicId)).key === priorityFilter;
    })
    .sort((a, b) => clinicPriority(clinicById(a.clinicId)).order - clinicPriority(clinicById(b.clinicId)).order
      || new Date(b.lastContactAt || b.prospectedAt) - new Date(a.lastContactAt || a.prospectedAt));
  const columns = [
    { key: "new", title: "Mapeados", subtitle: "Direct enviado", statuses: ["new"], icon: "send" },
    { key: "talking", title: "Conversando", subtitle: "Responderam", statuses: ["talking"], icon: "forum" },
    { key: "follow_up", title: "Em follow", subtitle: "Retomar conversa", statuses: ["follow_up"], icon: "schedule" },
    { key: "lost", title: "Perdidos", subtitle: "Sem evolução", statuses: ["lost"], icon: "person_cancel" },
    { key: "sent_to_hunter", title: "Com a Hunter", subtitle: "Aguardando retorno", statuses: ["sent_to_hunter"], icon: "forward_to_inbox" },
    { key: "scheduled", title: "Agendados", subtitle: "Confirmar presença", statuses: ["scheduled"], icon: "event_available" },
    { key: "outcomes", title: "Desfecho", subtitle: "Compareceu ou faltou", statuses: ["attended", "no_show", "finished"], icon: "verified" }
  ];
  $("#lead-kanban").innerHTML = columns.map(column => {
    const items = filtered.filter(lead => column.statuses.includes(lead.status));
    return `<section class="kanban-column" data-kanban-column="${column.key}">
      <header><span class="kanban-column-icon"><span class="material-symbols-outlined">${column.icon}</span></span><div><strong>${column.title}</strong><small>${column.subtitle}</small></div><b>${items.length}</b></header>
      <div class="kanban-cards">${items.map(kanbanLeadCard).join("") || `<div class="kanban-empty">Nenhum lead nesta etapa</div>`}</div>
    </section>`;
  }).join("");
  $$("[data-lead]").forEach(card => card.addEventListener("click", () => openLeadDetail(card.dataset.lead)));
  renderHunterFollowups(filtered);
}

function leadDeadlineLabel(lead) {
  const reference = new Date(lead.lastContactAt || lead.prospectedAt || Date.now()).getTime();
  const ageDays = Math.max(0, Math.floor((Date.now() - reference) / 86400000));
  if (lead.status === "new") return `${Math.max(0, 7 - ageDays)}d para expirar`;
  if (lead.status === "talking") return `${Math.max(0, 14 - ageDays)}d para evoluir`;
  if (lead.status === "follow_up") {
    const followup = state.followups.find(item => item.leadId === lead.id && item.status === "pending");
    return followup ? `Follow ${formatDate(followup.scheduledFor, true)}` : "Follow sem data";
  }
  if (lead.status === "sent_to_hunter") return `${ageDays}d com a Hunter`;
  if (lead.status === "scheduled") return lead.scheduledAt ? formatDate(lead.scheduledAt, true) : "Agendado";
  if (lead.status === "lost") return "Reativar se responder";
  return statusNames[lead.status] || "Atualizado";
}

function kanbanLeadCard(lead) {
  const clinic = clinicById(lead.clinicId);
  const priority = clinicPriority(clinic);
  return `<article class="kanban-lead-card clickable" data-lead="${lead.id}">
    <div class="kanban-card-top"><span class="priority-dot priority-${priority.key.toLowerCase()}">${priority.key}</span><small>${escapeHtml(clinic?.name || "Clínica")}</small><span class="lead-temperature ${lead.temperature || "cold"}">${{ hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Frio"}</span></div>
    <strong>${escapeHtml(lead.name || lead.instagram || "Lead sem nome")}</strong>
    <span>${escapeHtml(lead.instagram || "Instagram não informado")}${lead.interest ? ` · ${escapeHtml(lead.interest)}` : ""}</span>
    <footer><span class="material-symbols-outlined">hourglass_bottom</span>${leadDeadlineLabel(lead)}<b class="material-symbols-outlined">chevron_right</b></footer>
  </article>`;
}

function renderHunterFollowups(filteredLeads = state.leads) {
  const container = $("#hunter-followup-list");
  if (!container) return;
  const items = filteredLeads.filter(lead => ["sent_to_hunter", "scheduled"].includes(lead.status));
  const groups = new Map();
  items.forEach(lead => {
    const clinic = clinicById(lead.clinicId);
    const key = `${clinic?.hunterPhone || ""}:${clinic?.hunter || "Hunter"}`;
    if (!groups.has(key)) groups.set(key, { hunter: clinic?.hunter || "Hunter", phone: clinic?.hunterPhone || "", leads: [] });
    groups.get(key).leads.push(lead);
  });
  container.innerHTML = [...groups.values()].map(group => `<section class="hunter-group">
    <header><span class="material-symbols-outlined">support_agent</span><div><strong>${escapeHtml(group.hunter)}</strong><small>${group.leads.length} ${group.leads.length === 1 ? "retorno pendente" : "retornos pendentes"}</small></div></header>
    <div>${group.leads.map(lead => {
      const clinic = clinicById(lead.clinicId);
      return `<article><div><strong>${escapeHtml(lead.name || lead.instagram)}</strong><small>${escapeHtml(clinic?.name || "")} · ${lead.status === "scheduled" ? `agendado ${formatDate(lead.scheduledAt, true)}` : "aguardando agendamento"}</small></div>
        <button data-hunter-remind="${lead.id}"><span class="material-symbols-outlined">chat</span>Cobrar</button>
        <button class="update" data-hunter-update="${lead.id}"><span class="material-symbols-outlined">edit_calendar</span>Atualizar</button>
      </article>`;
    }).join("")}</div>
  </section>`).join("") || `<p class="report-empty">Nenhum retorno pendente com as Hunters.</p>`;
  $$("[data-hunter-remind]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openHunterReminder(leadById(button.dataset.hunterRemind));
  }));
  $$("[data-hunter-update]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openHunterUpdate(button.dataset.hunterUpdate);
  }));
}

function openHunterReminder(lead) {
  const clinic = clinicById(lead.clinicId);
  if (!clinic?.hunterPhone) return showToast("Cadastre o WhatsApp da Hunter.");
  const message = lead.status === "scheduled"
    ? `Oi, ${clinic.hunter}! Consegue me confirmar se ${lead.name || lead.instagram} compareceu ao agendamento da ${clinic.name}?`
    : `Oi, ${clinic.hunter}! Consegue me atualizar se ${lead.name || lead.instagram} avançou para agendamento na ${clinic.name}?`;
  window.open(`https://wa.me/${clinic.hunterPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function renderFollowups() {
  const now = new Date();
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const items = state.followups
    .filter(item => item.status === "pending")
    .filter(item => {
      const scheduled = new Date(item.scheduledFor);
      if (state.followupFilter === "overdue") return scheduled < now;
      if (state.followupFilter === "next") return scheduled > endToday;
      return scheduled >= now && scheduled <= endToday;
    })
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  $("#followup-priority-title").textContent = state.followupFilter === "overdue" ? "Follow-ups atrasados" : state.followupFilter === "next" ? "Próximas ações" : "Prioridades de hoje";
  $("#followup-list").innerHTML = items.map(item => {
    const lead = leadById(item.leadId);
    if (!lead) return "";
    const overdue = new Date(item.scheduledFor) < now;
    return `<article class="followup-card"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div>
      <div class="lead-info"><strong>${escapeHtml(lead.name || lead.instagram)}</strong><span>${escapeHtml(lead.instagram)} · ${overdue ? "Atrasado · " : ""}${formatDate(item.scheduledFor, true)}</span></div>
      <button data-followup="${item.id}">${escapeHtml(item.step)}</button></article>`;
  }).join("") || emptyState(state.followupFilter === "today" ? "Tudo em dia por aqui." : "Nenhum follow-up neste grupo.");
  $$("[data-followup]").forEach(button => button.addEventListener("click", () => openFollowup(button.dataset.followup)));
}

function renderReport() {
  const stats = periodStats(state.reportPeriod);
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const labels = { day: "Hoje", week: "Últimos 7 dias", month: "Últimos 30 dias" };
  $("#report-label").textContent = labels[state.reportPeriod];
  $("#report-date").textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  $("#report-hunters").textContent = stats.hunters;
  $("#report-scheduled").textContent = stats.scheduled;
  $("#report-attended").textContent = stats.attended;
  $("#report-hours").textContent = compactDuration(stats.seconds);
  $("#report-actions-total").textContent = `${actions} ${actions === 1 ? "ação" : "ações"}`;
  $("#report-profiles").textContent = stats.profiles;
  $("#report-likes").textContent = stats.likes;
  $("#report-comments").textContent = stats.comments;
  $("#report-directs-detail").textContent = stats.directs;
  $("#report-responses").textContent = stats.responses;
  $("#report-phones").textContent = stats.phones;
  $("#report-efficiency").textContent = stats.directs && stats.phones
    ? `1 telefone a cada ${(stats.directs / stats.phones).toFixed(1).replace(".", ",")} directs`
    : stats.responses && stats.directs ? `${Math.round(stats.responses / stats.directs * 100)}% de respostas` : "Comece uma sessão";
  const days = state.reportPeriod === "day" ? 1 : state.reportPeriod === "week" ? 7 : 10;
  const values = Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (days - 1 - index));
    return state.leads.filter(lead => isSameDay(lead.prospectedAt, date)).length;
  });
  const max = Math.max(1, ...values);
  $("#report-chart").innerHTML = values.map((value, index) => `<div><span style="height:${Math.max(8, value / max * 88)}%"></span><small>${state.reportPeriod === "day" ? "Hoje" : index === values.length - 1 ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(new Date(Date.now() - (values.length - 1 - index) * 86400000))}</small></div>`).join("");
  const clinicRows = state.clinics.filter(clinic => clinic.active).map(clinic => {
    const clinicSessions = stats.sessions.filter(session => session.clinicId === clinic.id);
    const clinicActions = clinicSessions.reduce((total, session) => total + Object.keys(countLabels).reduce((sum, key) => sum + Number(session.counts?.[key] || 0), 0), 0);
    const clinicLeads = state.leads.filter(lead => lead.clinicId === clinic.id && inPeriod(lead.prospectedAt, state.reportPeriod)).length;
    const qualified = state.leads.filter(lead => lead.clinicId === clinic.id && lead.sentToHunterAt && inPeriod(lead.sentToHunterAt, state.reportPeriod)).length;
    const attended = state.leads.filter(lead => lead.clinicId === clinic.id && lead.attendedAt && inPeriod(lead.attendedAt, state.reportPeriod)).length;
    return { clinic, clinicActions, clinicLeads, qualified, attended };
  }).filter(row => row.clinicActions || row.clinicLeads || row.qualified).sort((a, b) => (b.qualified - a.qualified) || (b.clinicLeads - a.clinicLeads) || (b.clinicActions - a.clinicActions));
  $("#report-clinic-breakdown").innerHTML = clinicRows.slice(0, 8).map(({ clinic, clinicActions, clinicLeads, qualified, attended }) => `
    <div><span class="clinic-mini-avatar" style="background:${clinic.color}">${initials(clinic.name).slice(0,1)}</span>
      <p><strong>${escapeHtml(clinic.name)}</strong><small>${clinicActions} ações · ${clinicLeads} leads</small></p>
      <b>${qualified} qualif. · ${attended} comp.</b>
    </div>`).join("") || `<p class="report-empty">As clínicas aparecem aqui quando houver atividade no período.</p>`;
}

function emptyState(message) { return `<div class="empty-inline"><span class="material-symbols-outlined">inbox</span><p>${message}</p></div>`; }
function initials(value = "") { return value.replace("@", "").split(/[ ._-]+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase(); }
function escapeHtml(value = "") { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
function phoneDigits(value = "") { return value.replace(/\D/g, ""); }
function instagramHandle(value = "") {
  const trimmed = value.trim();
  const match = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match?.[1] || trimmed).replace(/^@/, "").replace(/\/$/, "")}`;
}

function openSheet(content, onOpen) {
  $("#sheet-content").innerHTML = content;
  $("#sheet-backdrop").classList.remove("hidden");
  onOpen?.();
}
function closeSheet() { $("#sheet-backdrop").classList.add("hidden"); }

function clinicPicker() {
  const clinics = state.clinics.filter(clinic => clinic.active);
  openSheet(`<h2 class="sheet-title">Escolha a clínica</h2><p class="sheet-subtitle">Todos os registros desta sessão ficarão associados a ela.</p>
    <div class="clinic-options">${clinics.map(clinic => `<button class="clinic-option" data-clinic-pick="${clinic.id}"><span><strong>${clinic.name}</strong><small>${clinic.instagram}</small></span><b class="material-symbols-outlined">chevron_right</b></button>`).join("")}</div>`, () => {
    $$("[data-clinic-pick]").forEach(button => button.addEventListener("click", () => startSession(button.dataset.clinicPick)));
  });
}

function activeSessionElapsed(session = state.session) {
  if (!session) return 0;
  const stored = Number(session.accumulatedSeconds || 0);
  if (session.paused || !session.resumedAt) return stored;
  return stored + Math.max(0, Math.floor((Date.now() - new Date(session.resumedAt)) / 1000));
}

function pauseSessionTimer() {
  if (!state.session || state.session.paused) return;
  state.session.accumulatedSeconds = activeSessionElapsed(state.session);
  state.session.resumedAt = null;
  state.session.paused = true;
  clearInterval(state.timerId);
  state.timerId = null;
  updateTimer();
}

function resumeSessionTimer() {
  if (!state.session) return;
  if (state.session.paused || !state.session.resumedAt) {
    state.session.resumedAt = new Date().toISOString();
    state.session.paused = false;
  }
  clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer();
}

function startSession(clinicId) {
  const clinic = clinicById(clinicId);
  if (!clinic) return showToast("Clínica não encontrada.");
  const priority = clinicPriority(clinic);
  const spentToday = clinicActivityToday(clinicId).seconds;
  const remainingBudget = Math.max(0, priority.minutes * 60 - spentToday);
  const now = new Date().toISOString();
  state.session = {
    id: uid("session"),
    clinicId,
    startedAt: now,
    resumedAt: now,
    accumulatedSeconds: 0,
    paused: false,
    limitSeconds: remainingBudget,
    limitNotified: false,
    counts: Object.fromEntries(Object.keys(countLabels).map(key => [key, 0]))
  };
  $("#session-clinic").textContent = clinic.name;
  $("#session-empty").classList.add("hidden");
  $("#session-active").classList.remove("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  closeSheet();
  renderClinics();
  navigate("session");
  renderDirectHistory();
  showToast(remainingBudget
    ? `Sessão iniciada · ${compactDuration(remainingBudget)} restantes`
    : `Meta de tempo concluída · registre apenas o necessário`);
}
function updateTimer() {
  if (!state.session) return;
  const clinic = clinicById(state.session.clinicId);
  const priority = clinicPriority(clinic);
  const elapsed = activeSessionElapsed(state.session);
  const limit = Number(state.session.limitSeconds ?? priority.minutes * 60);
  const remaining = limit - elapsed;
  const absolute = Math.abs(remaining);
  const timer = $("#timer");
  timer.textContent = `${remaining < 0 ? "+" : ""}${[Math.floor(absolute / 60), absolute % 60].map(value => String(value).padStart(2, "0")).join(":")}`;
  timer.classList.toggle("warning", remaining > 0 && remaining <= 300);
  timer.classList.toggle("overtime", remaining <= 0);
  $("#session-limit-label").textContent = state.session.paused
    ? `pausado · ${compactDuration(Math.max(0, remaining))} restantes`
    : remaining > 0
    ? `restantes · prioridade ${priority.key}`
    : `tempo extra · hora de seguir`;
  $("#session-timer-progress").style.width = `${limit > 0 ? Math.min(100, elapsed / limit * 100) : 100}%`;
  $("#session-timer-progress").classList.toggle("warning", remaining > 0 && remaining <= 300);
  $("#session-timer-progress").classList.toggle("overtime", remaining <= 0);
  if (remaining <= 0 && !state.session.limitNotified && !state.session.paused) {
    state.session.limitNotified = true;
    navigator.vibrate?.([120, 70, 120]);
    showToast(`Tempo da ${clinic?.name || "clínica"} concluído. Finalize e siga para a próxima.`);
  }
  if (elapsed % 10 === 0) renderSessionClinicTracker();
}
function updateAction(action, delta = 1) {
  if (!state.session) return;
  const previous = state.session.counts[action];
  state.session.counts[action] = Math.max(0, previous + delta);
  const countNode = $(`[data-action="${action}"] strong`);
  countNode.textContent = state.session.counts[action];
  countNode.classList.remove("count-pop");
  requestAnimationFrame(() => countNode.classList.add("count-pop"));
  if (delta > 0) state.lastAction = action;
  renderSessionClinicTracker();
  renderDirectHistory();
}
function handleSessionAction(action) {
  if (!state.session) return;
  if (action === "directs") {
    openActivityCapture("sent");
    return;
  }
  if (action === "responses") {
    openActivityCapture("responded");
    return;
  }
  if (action === "phones") {
    openActivityCapture("phone");
    return;
  }
  updateAction(action);
}

function recentInstagramHandles(clinicId) {
  return [...new Set([
    ...state.directs.filter(item => item.clinicId === clinicId).map(item => item.instagram),
    ...state.leads.filter(item => item.clinicId === clinicId).map(item => item.instagram)
  ].filter(Boolean))].slice(0, 80);
}

function openActivityCapture(stage, { instagram = "", phone = "", directId = null } = {}) {
  if (!state.session) return showToast("Inicie uma sessão primeiro.");
  const clinic = clinicById(state.session.clinicId);
  const mode = {
    sent: { title: "Direct enviado", subtitle: "Informe o @ para rastrear. Se estiver no ritmo, pode salvar sem preencher.", action: "directs" },
    responded: { title: "Lead respondeu", subtitle: "O @ conecta a resposta ao direct anterior, mas continua opcional.", action: "responses" },
    phone: { title: "Telefone captado", subtitle: "Marque somente o que conseguiu qualificar e entregue à Hunter.", action: "phones" }
  }[stage];
  const direct = directId ? state.directs.find(item => item.id === directId) : null;
  const prefilledInstagram = instagram || direct?.instagram || "";
  const lead = prefilledInstagram && instagramHandle(prefilledInstagram) !== "@"
    ? state.leads.find(item => item.clinicId === clinic.id && instagramHandle(item.instagram) === instagramHandle(prefilledInstagram))
    : null;
  const handles = recentInstagramHandles(clinic.id);
  openSheet(`<h2 class="sheet-title">${mode.title}</h2><p class="sheet-subtitle">${mode.subtitle}</p>
    <form class="sheet-form" id="activity-capture-form">
      <div class="field"><label for="activity-instagram">Instagram <span class="optional">(opcional)</span></label>
        <input id="activity-instagram" list="activity-instagram-options" value="${escapeHtml(prefilledInstagram)}" placeholder="@usuario ou link">
        <datalist id="activity-instagram-options">${handles.map(handle => `<option value="${escapeHtml(handle)}"></option>`).join("")}</datalist>
      </div>
      ${stage === "phone" ? `
        ${field("activity-phone", "WhatsApp", phone || lead?.whatsapp, false, "tel", "(00) 00000-0000")}
        <div class="qualification-block compact-qualification">
          <div class="qualification-heading"><span class="material-symbols-outlined">fact_check</span><div><strong>Contexto para a Hunter</strong><small>Opcional. Marque apenas o que já foi conversado.</small></div></div>
          ${field("lead-interest", "Procedimento de interesse", lead?.interest, false, "text", "Ex.: Botox")}
          <div class="field"><label for="lead-temperature">Temperatura</label><select id="lead-temperature">
            <option value="cold" ${lead?.temperature === "cold" ? "selected" : ""}>Frio</option>
            <option value="warm" ${(!lead?.temperature || lead?.temperature === "warm") ? "selected" : ""}>Morno</option>
            <option value="hot" ${lead?.temperature === "hot" ? "selected" : ""}>Quente</option>
          </select></div>
          ${qualificationChecklist(lead || {})}
        </div>` : ""}
      <button class="secondary-button" type="submit" data-send="false">${stage === "phone" ? "Salvar sem enviar" : "Registrar ação"}</button>
      ${stage === "phone" ? `<button class="primary-button victory-button" type="submit" data-send="true">🎉 Salvar e enviar para ${escapeHtml(clinic.hunter || "Hunter")}</button>` : ""}
    </form>`, () => {
    $("#activity-instagram").addEventListener("blur", event => {
      if (event.target.value.trim()) event.target.value = instagramHandle(event.target.value);
    });
    $$("[data-copy-bant]").forEach(button => button.addEventListener("click", async () => {
      const group = qualificationGroups.find(item => item.key === button.dataset.copyBant);
      await navigator.clipboard.writeText(group.prompt);
      showToast(`Pergunta ${group.key} copiada`);
    }));
    $$("[id^='qualification-']").forEach(input => input.addEventListener("change", () => {
      const progress = qualificationProgress(readQualification());
      $("#bant-progress-label").textContent = `${progress.done} de ${progress.total} pontos alinhados`;
      $("#bant-progress-bar").style.width = `${progress.percent}%`;
    }));
    $("#activity-capture-form").addEventListener("submit", event => {
      event.preventDefault();
      const shouldSend = event.submitter?.dataset.send === "true";
      const rawInstagram = $("#activity-instagram").value.trim();
      const normalizedInstagram = rawInstagram ? instagramHandle(rawInstagram) : "";
      const capturedPhone = stage === "phone" ? phoneDigits($("#activity-phone").value) : "";
      const now = new Date().toISOString();
      const result = normalizedInstagram
        ? recordDirectProgress({
          clinicId: clinic.id,
          instagram: normalizedInstagram,
          stage,
          at: now,
          phone: capturedPhone,
          source: "manual_web",
          sessionId: state.session.id
        })
        : { direct: null, lead: null };
      if (stage === "phone" && result.lead) {
        result.lead.interest = $("#lead-interest").value.trim();
        result.lead.temperature = $("#lead-temperature").value;
        result.lead.qualification = readQualification();
      }
      updateAction(mode.action);
      persist();
      renderLeads();
      renderDirectHistory();
      closeSheet();
      if (stage === "phone" && shouldSend) {
        if (!result.lead) return showToast("Salvo. Informe um @ para preparar a entrega à Hunter.");
        if (!capturedPhone) return showToast("Salvo. Adicione o telefone antes de abrir o WhatsApp da Hunter.");
        result.lead.status = "sent_to_hunter";
        result.lead.sentToHunterAt ||= now;
        result.lead.timeline.push({ at: now, label: `Encaminhado para ${clinic.hunter}` });
        persist();
        renderDashboard();
        openHunterWhatsApp(result.lead);
        return;
      }
      showToast(normalizedInstagram ? `${mode.title} · ${normalizedInstagram}` : `${mode.title} registrado sem perfil`);
    });
  });
}
async function finishSession() {
  if (!state.session) return;
  const endedAt = new Date();
  const completed = { ...state.session, endedAt: endedAt.toISOString(), durationSeconds: Math.max(1, activeSessionElapsed(state.session)), paused: true, resumedAt: null };
  state.sessions.push(completed);
  await dataGateway.saveSession?.(completed);
  persist(); clearInterval(state.timerId); state.session = null; state.lastAction = null;
  $("#session-empty").classList.remove("hidden"); $("#session-active").classList.add("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  renderDashboard(); renderReport(); renderSessionClinicTracker(); renderDirectHistory(); showToast("Sessão salva no histórico");
}

function openAdjustCounts() {
  if (!state.session) return;
  openSheet(`<h2 class="sheet-title">Ajustar contagens</h2><p class="sheet-subtitle">Use somente para corrigir um toque por engano.</p>
    <div class="adjust-list">${Object.entries(countLabels).map(([key, label]) => `<div><span>${label}</span><button data-adjust="${key}" data-delta="-1">−</button><strong id="adjust-${key}">${state.session.counts[key]}</strong><button data-adjust="${key}" data-delta="1">+</button></div>`).join("")}</div>`, () => {
      $$("[data-adjust]").forEach(button => button.addEventListener("click", () => {
        const key = button.dataset.adjust; const delta = Number(button.dataset.delta);
        updateAction(key, delta); $(`#adjust-${key}`).textContent = state.session.counts[key];
      }));
  });
}

function openClinicForm(clinicId = null) {
  const clinic = clinicId ? clinicById(clinicId) : {};
  const edit = Boolean(clinicId);
  const currentPriority = clinicPriority(clinic);
  openSheet(`<h2 class="sheet-title">${edit ? "Editar clínica" : "Nova clínica"}</h2><p class="sheet-subtitle">A closer fica vinculada para agilizar cada entrega.</p>
    <form class="sheet-form" id="clinic-form">
      ${field("clinic-name", "Nome da clínica", clinic.name, true)}
      ${field("clinic-doctor", "Dra. responsável", clinic.doctor, true)}
      ${field("clinic-instagram", "Instagram", clinic.instagram, true, "text", "@clinica")}
      <div class="form-grid">${field("clinic-hunter", "Closer responsável", clinic.hunter, true)}${field("clinic-hunter-phone", "WhatsApp da closer", clinic.hunterPhone, true, "tel", "(00) 00000-0000")}</div>
      ${field("clinic-protocol", "Protocolo da clínica", clinic.protocol)}
      ${field("clinic-location", "Localização", clinic.location)}
      <div class="form-grid">${field("clinic-price", "Valor da avaliação", clinic.evaluationPrice, false, "number", "300")}${field("clinic-target", "Meta diária de leads", clinic.target || 5, true, "number", "5")}</div>
      <div class="priority-form-block">
        ${field("clinic-investment", "Faixa mensal de faturamento", clinic.trafficInvestment, true, "number", "5000")}
        <div class="priority-preview" id="priority-preview">
          <span class="priority-letter">${currentPriority.key}</span>
          <div><strong>${currentPriority.label}</strong><small>Ronda de até ${currentPriority.minutes} min por sessão</small></div>
        </div>
        <p>O app calcula a prioridade automaticamente: A a partir de R$ 5 mil, B a partir de R$ 3 mil e C abaixo disso.</p>
      </div>
      <button class="primary-button" type="submit">${edit ? "Salvar alterações" : "Salvar clínica"}</button>
      ${edit ? `<button class="danger-link" type="button" id="archive-clinic">Arquivar clínica</button>` : ""}
    </form>`, () => {
    const updatePriorityPreview = () => {
      const key = priorityFromInvestment($("#clinic-investment").value);
      const priority = clinicPriorities[key];
      $("#priority-preview").innerHTML = `<span class="priority-letter">${key}</span><div><strong>${priority.label}</strong><small>Ronda de até ${priority.minutes} min por sessão</small></div>`;
    };
    $("#clinic-investment").addEventListener("input", updatePriorityPreview);
    $("#clinic-form").addEventListener("submit", event => {
      event.preventDefault();
      const trafficInvestment = Number($("#clinic-investment").value || 0);
      const record = {
        id: clinicId || uid("clinic"), name: $("#clinic-name").value.trim(), doctor: $("#clinic-doctor").value.trim(),
        instagram: instagramHandle($("#clinic-instagram").value), hunter: $("#clinic-hunter").value.trim(),
        hunterPhone: phoneDigits($("#clinic-hunter-phone").value), protocol: $("#clinic-protocol").value.trim(),
        location: $("#clinic-location").value.trim(), evaluationPrice: Number($("#clinic-price").value || 0),
        trafficInvestment, priority: priorityFromInvestment(trafficInvestment),
        target: Number($("#clinic-target").value || 0), color: clinic.color || ["#75566f", "#df765f", "#1f6b57", "#dda94c"][state.clinics.length % 4], active: true
      };
      if (edit) Object.assign(clinic, record); else state.clinics.push(record);
      persist(); renderClinics(); closeSheet(); showToast(edit ? "Clínica atualizada" : "Clínica cadastrada");
    });
    $("#archive-clinic")?.addEventListener("click", () => { clinic.active = false; persist(); renderClinics(); closeSheet(); showToast("Clínica arquivada"); });
  });
}

function field(id, label, value = "", required = false, type = "text", placeholder = "") {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(String(value ?? ""))}" placeholder="${placeholder}" ${required ? "required" : ""}></div>`;
}

function qualificationChecklist(lead = {}) {
  const progress = qualificationProgress(lead.qualification);
  return `<div class="bant-progress">
      <div><strong id="bant-progress-label">${progress.done} de ${progress.total} pontos alinhados</strong><small>Preencha somente o que descobriu</small></div>
      <span><i id="bant-progress-bar" style="width:${progress.percent}%"></i></span>
    </div>
    <div class="qualification-checklist">${qualificationGroups.map(group => `
      <section class="bant-group" data-bant-group="${group.key}">
        <div class="bant-group-heading"><span>${group.key}</span><div><strong>${group.title}</strong><small>${group.helper}</small></div></div>
        <button class="bant-prompt" type="button" data-copy-bant="${group.key}">
          <span class="material-symbols-outlined">content_copy</span>
          <span><small>Pergunta sugerida</small>${escapeHtml(group.prompt)}</span>
        </button>
        <div class="bant-checks">${group.items.map(([key, label]) => `
          <label class="qualification-check"><input id="qualification-${key}" type="checkbox" ${lead.qualification?.[key] ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>
      </section>`).join("")}</div>`;
}

function readQualification() {
  return Object.fromEntries(qualificationItems.map(([key]) => [key, Boolean($(`#qualification-${key}`)?.checked)]));
}

function qualificationProgress(qualification = {}) {
  const total = qualificationItems.length;
  const done = qualificationItems.filter(([key]) => Boolean(qualification?.[key])).length;
  return { done, total, percent: total ? Math.round(done / total * 100) : 0, complete: done === total };
}

function isBantComplete(lead = {}) {
  return qualificationProgress(lead.qualification).complete;
}

function openLeadForm({ leadId = null, mode = "mapped", onSaved = null } = {}) {
  const originalLead = leadId ? leadById(leadId) : null;
  const lead = originalLead || {};
  const edit = Boolean(originalLead);
  const isPhone = mode === "phone";
  const isResponse = mode === "response";
  const fixedStatus = isPhone ? "sent_to_hunter" : isResponse ? "talking" : null;
  const title = edit ? "Editar lead" : isPhone ? "Telefone captado" : isResponse ? "Lead respondeu" : "Lead mapeado";
  const submitLabel = isPhone ? "🎉 Salvar e enviar para closer" : edit ? "Salvar alterações" : isResponse ? "Salvar em Conversando" : "Salvar lead";
  const initialBant = qualificationProgress(lead.qualification);
  openSheet(`<h2 class="sheet-title">${title}</h2><p class="sheet-subtitle">${isPhone ? "Conclua a pré-qualificação e entregue a oportunidade sem a closer repetir perguntas." : "Cole o @ ou o link do Instagram para não perder a conversa."}</p>
    <form class="sheet-form" id="lead-form">
      ${field("lead-instagram", "Instagram", lead.instagram, true, "text", "@usuario ou link")}
      ${field("lead-name", "Nome", lead.name, false, "text", "Nome do lead")}
      ${edit && !isPhone ? field("lead-phone", "WhatsApp", lead.whatsapp, false, "tel", "(00) 00000-0000") : ""}
      <div class="field"><label for="lead-clinic">Clínica</label><select id="lead-clinic">${state.clinics.filter(c => c.active).map(c => `<option value="${c.id}" ${(lead.clinicId || state.session?.clinicId) === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
      <div class="qualification-block">
        <div class="qualification-heading"><span class="material-symbols-outlined">verified</span><div><strong>Contexto da conversa</strong><small>Evita que a closer repita o que já foi falado.</small></div></div>
        ${field("lead-interest", "Procedimento de interesse", lead.interest, false, "text", "Ex.: Botox, avaliação facial")}
        <div class="field"><label for="lead-temperature">Temperatura</label><select id="lead-temperature">
          <option value="cold" ${lead.temperature === "cold" ? "selected" : ""}>Frio</option>
          <option value="warm" ${(!lead.temperature || lead.temperature === "warm") ? "selected" : ""}>Morno</option>
          <option value="hot" ${lead.temperature === "hot" ? "selected" : ""}>Quente</option>
        </select></div>
        ${qualificationChecklist(lead)}
      </div>
      ${isPhone ? `<div class="phone-gate ${initialBant.complete ? "complete" : ""}" id="phone-gate"><span class="material-symbols-outlined">${initialBant.complete ? "verified" : "fact_check"}</span><p><strong>${initialBant.complete ? "Contexto completo" : "BANT é um guia, não uma trava"}</strong><small>${initialBant.complete ? "A Hunter receberá toda a pré-qualificação." : "Marque o que conseguiu descobrir e envie mesmo com contexto mínimo."}</small></p></div>` : ""}
      ${isPhone ? field("lead-phone", "WhatsApp para entrega", lead.whatsapp, false, "tel", "(00) 00000-0000") : ""}
      ${fixedStatus ? "" : `<div class="field"><label for="lead-status">Etapa do lead</label><select id="lead-status">${Object.entries(statusNames).map(([key, label]) => `<option value="${key}" ${(lead.status || "new") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>`}
      ${isPhone ? "" : `<div class="field"><label for="lead-followup">Próximo follow-up <span class="optional">(opcional)</span></label><input id="lead-followup" type="datetime-local"></div>`}
      <button class="primary-button ${isPhone ? "victory-button" : ""}" id="lead-submit" type="submit">${submitLabel}</button>
    </form>`, () => {
    $("#lead-instagram").addEventListener("blur", event => { event.target.value = instagramHandle(event.target.value); });
    const updateBantGate = () => {
      const progress = qualificationProgress(readQualification());
      $("#bant-progress-label").textContent = `${progress.done} de ${progress.total} pontos alinhados`;
      $("#bant-progress-bar").style.width = `${progress.percent}%`;
      if (!isPhone) return;
      $("#phone-gate").classList.toggle("complete", progress.complete);
      $("#phone-gate").innerHTML = `<span class="material-symbols-outlined">${progress.complete ? "verified" : "fact_check"}</span><p><strong>${progress.complete ? "Contexto completo" : "BANT é um guia, não uma trava"}</strong><small>${progress.complete ? "A Hunter receberá toda a pré-qualificação." : `${progress.done} pontos serão enviados; complete apenas o que souber.`}</small></p>`;
    };
    $$("[id^='qualification-']").forEach(input => input.addEventListener("change", updateBantGate));
    $$("[data-copy-bant]").forEach(button => button.addEventListener("click", async () => {
      const group = qualificationGroups.find(item => item.key === button.dataset.copyBant);
      await navigator.clipboard.writeText(group.prompt);
      showToast(`Pergunta ${group.key} copiada`);
    }));
    updateBantGate();
    $("#lead-form").addEventListener("submit", event => {
      event.preventDefault();
      const clinicId = $("#lead-clinic").value;
      const instagram = instagramHandle($("#lead-instagram").value);
      const existing = !edit ? state.leads.find(item => item.clinicId === clinicId && instagramHandle(item.instagram) === instagram) : null;
      const record = originalLead || existing || {
        id: uid("lead"), prospectedAt: new Date().toISOString(), timeline: [], sentToHunterAt: null
      };
      const now = new Date().toISOString();
      const status = fixedStatus || $("#lead-status").value;
      const shouldSend = isPhone || (status === "sent_to_hunter" && !record.sentToHunterAt);
      record.timeline ||= [];
      Object.assign(record, {
        name: $("#lead-name").value.trim(), instagram,
        whatsapp: $("#lead-phone") ? phoneDigits($("#lead-phone").value) : record.whatsapp || "",
        clinicId, status, lastContactAt: now,
        interest: $("#lead-interest").value.trim(),
        temperature: $("#lead-temperature").value,
        qualification: readQualification()
      });
      if (!originalLead && !existing) state.leads.unshift(record);
      if (isResponse) record.timeline.push({ at: now, label: existing ? "Nova resposta registrada" : "Lead respondeu ao direct" });
      else if (isPhone) record.timeline.push({ at: now, label: "WhatsApp captado e qualificação concluída" });
      else record.timeline.push({ at: now, label: edit ? `Etapa alterada para ${statusNames[status]}` : "Lead mapeado" });
      const followupAt = $("#lead-followup")?.value;
      if (followupAt) {
        state.followups.push({ id: uid("fu"), leadId: record.id, scheduledFor: new Date(followupAt).toISOString(), step: "Follow-up", status: "pending" });
        record.status = "follow_up";
        record.timeline.push({ at: now, label: `Follow-up agendado para ${formatDate(followupAt, true)}` });
      }
      if (shouldSend) {
        record.status = "sent_to_hunter";
        record.sentToHunterAt ||= now;
        record.timeline.push({ at: now, label: `Encaminhado para ${clinicById(clinicId)?.hunter || "closer"}` });
      }
      persist();
      renderDashboard();
      renderLeads();
      renderFollowups();
      closeSheet();
      onSaved?.(record);
      if (shouldSend) openHunterWhatsApp(record);
      else showToast(edit || existing ? "Lead atualizado" : "Lead salvo");
    });
  });
}

function openLeadDetail(leadId) {
  const lead = leadById(leadId); const clinic = clinicById(lead.clinicId);
  const progress = qualificationProgress(lead.qualification);
  const bantSummary = qualificationGroups.map(group => {
    const checked = group.items.filter(([key]) => lead.qualification?.[key]);
    return `<section class="bant-summary-group"><span>${group.key}</span><div><strong>${group.title}</strong>${checked.length ? checked.map(([, label]) => `<small>✓ ${escapeHtml(label)}</small>`).join("") : "<small>Ainda não explorado</small>"}</div></section>`;
  }).join("");
  const canSend = lead.whatsapp && !lead.sentToHunterAt;
  const hunterTracking = lead.sentToHunterAt ? `<div class="hunter-tracking">
      <div><span class="material-symbols-outlined">${lead.status === "attended" ? "verified" : lead.status === "no_show" ? "event_busy" : lead.status === "scheduled" ? "event_available" : "hourglass_top"}</span>
        <p><strong>Retorno da Hunter</strong><small>${lead.status === "attended" ? "Paciente compareceu" : lead.status === "no_show" ? "Paciente não compareceu" : lead.status === "scheduled" ? `Agendado para ${formatDate(lead.scheduledAt, true)}` : "Aguardando confirmação do agendamento"}</small></p>
      </div>
      ${["sent_to_hunter", "scheduled"].includes(lead.status) ? `<button class="small-link" id="hunter-update">Atualizar</button>` : ""}
    </div>` : "";
  openSheet(`<div class="lead-detail-head"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div><div><h2 class="sheet-title">${escapeHtml(lead.name || lead.instagram)}</h2><p class="sheet-subtitle">${escapeHtml(lead.instagram)} · ${clinic?.name || ""}</p></div></div>
    <div class="qualification-summary">
      <div><span>Interesse</span><strong>${escapeHtml(lead.interest || "Ainda não informado")}</strong></div>
      <div><span>Temperatura</span><strong class="lead-temperature ${lead.temperature || "cold"}">${{ hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Não avaliado"}</strong></div>
      <div><span>WhatsApp</span><strong>${lead.whatsapp ? escapeHtml(lead.whatsapp) : "Ainda não captado"}</strong></div>
    </div>
    <div class="lead-bant-head"><h3 class="timeline-title">Pré-qualificação BANT</h3><span>${progress.done}/${progress.total}</span></div>
    <div class="bant-summary">${bantSummary}</div>
    ${hunterTracking}
    <div class="detail-actions"><button class="secondary-button" id="edit-lead">Editar</button><button class="primary-button" id="contact-lead">Abrir Instagram</button></div>
    <h3 class="timeline-title">Histórico resumido</h3><div class="timeline">${[...(lead.timeline || [])].reverse().map(item => `<div><i></i><span><strong>${escapeHtml(item.label)}</strong><small>${formatDate(item.at, true)}</small></span></div>`).join("")}</div>
    ${canSend ? `<button class="primary-button" id="send-hunter"><span class="material-symbols-outlined">forward_to_inbox</span>Enviar para closer</button>` : ""}`, () => {
    $("#edit-lead").addEventListener("click", () => openLeadForm({ leadId }));
    $("#contact-lead").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#hunter-update")?.addEventListener("click", () => openHunterUpdate(leadId));
    $("#send-hunter")?.addEventListener("click", () => { lead.status = "sent_to_hunter"; lead.sentToHunterAt = new Date().toISOString(); lead.timeline.push({ at: lead.sentToHunterAt, label: `Enviado para ${clinic.hunter}` }); persist(); renderLeads(); renderDashboard(); openHunterWhatsApp(lead); });
  });
}

function openHunterUpdate(leadId) {
  const lead = leadById(leadId);
  const clinic = clinicById(lead.clinicId);
  if (lead.status === "sent_to_hunter") {
    openSheet(`<h2 class="sheet-title">Retorno da Hunter</h2><p class="sheet-subtitle">${escapeHtml(clinic?.hunter || "A closer")} confirmou o agendamento? Registre apenas o essencial.</p>
      <form class="sheet-form" id="hunter-schedule-form">
        <div class="field"><label for="hunter-scheduled-at">Data e hora do agendamento</label><input id="hunter-scheduled-at" type="datetime-local" required></div>
        <button class="primary-button" type="submit"><span class="material-symbols-outlined">event_available</span> Confirmar agendamento</button>
      </form>`, () => {
      $("#hunter-schedule-form").addEventListener("submit", event => {
        event.preventDefault();
        const scheduledAt = new Date($("#hunter-scheduled-at").value).toISOString();
        lead.status = "scheduled";
        lead.scheduledAt = scheduledAt;
        lead.timeline.push({ at: new Date().toISOString(), label: `Hunter confirmou agendamento para ${formatDate(scheduledAt, true)}` });
        persist(); renderDashboard(); renderLeads(); renderReport(); openLeadDetail(leadId); showToast("Agendamento confirmado");
      });
    });
    return;
  }
  openSheet(`<h2 class="sheet-title">A paciente compareceu?</h2><p class="sheet-subtitle">Atualize com o retorno da Hunter para fechar o funil real.</p>
    <div class="attendance-choice">
      <button class="primary-button" id="mark-attended"><span class="material-symbols-outlined">verified</span> Sim, compareceu</button>
      <button class="secondary-button" id="mark-no-show"><span class="material-symbols-outlined">event_busy</span> Não compareceu</button>
    </div>`, () => {
    $("#mark-attended").addEventListener("click", () => saveAttendanceOutcome(lead, "attended"));
    $("#mark-no-show").addEventListener("click", () => saveAttendanceOutcome(lead, "no_show"));
  });
}

function saveAttendanceOutcome(lead, outcome) {
  const now = new Date().toISOString();
  lead.status = outcome;
  if (outcome === "attended") lead.attendedAt = now;
  else lead.noShowAt = now;
  lead.timeline.push({ at: now, label: outcome === "attended" ? "Hunter confirmou o comparecimento" : "Hunter informou que não compareceu" });
  persist(); renderDashboard(); renderLeads(); renderReport(); openLeadDetail(lead.id);
  showToast(outcome === "attended" ? "Comparecimento registrado" : "Ausência registrada");
}

function openHunterWhatsApp(lead) {
  const clinic = clinicById(lead.clinicId);
  if (!clinic) return showToast("Clínica não encontrada para esta entrega.");
  const temperature = { hot: "🔥 Quente", warm: "🌤️ Morno", cold: "❄️ Frio" }[lead.temperature] || "Não avaliada";
  const alignedGroups = qualificationGroups.map(group => {
    const checked = group.items.filter(([key]) => lead.qualification?.[key]);
    return checked.length ? `*${group.key} · ${group.title}*\n${checked.map(([, label]) => `✅ ${label}`).join("\n")}` : "";
  }).filter(Boolean);
  const aligned = alignedGroups.length ? alignedGroups.join("\n\n") : "▫️ Contexto mínimo — seguir a qualificação na conversa.";
  const message = `🎉 *NOVA OPORTUNIDADE PARA VOCÊ!*\n\nBoa, ${clinic.hunter}! A *${clinic.name}* recebeu um novo contato para você assumir. 🚀\n\n👤 *Lead*\n• Nome: ${lead.name || "Não informado"}\n• Instagram: ${lead.instagram || "Não informado"}\n• WhatsApp: ${lead.whatsapp || "Não informado"}\n• Interesse: ${lead.interest || "Ainda não identificado"}\n• Temperatura: ${temperature}\n\n🧭 *O que a social seller conseguiu alinhar*\n${aligned}\n\n✨ Continue a qualificação a partir daqui e avance para o agendamento.\n\n📅 Captado em ${formatDate(lead.prospectedAt, true)}`;
  showToast("🎉 Lead qualificado e mensagem preparada!");
  window.open(`https://wa.me/${clinic.hunterPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function openFollowup(followupId) {
  const followup = state.followups.find(item => item.id === followupId);
  const lead = leadById(followup.leadId);
  const clinic = clinicById(lead.clinicId);
  const suggested = state.templates.find(template => followup.step.toLowerCase().includes("whatsapp") ? template.category === "ask_phone" : followup.step.includes("2º") ? template.category === "second_follow_up" : template.category === "first_follow_up");
  const message = personalize(suggested?.message || state.templates[1].message, lead, clinic);
  openSheet(`<h2 class="sheet-title">${escapeHtml(followup.step)}</h2><p class="sheet-subtitle">${escapeHtml(lead.name || lead.instagram)} · ${escapeHtml(lead.instagram)}</p>
    <div class="message-preview">${escapeHtml(message)}</div>
    <div class="detail-actions"><button class="secondary-button" id="copy-followup">Copiar mensagem</button><button class="primary-button" id="open-followup-instagram">Abrir Instagram</button></div>
    <button class="primary-button" id="complete-followup">Marcar como realizado</button>`, () => {
    $("#copy-followup").addEventListener("click", async () => { await navigator.clipboard.writeText(message); showToast("Mensagem copiada"); });
    $("#open-followup-instagram").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#complete-followup").addEventListener("click", () => {
      followup.status = "completed"; followup.completedAt = new Date().toISOString(); lead.status = "talking"; lead.lastContactAt = followup.completedAt;
      lead.timeline.push({ at: followup.completedAt, label: `${followup.step} realizado` });
      persist(); renderFollowups(); renderDashboard(); closeSheet(); showToast("Follow-up concluído");
    });
  });
}
function personalize(message, lead, clinic) { return message.replaceAll("{{nome}}", lead.name?.split(" ")[0] || "").replaceAll("{{clinica}}", clinic?.name || "clínica"); }

function openMessages() {
  openSheet(`<h2 class="sheet-title">Mensagens rápidas</h2><p class="sheet-subtitle">Copie, personalize e envie com naturalidade.</p>${state.templates.map(template => `<div class="template-card"><strong>${escapeHtml(template.title)}</strong><p>${escapeHtml(template.message)}</p><button class="small-link copy-template" data-template="${template.id}">Copiar mensagem</button></div>`).join("")}`, () => {
    $$(".copy-template").forEach(button => button.addEventListener("click", async () => {
      const template = state.templates.find(item => item.id === button.dataset.template);
      await navigator.clipboard.writeText(template.message); showToast("Mensagem copiada");
    }));
  });
}

function openSettings() {
  openSheet(`<h2 class="sheet-title">Preferências</h2><p class="sheet-subtitle">Seu espaço de operação manual</p>
    <div class="template-card"><strong>Dados</strong><p>${isSupabaseConfigured ? "Espaço compartilhado da equipe com sincronização em tempo real." : "Modo local de validação. Os dados ficam somente neste navegador."}</p></div>
    <div class="template-card"><strong>Instalar no iPhone</strong><p>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div>
    <button class="danger-link" id="reset-demo">Apagar dados locais de demonstração</button>`, () => {
    $("#reset-demo").addEventListener("click", () => {
      if (!confirm("Apagar os dados locais e voltar ao estado inicial?")) return;
      localStorage.removeItem(operationalStorageKey()); location.reload();
    });
  });
}

function canvasRoundedRect(ctx, x, y, width, height, radius, fill, stroke = null) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function canvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasMetric(ctx, x, y, value, label, tone = "#1f6b57") {
  canvasRoundedRect(ctx, x, y, 282, 106, 20, "#f7f8f5", "#e2e7e1");
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.arc(x + 24, y + 27, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#172521";
  ctx.font = "700 40px Arial";
  ctx.fillText(String(value), x + 24, y + 70);
  ctx.fillStyle = "#708079";
  ctx.font = "500 20px Arial";
  ctx.fillText(label, x + 88, y + 64);
}

async function exportReport(share = false) {
  const stats = periodStats(state.reportPeriod);
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const responseRate = stats.directs ? Math.round(stats.responses / stats.directs * 100) : 0;
  const appointmentRate = stats.hunters ? Math.round(stats.scheduled / stats.hunters * 100) : 0;
  const attendanceRate = stats.scheduled ? Math.round(stats.attended / stats.scheduled * 100) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#eef3ef");
  background.addColorStop(.48, "#f6f3ed");
  background.addColorStop(1, "#e9efeb");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(31,107,87,.07)";
  ctx.beginPath(); ctx.arc(1030, 90, 245, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(117,86,111,.045)";
  ctx.beginPath(); ctx.arc(40, 1290, 225, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(27,55,46,.12)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  canvasRoundedRect(ctx, 44, 38, 992, 1274, 42, "#fffefa");
  ctx.restore();

  try {
    const mark = await canvasImage("assets/munnius-mark.png");
    ctx.drawImage(mark, 82, 78, 42, 42);
  } catch {
    canvasRoundedRect(ctx, 84, 80, 38, 38, 10, null, "#1f6b57");
  }
  ctx.fillStyle = "#688078";
  ctx.font = "700 17px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("RELATÓRIO DE OPERAÇÃO", 146, 97);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#172521";
  ctx.font = "700 62px Arial";
  ctx.fillText($("#report-label").textContent, 82, 184);
  ctx.fillStyle = "#71807a";
  ctx.font = "400 22px Arial";
  ctx.fillText($("#report-date").textContent, 84, 220);
  canvasRoundedRect(ctx, 820, 82, 160, 42, 21, "#e8f2ed");
  ctx.fillStyle = "#1f6b57";
  ctx.font = "700 17px Arial";
  ctx.textAlign = "center";
  ctx.fillText("SOCIAL SELLING", 900, 109);
  ctx.textAlign = "left";

  const heroGradient = ctx.createLinearGradient(74, 255, 1000, 490);
  heroGradient.addColorStop(0, "#173e35");
  heroGradient.addColorStop(.62, "#1f6b57");
  heroGradient.addColorStop(1, "#3b8d73");
  canvasRoundedRect(ctx, 74, 254, 932, 226, 32, heroGradient);
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.beginPath(); ctx.arc(965, 270, 125, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.font = "700 16px Arial";
  ctx.fillText("DESEMPENHO DO PERÍODO", 104, 294);
  const heroMetrics = [
    [actions, "Ações"],
    [stats.hunters, "Qualificados"],
    [stats.scheduled, "Agendados"],
    [stats.attended, "Compareceram"]
  ];
  heroMetrics.forEach(([value, label], index) => {
    const x = 104 + index * 220;
    ctx.fillStyle = "#ffffff";
    ctx.font = `${String(value).length > 6 ? "700 34px" : "700 47px"} Arial`;
    ctx.fillText(String(value), x, 384);
    ctx.fillStyle = "rgba(255,255,255,.68)";
    ctx.font = "500 19px Arial";
    ctx.fillText(label, x, 419);
  });

  ctx.fillStyle = "#172521";
  ctx.font = "700 24px Arial";
  ctx.fillText("Atividade da operação", 82, 535);
  ctx.fillStyle = "#829089";
  ctx.font = "400 17px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Esforço registrado", 998, 535);
  ctx.textAlign = "left";
  const activityMetrics = [
    [stats.profiles, "Novos follows", "#75566f"],
    [stats.likes, "Curtidas", "#d9686f"],
    [stats.comments, "Comentários", "#4b75a9"],
    [stats.directs, "Directs", "#6b61b3"],
    [stats.responses, "Responderam", "#c08732"],
    [stats.phones, "Telefones", "#1f6b57"]
  ];
  activityMetrics.forEach(([value, label, tone], index) => {
    const x = 82 + (index % 3) * 306;
    const y = 560 + Math.floor(index / 3) * 122;
    canvasMetric(ctx, x, y, value, label, tone);
  });

  ctx.fillStyle = "#172521";
  ctx.font = "700 24px Arial";
  ctx.fillText("Eficiência do funil", 82, 837);
  canvasRoundedRect(ctx, 82, 860, 916, 104, 24, "#eff5f1");
  const efficiency = [
    [`${responseRate}%`, "Taxa de resposta"],
    [`${appointmentRate}%`, "Agendamento por qualificado"],
    [`${attendanceRate}%`, "Comparecimento"]
  ];
  efficiency.forEach(([value, label], index) => {
    const x = 112 + index * 294;
    if (index) {
      ctx.strokeStyle = "#d7e3dc";
      ctx.beginPath(); ctx.moveTo(x - 24, 886); ctx.lineTo(x - 24, 938); ctx.stroke();
    }
    ctx.fillStyle = "#1f6b57";
    ctx.font = "700 31px Arial";
    ctx.fillText(value, x, 909);
    ctx.fillStyle = "#71807a";
    ctx.font = "500 17px Arial";
    ctx.fillText(label, x, 938);
  });

  ctx.fillStyle = "#172521";
  ctx.font = "700 24px Arial";
  ctx.fillText("Destaques por clínica", 82, 1015);
  const clinicRows = state.clinics.filter(clinic => clinic.active).map(clinic => {
    const sessions = stats.sessions.filter(session => session.clinicId === clinic.id);
    return {
      clinic,
      actions: sessions.reduce((total, session) => total + sessionActionCount(session), 0),
      seconds: sessions.reduce((total, session) => total + Number(session.durationSeconds || 0), 0),
      leads: state.leads.filter(lead => lead.clinicId === clinic.id && inPeriod(lead.prospectedAt, state.reportPeriod)).length
    };
  }).filter(row => row.actions || row.leads).sort((a, b) => (b.leads - a.leads) || (b.actions - a.actions)).slice(0, 3);
  if (clinicRows.length) {
    clinicRows.forEach(({ clinic, actions: clinicActions, seconds, leads }, index) => {
      const y = 1040 + index * 66;
      ctx.fillStyle = clinic.color || "#1f6b57";
      ctx.beginPath(); ctx.arc(101, y + 25, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 15px Arial";
      ctx.textAlign = "center";
      ctx.fillText(initials(clinic.name).slice(0, 1), 101, y + 30);
      ctx.textAlign = "left";
      ctx.fillStyle = "#253832";
      ctx.font = "700 19px Arial";
      const clinicName = clinic.name.length > 30 ? `${clinic.name.slice(0, 29)}…` : clinic.name;
      ctx.fillText(clinicName, 134, y + 21);
      ctx.fillStyle = "#7a8782";
      ctx.font = "400 16px Arial";
      ctx.fillText(`${clinicActions} ações · ${compactDuration(seconds)}`, 134, y + 45);
      ctx.fillStyle = "#1f6b57";
      ctx.font = "700 19px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`${leads} ${leads === 1 ? "lead" : "leads"}`, 982, y + 32);
      ctx.textAlign = "left";
      if (index < clinicRows.length - 1) {
        ctx.strokeStyle = "#e6e9e4";
        ctx.beginPath(); ctx.moveTo(134, y + 61); ctx.lineTo(982, y + 61); ctx.stroke();
      }
    });
  } else {
    ctx.fillStyle = "#7a8782";
    ctx.font = "400 18px Arial";
    ctx.fillText("As clínicas aparecem aqui quando houver atividade no período.", 82, 1062);
  }

  ctx.strokeStyle = "#e0e5df";
  ctx.beginPath(); ctx.moveTo(82, 1250); ctx.lineTo(998, 1250); ctx.stroke();
  ctx.fillStyle = "#7d8a84";
  ctx.font = "400 15px Arial";
  ctx.fillText("Relatório de social selling", 82, 1283);
  ctx.textAlign = "right";
  ctx.fillText(`Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`, 998, 1283);
  ctx.textAlign = "left";

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", .96));
  const file = new File([blob], `relatorio-social-selling-${state.reportPeriod}.png`, { type: "image/png" });
  if (share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Relatório de social selling" });
  } else {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Relatório baixado em imagem");
  }
}

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const result = await authGateway.signIn($("#email").value, $("#password").value);
  if (!result.ok) return showToast(result.message);
  await openWorkspace(isSupabaseConfigured ? "Bem-vindo de volta" : "Ambiente local aberto");
});
if (googleEnabled) {
  $("#google-login").classList.remove("hidden");
  $("#google-divider").classList.remove("hidden");
}
$("#google-login").addEventListener("click", async () => {
  const button = $("#google-login");
  button.disabled = true;
  button.querySelector("span").textContent = "Abrindo Google...";
  const result = await authGateway.signInWithGoogle();
  if (!result.ok) {
    button.disabled = false;
    button.querySelector("span").textContent = "Continuar com Google";
    showToast(result.message);
  }
});
$("#toggle-password").addEventListener("click", () => { const input = $("#password"); input.type = input.type === "password" ? "text" : "password"; $("#toggle-password").textContent = input.type === "password" ? "Ver" : "Ocultar"; });
$("#forgot-password").addEventListener("click", async () => {
  const email = $("#email").value;
  if (!email) return showToast("Digite seu e-mail primeiro");
  const button = $("#forgot-password");
  button.disabled = true;
  button.textContent = "Enviando...";
  const result = await authGateway.resetPassword?.(email);
  button.disabled = false;
  button.textContent = "Esqueci minha senha";
  showToast(result?.message || "Não foi possível solicitar a recuperação.");
});
$("#recovery-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = $("#new-password").value;
  const confirmation = $("#confirm-password").value;
  if (password.length < 8) return showToast("Use pelo menos 8 caracteres.");
  if (password !== confirmation) return showToast("As senhas não são iguais.");
  const button = $("#save-password");
  button.disabled = true;
  button.textContent = "Salvando...";
  const result = await authGateway.updatePassword(password);
  if (!result.ok) {
    button.disabled = false;
    button.textContent = "Salvar senha e entrar";
    return showToast(result.message);
  }
  recoveryMode = false;
  history.replaceState({}, document.title, location.pathname);
  await openWorkspace("Senha criada. Bem-vindo!");
});
$("#signout").addEventListener("click", async () => { await authGateway.signOut(); location.reload(); });
$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-period]").forEach(button => button.addEventListener("click", () => { $$("[data-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.period = button.dataset.period; renderDashboard(); }));
$$("[data-report-period]").forEach(button => button.addEventListener("click", () => { $$("[data-report-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.reportPeriod = button.dataset.reportPeriod; renderReport(); }));
$("#choose-clinic").addEventListener("click", clinicPicker);
$$("[data-action]").forEach(button => button.addEventListener("click", () => handleSessionAction(button.dataset.action)));
$("#undo-action").addEventListener("click", () => state.lastAction ? (updateAction(state.lastAction, -1), state.lastAction = null, showToast("Última ação desfeita")) : showToast("Nenhuma ação para desfazer"));
$("#adjust-counts").addEventListener("click", openAdjustCounts);
$("#finish-session").addEventListener("click", finishSession);
$("#open-instagram").addEventListener("click", () => { const clinic = clinicById(state.session?.clinicId); if (clinic) window.open(`https://instagram.com/${clinic.instagram.replace("@", "")}`, "_blank", "noopener"); });
$("#quick-lead").addEventListener("click", () => openLeadForm({ mode: "response" }));
$("#new-lead").addEventListener("click", () => openLeadForm({ mode: "response" }));
$("#lead-search").addEventListener("input", renderLeads);
$("#lead-priority-filter").addEventListener("change", event => { state.priorityFilter = event.target.value; renderLeads(); });
$("#kanban-prev").addEventListener("click", () => $("#lead-kanban").scrollBy({ left: -Math.max(280, $("#lead-kanban").clientWidth * .86), behavior: "smooth" }));
$("#kanban-next").addEventListener("click", () => $("#lead-kanban").scrollBy({ left: Math.max(280, $("#lead-kanban").clientWidth * .86), behavior: "smooth" }));
$$("[data-followup-filter]").forEach(button => button.addEventListener("click", () => { $$("[data-followup-filter]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.followupFilter = button.dataset.followupFilter; renderFollowups(); }));
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", event => { if (event.target === $("#sheet-backdrop")) closeSheet(); });
$$("[data-sheet]").forEach(button => button.addEventListener("click", () => button.dataset.sheet === "messages" ? openMessages() : openSettings()));
$("#add-clinic").addEventListener("click", () => openClinicForm());
$("#export-report").addEventListener("click", () => exportReport(false));
$("#share-report").addEventListener("click", () => exportReport(true));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeSheet(); });

async function initializeAuth() {
  if (!isSupabaseConfigured) return;
  await authGateway.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showRecoveryForm();
      return;
    }
    if (event === "SIGNED_IN" && session && !recoveryMode) {
      await openWorkspace("Bem-vindo de volta");
    }
  });
  const session = await authGateway.getSession();
  if (recoveryMode) {
    showRecoveryForm();
    return;
  }
  if (session) await openWorkspace("Bem-vindo de volta");
}

initializeAuth().catch(error => {
  console.warn("Não foi possível restaurar a sessão.", error);
  showToast("Não foi possível restaurar seu acesso.");
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
