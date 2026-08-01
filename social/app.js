import { authGateway, dataGateway, isSupabaseConfigured } from "./supabase-client.js?v=41";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = "munnius-social-v3";
const LEGACY_STORAGE_KEY = "munnius-social-v2";
const countLabels = { likes: "Curtidas", comments: "Comentários", directs: "Directs", responses: "Responderam", phones: "Telefones captados" };
const titles = { home: "Visão geral", session: "Sessão", leads: "Leads", more: "Perfil", settings: "Configurações", clinics: "Clínicas", reports: "Relatórios", admin: "Administração" };
const statusNames = {
  new: "Lead mapeado",
  talking: "Conversando",
  follow_up: "Conversando",
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
const initialAuthFlow = new URLSearchParams(location.hash.slice(1)).get("type")
  || new URLSearchParams(location.search).get("type")
  || (new URLSearchParams(location.search).has("invite") ? "invite" : "");
const recoveryLinkDetected = ["recovery", "invite"].includes(initialAuthFlow);
const invitationLinkDetected = initialAuthFlow === "invite";

const seed = {
  version: 3,
  profile: { name: "Usuário", initials: "US", role: "social_seller" },
  clinics: [
    { id: "bella", name: "Clínica Bella", doctor: "Dra. Beatriz", instagram: "@clinicabella", hunter: "Ana", hunterPhone: "5541999990001", protocol: "Glow", location: "Curitiba, PR", evaluationPrice: 300, trafficInvestment: 6000, priority: "A", target: 8, color: "#7c6f91", active: true },
    { id: "aura", name: "Instituto Aura", doctor: "Dra. Camila", instagram: "@institutoaura", hunter: "Marina", hunterPhone: "5541999990002", protocol: "Aura Natural", location: "São Paulo, SP", evaluationPrice: 250, trafficInvestment: 4000, priority: "B", target: 6, color: "#ef7d62", active: true },
    { id: "leve", name: "Clínica Leve", doctor: "Dra. Renata", instagram: "@clinicaleve", hunter: "Clara", hunterPhone: "5541999990003", protocol: "Leve Face", location: "Belo Horizonte, MG", evaluationPrice: 280, trafficInvestment: 2500, priority: "C", target: 5, color: "#3f5b78", active: true }
  ],
  leads: [
    { id: "lead-1", name: "Mariana Costa", instagram: "@maricosta", whatsapp: "", clinicId: "bella", status: "talking", interest: "Harmonização facial", location: "Curitiba", temperature: "warm", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: null, timeline: [{ at: new Date().toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-2", name: "Júlia Martins", instagram: "@jumartins", whatsapp: "", clinicId: "aura", status: "follow_up", interest: "Botox", location: "São Paulo", temperature: "warm", prospectedAt: new Date(Date.now() - 86400000).toISOString(), lastContactAt: new Date(Date.now() - 86400000).toISOString(), sentToHunterAt: null, timeline: [{ at: new Date(Date.now() - 86400000).toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-3", name: "Fernanda Lima", instagram: "@fernandalima", whatsapp: "41999990010", clinicId: "leve", status: "sent_to_hunter", interest: "Preenchimento labial", location: "Belo Horizonte", temperature: "hot", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: new Date().toISOString(), timeline: [{ at: new Date().toISOString(), label: "Enviado para closer" }] }
  ],
  directs: [],
  anonymousDirectBatches: [],
  anonymousConversationBatches: [],
  anonymousDirectsVersion: 0,
  followups: [
    { id: "fu-1", leadId: "lead-2", scheduledFor: new Date(Date.now() - 3600000).toISOString(), step: "1º follow-up", status: "pending" },
    { id: "fu-2", leadId: "lead-1", scheduledFor: new Date(Date.now() + 5400000).toISOString(), step: "Pedir WhatsApp", status: "pending" }
  ],
  sessions: [],
  goals: { phones: 60, scheduled: 30 },
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
  normalized.deletedLeadIds ||= [];
  normalized.directs ||= [];
  normalized.anonymousDirectBatches ||= [];
  normalized.anonymousConversationBatches ||= [];
  normalized.followups ||= [];
  normalized.sessions ||= [];
  normalized.goals ||= structuredClone(seed.goals);
  normalized.goals.phones = Number(normalized.goals.phones || 60);
  normalized.goals.scheduled = Number(normalized.goals.scheduled || 30);
  normalized.templates ||= structuredClone(seed.templates);
  normalized.clinics.forEach(clinic => {
    if (clinic.active == null) clinic.active = true;
    clinic.priority = priorityFromInvestment(clinic.trafficInvestment, clinic.priority);
    clinic.color = ({
      "#75566f": "#9b88aa", "#836a73": "#9b88aa", "#7c6f91": "#9b88aa",
      "#df765f": "#c88e82", "#c87358": "#c88e82", "#ef7d62": "#c88e82",
      "#1f6b57": "#7899aa", "#765f1c": "#7899aa", "#3f5b78": "#7899aa",
      "#dda94c": "#91aa9d", "#c99b2f": "#91aa9d", "#e2b61b": "#91aa9d", "#d3a900": "#91aa9d"
    })[String(clinic.color || "").toLowerCase()] || clinic.color || "#7899aa";
  });
  normalized.leads.forEach(lead => {
    if (lead.status === "no_response") lead.status = "lost";
    if (lead.status === "qualified") lead.status = lead.whatsapp ? "sent_to_hunter" : "talking";
    lead.qualification ||= {};
    lead.qualificationNotes ||= {};
    lead.timeline ||= [];
    lead.scheduledAt ||= null;
    lead.scheduledRecordedAt ||= [...(lead.timeline || [])].reverse().find(item => /confirmou agendamento/i.test(item.label || ""))?.at || lead.scheduledAt || null;
    lead.attendedAt ||= null;
    lead.noShowAt ||= null;
  });
  normalized.directs.forEach(direct => {
    direct.status ||= direct.phoneAt ? "phone" : direct.respondedAt ? "responded" : "sent";
    direct.timeline ||= [];
  });
  migrateAnonymousDirects(normalized);
  migrateAnonymousResponsePlaceholders(normalized);
  applyWorkspaceDataCorrections(normalized);
  reconcileRecentAnonymousResponses(normalized);
  reconcileAdvancedLeadOrigins(normalized);
  return normalized;
}

function migrateAnonymousDirects(target) {
  if (Number(target.anonymousDirectsVersion || 0) >= 1) return;
  const cutoff = Date.now() - 8 * 86400000;
  (target.sessions || [])
    .filter(session => new Date(session.startedAt || 0).getTime() >= cutoff)
    .forEach(session => {
      const counted = Number(session.counts?.directs || 0);
      const identified = (target.directs || []).filter(direct => direct.sessionId === session.id && direct.sentAt).length;
      const quantity = Math.max(0, counted - identified);
      if (!quantity) return;
      target.anonymousDirectBatches.push({
        id: `anonymous-${session.id}`,
        clinicId: session.clinicId,
        sessionId: session.id,
        sentAt: session.startedAt,
        quantity,
        remaining: quantity,
        consumed: 0,
        expired: 0,
        source: session.source || "manual_web"
      });
    });
  target.anonymousDirectsVersion = 1;
}

function migrateAnonymousResponsePlaceholders(target) {
  if (Number(target.anonymousResponsePlaceholdersVersion || 0) >= 1) return;
  const placeholders = (target.leads || []).filter(lead => {
    const handle = instagramHandle(lead.instagram || "");
    return ["talking", "follow_up"].includes(lead.status)
      && (!handle || handle === "@")
      && !String(lead.name || "").trim()
      && !phoneDigits(lead.whatsapp || "");
  });
  placeholders.forEach(lead => {
    const respondedAt = lead.respondedAt || lead.lastContactAt || lead.prospectedAt || new Date().toISOString();
    target.anonymousConversationBatches.push({
      id: `anonymous-response-${lead.id}`,
      clinicId: lead.clinicId,
      sessionId: null,
      respondedAt,
      quantity: 1,
      remaining: 1,
      consumed: 0,
      expired: 0,
      source: lead.source || "manual_web",
      sourceBatchId: null,
      sourceSentAt: lead.prospectedAt || null,
      migratedFromLeadId: lead.id
    });
    target.deletedLeadIds.push(lead.id);
  });
  if (placeholders.length) {
    const ids = new Set(placeholders.map(lead => lead.id));
    target.leads = target.leads.filter(lead => !ids.has(lead.id));
    target.directs = target.directs.filter(direct => !ids.has(direct.leadId));
    target.followups = target.followups.filter(followup => !ids.has(followup.leadId));
    target.deletedLeadIds = [...new Set(target.deletedLeadIds)];
  }
  target.anonymousResponsePlaceholdersVersion = 1;
}

function applyWorkspaceDataCorrections(target) {
  target.dataCorrections ||= {};
  const correctionKey = "camilaAnonymousResponses20260731";
  if (target.dataCorrections[correctionKey]) return;
  const clinic = (target.clinics || []).find(item => /camila bandeira/i.test(`${item.name || ""} ${item.doctor || ""}`));
  if (!clinic) return;
  const responseBatches = (target.anonymousConversationBatches || [])
    .filter(batch => batch.clinicId === clinic.id && String(batch.respondedAt || "").slice(0, 10) === "2026-07-31");
  const current = responseBatches.reduce((total, batch) => total + Number(batch.remaining || 0), 0);
  if (current === 9) {
    target.dataCorrections[correctionKey] = true;
    return;
  }
  if (current !== 5 || !responseBatches.length) return;
  let quantityToMove = 4;
  const mappedBatches = (target.anonymousDirectBatches || [])
    .filter(batch => batch.clinicId === clinic.id && Number(batch.remaining || 0) > 0)
    .sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
  const mappedAvailable = mappedBatches.reduce((total, batch) => total + Number(batch.remaining || 0), 0);
  if (mappedAvailable < quantityToMove) return;
  mappedBatches.forEach(batch => {
    if (!quantityToMove) return;
    const moved = Math.min(quantityToMove, Number(batch.remaining || 0));
    batch.remaining = Number(batch.remaining || 0) - moved;
    batch.consumed = Number(batch.consumed || 0) + moved;
    batch.updatedAt = new Date().toISOString();
    quantityToMove -= moved;
  });
  if (quantityToMove) return;
  const targetBatch = responseBatches.sort((a, b) => new Date(a.respondedAt || 0) - new Date(b.respondedAt || 0))[0];
  targetBatch.quantity = Number(targetBatch.quantity || 0) + 4;
  targetBatch.remaining = Number(targetBatch.remaining || 0) + 4;
  targetBatch.updatedAt = new Date().toISOString();
  target.dataCorrections[correctionKey] = true;
}

function localDayKey(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function reconcileRecentAnonymousResponses(target) {
  if (Number(target.anonymousResponseHistoryVersion || 0) >= 2) return;
  const cutoffDate = new Date();
  cutoffDate.setHours(0, 0, 0, 0);
  cutoffDate.setDate(cutoffDate.getDate() - 6);
  const cutoff = cutoffDate.getTime();
  const expectedByClinicDay = new Map();
  (target.sessions || []).forEach(session => {
    if (!session.clinicId || new Date(session.startedAt || 0).getTime() < cutoff) return;
    const quantity = Number(session.counts?.responses || 0);
    if (!quantity) return;
    const day = localDayKey(session.startedAt);
    const key = `${session.clinicId}:${day}`;
    const current = expectedByClinicDay.get(key) || { clinicId: session.clinicId, day, quantity: 0, reference: session.startedAt };
    current.quantity += quantity;
    expectedByClinicDay.set(key, current);
  });
  const represented = new Map();
  const addRepresented = (clinicId, value, quantity = 1) => {
    if (!clinicId || !value || new Date(value).getTime() < cutoff) return;
    const key = `${clinicId}:${localDayKey(value)}`;
    represented.set(key, Number(represented.get(key) || 0) + Number(quantity || 0));
  };
  (target.anonymousConversationBatches || []).forEach(batch => addRepresented(batch.clinicId, batch.respondedAt, batch.quantity));
  const leadIdsWithTrackedResponse = new Set();
  (target.directs || []).forEach(direct => {
    if (direct.leadId && (direct.respondedAt || direct.anonymousConversationSourceId)) leadIdsWithTrackedResponse.add(direct.leadId);
    if (!direct.respondedAt) return;
    if (direct.anonymousConversationSourceId) return;
    addRepresented(direct.clinicId, direct.respondedAt);
  });
  (target.leads || []).forEach(lead => {
    if (leadIdsWithTrackedResponse.has(lead.id)) return;
    const responseReference = lead.respondedAt
      || lead.sentToHunterAt
      || lead.scheduledRecordedAt
      || lead.prospectedAt
      || lead.createdAt;
    if (!["talking", "follow_up", "sent_to_hunter", "scheduled", "attended"].includes(lead.status) || !responseReference) return;
    addRepresented(lead.clinicId, responseReference);
  });
  expectedByClinicDay.forEach(({ clinicId, day, quantity, reference }, key) => {
    let missing = Math.max(0, quantity - Number(represented.get(key) || 0));
    if (!missing) return;
    const mappedBatches = (target.anonymousDirectBatches || [])
      .filter(batch => batch.clinicId === clinicId && Number(batch.remaining || 0) > 0)
      .sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
    const available = mappedBatches.reduce((total, batch) => total + Number(batch.remaining || 0), 0);
    missing = Math.min(missing, available);
    if (!missing) return;
    const quantityToAdd = missing;
    let sourceBatch = null;
    mappedBatches.forEach(batch => {
      if (!missing) return;
      const moved = Math.min(missing, Number(batch.remaining || 0));
      if (!sourceBatch && moved) sourceBatch = batch;
      batch.remaining = Number(batch.remaining || 0) - moved;
      batch.consumed = Number(batch.consumed || 0) + moved;
      batch.updatedAt = new Date().toISOString();
      missing -= moved;
    });
    target.anonymousConversationBatches.push({
      id: `anonymous-history-${clinicId}-${day}`,
      clinicId,
      sessionId: null,
      respondedAt: reference,
      quantity: quantityToAdd,
      remaining: quantityToAdd,
      consumed: 0,
      expired: 0,
      source: "system",
      sourceBatchId: sourceBatch?.id || null,
      sourceSentAt: sourceBatch?.sentAt || null,
      reconciledFromSessions: true
    });
  });
  target.anonymousResponseHistoryVersion = 2;
}

function reconcileAdvancedLeadOrigins(target) {
  if (Number(target.leadOriginReconciliationVersion || 0) >= 1) return;
  const advancedStatuses = new Set(["sent_to_hunter", "scheduled", "attended", "no_show"]);
  (target.leads || []).forEach(lead => {
    if (!advancedStatuses.has(lead.status)) return;
    const handle = instagramHandle(lead.instagram || "");
    const hasOrigin = (target.directs || []).some(direct => direct.leadId === lead.id
      || (direct.clinicId === lead.clinicId && handle !== "@" && instagramHandle(direct.instagram || "") === handle));
    if (hasOrigin) return;
    const at = lead.directSentAt || lead.respondedAt || lead.sentToHunterAt || lead.scheduledRecordedAt
      || lead.phoneCapturedAt || lead.prospectedAt || lead.lastContactAt || new Date().toISOString();
    target.directs.push({
      id: `direct-origin-${lead.id}`, clinicId: lead.clinicId, leadId: lead.id, instagram: handle,
      sessionId: null, source: "system", sentAt: at, respondedAt: lead.respondedAt || lead.sentToHunterAt || at,
      phoneAt: lead.phoneCapturedAt || lead.sentToHunterAt || null, phone: lead.whatsapp || "",
      status: lead.whatsapp ? "phone" : "responded", createdAt: at, updatedAt: at,
      inferredOrigin: true, timeline: [{ at, label: "Direct de origem reconciliado" }]
    });
  });
  target.leadOriginReconciliationVersion = 1;
}

function loadState() {
  const base = isSupabaseConfigured
    ? { ...structuredClone(seed), profile: { name: "Carregando", initials: "··", role: "social_seller" }, clinics: [], leads: [], directs: [], followups: [], sessions: [] }
    : structuredClone(seed);
  if (!isSupabaseConfigured && new URLSearchParams(location.search).get("role") === "manager") {
    base.profile = { name: "Gestora Teste", initials: "GT", role: "manager" };
  }
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
let adminDirectoryCache = { organizations: [], memberships: [], invites: [] };
const processedExtensionEvents = new Set();
function isReadOnlyManager() { return state.profile?.role === "manager"; }
function canEditOperation() { return !isReadOnlyManager(); }
function requireOperationEdit() {
  if (canEditOperation()) return true;
  showToast("Seu acesso de Gestor é somente para visualização.");
  return false;
}
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
  if (remote.resetAt && local.resetAt !== remote.resetAt) {
    return normalizeState({
      ...remote,
      profile,
      session: null,
      timerId: null,
      lastAction: null,
      leadFilter: "all",
      followupFilter: "today",
      reportPeriod: "day"
    });
  }
  const deletedLeadIds = [...new Set([...(local.deletedLeadIds || []), ...(remote.deletedLeadIds || [])])];
  const deletedLeadSet = new Set(deletedLeadIds);
  return normalizeState({
    ...local,
    ...remote,
    profile,
    clinics: mergeById(local.clinics, remote.clinics),
    leads: mergeById(local.leads, remote.leads).filter(lead => !deletedLeadSet.has(lead.id)),
    directs: mergeById(local.directs, remote.directs).filter(direct => !direct.leadId || !deletedLeadSet.has(direct.leadId)),
    anonymousDirectBatches: mergeById(local.anonymousDirectBatches, remote.anonymousDirectBatches),
    anonymousConversationBatches: mergeById(local.anonymousConversationBatches, remote.anonymousConversationBatches),
    followups: mergeById(local.followups, remote.followups).filter(followup => !deletedLeadSet.has(followup.leadId)),
    sessions: mergeById(local.sessions, remote.sessions),
    templates: mergeById(local.templates, remote.templates),
    deletedLeadIds,
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
  if (isReadOnlyManager()) return;
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
  if (isReadOnlyManager()) return;
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

function upsertLeadFromActivity({ clinicId, instagram: rawInstagram = "", stage = "mapped", at = new Date().toISOString(), prospectedAt = at, phone = "", source = "manual_web" }) {
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
      prospectedAt,
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

function addAnonymousDirect(clinicId, sessionId, sentAt = new Date().toISOString(), source = "manual_web", quantity = 1) {
  if (!clinicId || quantity <= 0) return null;
  state.anonymousDirectBatches ||= [];
  let batch = state.anonymousDirectBatches.find(item => item.clinicId === clinicId && item.sessionId === sessionId && !item.expiredAt);
  if (!batch) {
    batch = {
      id: uid("anonymous"), clinicId, sessionId, sentAt, quantity: 0,
      remaining: 0, consumed: 0, expired: 0, source
    };
    state.anonymousDirectBatches.push(batch);
  }
  batch.quantity = Number(batch.quantity || 0) + quantity;
  batch.remaining = Number(batch.remaining || 0) + quantity;
  batch.updatedAt = sentAt;
  return batch;
}

function expireAnonymousDirects(target = state) {
  const mappedCutoff = Date.now() - 7 * 86400000;
  const talkingCutoff = Date.now() - 14 * 86400000;
  let changed = false;
  (target.anonymousDirectBatches || []).forEach(batch => {
    const remaining = Number(batch.remaining || 0);
    if (!remaining || new Date(batch.sentAt || 0).getTime() >= mappedCutoff) return;
    batch.remaining = 0;
    batch.expired = Number(batch.expired || 0) + remaining;
    batch.expiredAt = new Date().toISOString();
    batch.updatedAt = batch.expiredAt;
    changed = true;
  });
  (target.anonymousConversationBatches || []).forEach(batch => {
    const remaining = Number(batch.remaining || 0);
    if (!remaining || new Date(batch.respondedAt || 0).getTime() >= talkingCutoff) return;
    batch.remaining = 0;
    batch.expired = Number(batch.expired || 0) + remaining;
    batch.expiredAt = new Date().toISOString();
    batch.updatedAt = batch.expiredAt;
    changed = true;
  });
  return changed;
}

function consumeOldestAnonymousDirect(clinicId) {
  expireAnonymousDirects();
  const batch = (state.anonymousDirectBatches || [])
    .filter(item => item.clinicId === clinicId && Number(item.remaining || 0) > 0)
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))[0];
  if (!batch) return null;
  batch.remaining = Math.max(0, Number(batch.remaining || 0) - 1);
  batch.consumed = Number(batch.consumed || 0) + 1;
  batch.updatedAt = new Date().toISOString();
  return batch;
}

function addAnonymousConversation(clinicId, sessionId, respondedAt = new Date().toISOString(), source = "manual_web", sourceBatch = null) {
  if (!clinicId) return null;
  state.anonymousConversationBatches ||= [];
  const dayKey = respondedAt.slice(0, 10);
  let batch = state.anonymousConversationBatches.find(item => item.clinicId === clinicId
    && item.sessionId === sessionId
    && String(item.respondedAt || "").slice(0, 10) === dayKey
    && !item.expiredAt);
  if (!batch) {
    batch = {
      id: uid("anonymous-talking"), clinicId, sessionId, respondedAt,
      quantity: 0, remaining: 0, consumed: 0, expired: 0, source,
      sourceBatchId: sourceBatch?.id || null,
      sourceSentAt: sourceBatch?.sentAt || null
    };
    state.anonymousConversationBatches.push(batch);
  }
  batch.quantity = Number(batch.quantity || 0) + 1;
  batch.remaining = Number(batch.remaining || 0) + 1;
  batch.updatedAt = respondedAt;
  return batch;
}

function consumeOrCreateAnonymousDirectOrigin(clinicId, sessionId, at = new Date().toISOString(), source = "manual_web") {
  const existing = consumeOldestAnonymousDirect(clinicId);
  if (existing) return existing;
  const created = addAnonymousDirect(clinicId, sessionId, at, source, 1);
  if (!created) return null;
  created.remaining = Math.max(0, Number(created.remaining || 0) - 1);
  created.consumed = Number(created.consumed || 0) + 1;
  created.inferredOrigin = true;
  created.updatedAt = at;
  return created;
}

function consumeOldestAnonymousConversation(clinicId) {
  expireAnonymousDirects();
  const batch = (state.anonymousConversationBatches || [])
    .filter(item => item.clinicId === clinicId && Number(item.remaining || 0) > 0)
    .sort((a, b) => new Date(a.respondedAt) - new Date(b.respondedAt))[0];
  if (!batch) return null;
  batch.remaining = Math.max(0, Number(batch.remaining || 0) - 1);
  batch.consumed = Number(batch.consumed || 0) + 1;
  batch.updatedAt = new Date().toISOString();
  return batch;
}

function consumeAnonymousConversationBatch(batchId) {
  expireAnonymousDirects();
  const batch = (state.anonymousConversationBatches || [])
    .find(item => item.id === batchId && Number(item.remaining || 0) > 0);
  if (!batch) return null;
  batch.remaining = Math.max(0, Number(batch.remaining || 0) - 1);
  batch.consumed = Number(batch.consumed || 0) + 1;
  batch.updatedAt = new Date().toISOString();
  return batch;
}

function advanceAnonymousLead(clinicId, stage, at = new Date().toISOString(), sessionId = null, source = "manual_web") {
  if (stage === "responded") {
    const sourceBatch = consumeOrCreateAnonymousDirectOrigin(clinicId, sessionId, at, source);
    return addAnonymousConversation(clinicId, sessionId, at, source, sourceBatch);
  }
  if (stage === "phone") return null;
  return null;
}

function isUsableLeadHandle(clinicId, rawHandle = "") {
  const handle = instagramHandle(rawHandle);
  if (!handle || handle === "@") return false;
  const clinicHandle = instagramHandle(clinicById(clinicId)?.instagram || "");
  return !clinicHandle || clinicHandle === "@" || handle.toLowerCase() !== clinicHandle.toLowerCase();
}

function anonymousPipelineCount(kind, priorityFilter = "all") {
  const source = kind === "talking" ? state.anonymousConversationBatches : state.anonymousDirectBatches;
  const primary = (source || [])
    .filter(batch => priorityFilter === "all" || clinicPriority(clinicById(batch.clinicId)).key === priorityFilter)
    .reduce((total, batch) => total + Number(batch.remaining || 0), 0);
  if (kind !== "lost") return primary;
  return [...(state.anonymousDirectBatches || []), ...(state.anonymousConversationBatches || [])]
    .filter(batch => priorityFilter === "all" || clinicPriority(clinicById(batch.clinicId)).key === priorityFilter)
    .reduce((total, batch) => total + Number(batch.expired || 0), 0);
}

function anonymousPipelineBatches(kind, priorityFilter = "all") {
  const source = kind === "talking" ? state.anonymousConversationBatches : state.anonymousDirectBatches;
  return (source || [])
    .filter(batch => Number(batch.remaining || 0) > 0)
    .filter(batch => priorityFilter === "all" || clinicPriority(clinicById(batch.clinicId)).key === priorityFilter)
    .sort((a, b) => new Date(kind === "talking" ? a.respondedAt : a.sentAt) - new Date(kind === "talking" ? b.respondedAt : b.sentAt));
}

function anonymousBatchDeadline(batch, kind) {
  const reference = new Date(kind === "talking" ? batch.respondedAt : batch.sentAt).getTime();
  const limit = kind === "talking" ? 14 : 7;
  const elapsed = Math.max(0, Math.floor((Date.now() - reference) / 86400000));
  return `${Math.max(0, limit - elapsed)}d para expirar`;
}

function anonymousPipelineDisplayBatches(kind, priorityFilter = "all") {
  const batches = anonymousPipelineBatches(kind, priorityFilter);
  const grouped = new Map();
  batches.forEach(batch => {
    const deadline = anonymousBatchDeadline(batch, kind);
    const key = kind === "mapped" ? `${batch.clinicId}:${deadline}` : batch.clinicId;
    const current = grouped.get(key) || {
      ...batch,
      remaining: 0,
      groupedBatchIds: []
    };
    current.remaining += Number(batch.remaining || 0);
    current.groupedBatchIds.push(batch.id);
    const dateField = kind === "talking" ? "respondedAt" : "sentAt";
    if (new Date(batch[dateField] || 0) < new Date(current[dateField] || 0)) current[dateField] = batch[dateField];
    grouped.set(key, current);
  });
  return [...grouped.values()].sort((a, b) => {
    const clinicOrder = clinicPriority(clinicById(a.clinicId)).order - clinicPriority(clinicById(b.clinicId)).order;
    if (clinicOrder) return clinicOrder;
    return String(clinicById(a.clinicId)?.name || "").localeCompare(String(clinicById(b.clinicId)?.name || ""), "pt-BR")
      || new Date((kind === "talking" ? a.respondedAt : a.sentAt) || 0) - new Date((kind === "talking" ? b.respondedAt : b.sentAt) || 0);
  });
}

function recordDirectProgress({ clinicId, instagram: rawInstagram = "", stage = "sent", at = new Date().toISOString(), phone = "", source = "manual_web", sessionId = null }) {
  const instagram = instagramHandle(rawInstagram);
  if (instagram === "@") return { direct: null, lead: null };
  let direct = findLatestDirect(clinicId, instagram);
  const anonymousConversationMatch = !direct && ["responded", "phone"].includes(stage) ? consumeOldestAnonymousConversation(clinicId) : null;
  const anonymousMatch = !direct && stage !== "sent" && !anonymousConversationMatch ? consumeOldestAnonymousDirect(clinicId) : null;
  const shouldCreate = !direct || (stage === "sent" && ["phone", "lost"].includes(direct.status));
  if (shouldCreate) {
    direct = {
      id: uid("direct"),
      clinicId,
      instagram,
      leadId: null,
      sessionId,
      sentAt: stage === "sent" ? at : anonymousMatch?.sentAt || anonymousConversationMatch?.sourceSentAt || null,
      respondedAt: null,
      phoneAt: null,
      phone: "",
      status: stage === "sent" ? "sent" : stage,
      source,
      anonymousSourceId: anonymousMatch?.id || anonymousConversationMatch?.sourceBatchId || null,
      anonymousConversationSourceId: anonymousConversationMatch?.id || null,
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
    const firstResponse = !direct.respondedAt;
    direct.respondedAt ||= at;
    direct.status = direct.status === "phone" ? "phone" : "responded";
    if (firstResponse) direct.timeline.push({ at, label: "Resposta recebida" });
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
    prospectedAt: direct.sentAt || at,
    phone,
    source
  });
  direct.leadId = lead?.id || direct.leadId;
  return { direct, lead };
}

function ensureNamedDirectOrigin(lead, at = new Date().toISOString(), source = "manual_web", sessionId = null) {
  if (!lead?.clinicId) return null;
  const handle = instagramHandle(lead.instagram || "");
  const existing = state.directs.find(direct => direct.leadId === lead.id
    || (direct.clinicId === lead.clinicId && handle !== "@" && instagramHandle(direct.instagram || "") === handle));
  if (existing) {
    existing.leadId ||= lead.id;
    return existing;
  }
  const progressed = ["talking", "follow_up", "sent_to_hunter", "scheduled", "attended", "no_show"].includes(lead.status);
  const direct = {
    id: uid("direct-origin"), clinicId: lead.clinicId, leadId: lead.id, instagram: handle,
    sessionId, source, sentAt: at, respondedAt: progressed ? at : null,
    phoneAt: lead.whatsapp ? (lead.phoneCapturedAt || at) : null, phone: lead.whatsapp || "",
    status: lead.whatsapp ? "phone" : progressed ? "responded" : "sent",
    createdAt: at, updatedAt: at, inferredOrigin: true, timeline: [{ at, label: "Direct de origem registrado" }]
  };
  state.directs.push(direct);
  return direct;
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
  if (["responded", "phone"].includes(eventStage) && result.lead) {
    result.lead.name = event.payload?.name || result.lead.name || "";
    result.lead.qualification = { ...(result.lead.qualification || {}), ...(event.payload?.qualification || {}) };
    result.lead.qualificationNotes = { ...(result.lead.qualificationNotes || {}), ...(event.payload?.qualificationNotes || {}) };
    result.lead.interest = event.payload?.interest || result.lead.interest || "";
    result.lead.temperature = event.payload?.temperature || result.lead.temperature || "warm";
    result.lead.whatsapp = phoneDigits(event.payload?.phone || result.lead.whatsapp || "");
    if (eventStage === "phone" && event.payload?.sendToHunter) {
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
      const hasLeadHandle = isUsableLeadHandle(event.clinic_id, event.instagram_handle);
      if (event.event_type === "direct_sent") {
        if (hasLeadHandle) upsertLeadFromExtension(event, "mapped");
        else addAnonymousDirect(event.clinic_id, event.session_id, event.event_at, "chrome_extension");
      }
      if (event.event_type === "response_detected") {
        if (hasLeadHandle) upsertLeadFromExtension(event, "responded");
        else advanceAnonymousLead(event.clinic_id, "responded", event.event_at, event.session_id, "chrome_extension");
      }
      if (event.event_type === "lead_qualified") {
        if (hasLeadHandle) upsertLeadFromExtension(event, "responded");
        else advanceAnonymousLead(event.clinic_id, "responded", event.event_at, event.session_id, "chrome_extension");
      }
      if (event.event_type === "phone_captured") {
        if (hasLeadHandle) upsertLeadFromExtension(event, "phone");
        else advanceAnonymousLead(event.clinic_id, "phone", event.event_at, event.session_id, "chrome_extension");
      }
    }
    processedExtensionEvents.add(event.id);
    changed = true;
  }
  if (!changed) return;
  await persistImmediately();
  await dataGateway.markExtensionEventsProcessed?.(freshEvents.map(event => event.id));
  renderDashboard();
  renderSessionClinicTracker();
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
  let changed = expireAnonymousDirects();
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
  const avatarUrl = state.profile?.avatarUrl || "";
  const navAvatar = $("#nav-profile-avatar");
  const profileAvatar = $("#profile-avatar-large");
  [navAvatar, profileAvatar].forEach(avatar => {
    avatar.classList.toggle("has-image", Boolean(avatarUrl));
    avatar.style.backgroundImage = avatarUrl ? `url("${avatarUrl}")` : "";
  });
  navAvatar.textContent = avatarUrl ? "" : initials;
  profileAvatar.innerHTML = `${avatarUrl ? "" : escapeHtml(initials)}<span class="material-symbols-outlined">add_a_photo</span>`;
  profileAvatar.disabled = false;
  $("#profile-name").textContent = name;
  $("#profile-email").textContent = state.profile?.email || "E-mail não informado";
  $("#profile-notifications").checked = state.profile?.notificationsEnabled !== false;
  $("#profile-role").textContent = state.profile?.platformAdmin
    ? "Administrador da plataforma"
    : state.profile?.role === "admin" ? "Admin · Social seller"
      : isReadOnlyManager() ? "Gestor · Somente leitura" : "Social seller";
  $("#profile-avatar-hint").textContent = "Toque na foto para alterar";
  $("#access-mode-badge").classList.toggle("hidden", !isReadOnlyManager());
  $("#admin-access-menu").classList.toggle("hidden", !state.profile?.platformAdmin);
  const newsSeen = localStorage.getItem(`munnius-social-news-v1:${state.profile?.id || "local"}`) === "seen";
  $("#profile-news-badge").classList.toggle("hidden", newsSeen);
}

function applyAccessMode() {
  const viewer = isReadOnlyManager();
  document.body.classList.toggle("viewer-mode", viewer);
  $$(".manager-write button, button.manager-write, input.manager-write, select.manager-write").forEach(element => {
    element.disabled = viewer;
  });
  $("#home-clinics-title").textContent = viewer ? "Clínicas acompanhadas" : "Começar por uma clínica";
  $("#session-empty-title").textContent = viewer ? "Acompanhamento das sessões" : "Pronta para começar?";
  $("#session-empty-copy").textContent = viewer
    ? "Consulte abaixo o tempo e as ações registradas em cada clínica hoje."
    : "Escolha uma clínica e registre seu trabalho sem perder o ritmo.";
}

async function saveProfileImage(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return showToast("Use uma imagem PNG, JPG ou WebP.");
  if (file.size > 2 * 1024 * 1024) return showToast("Escolha uma foto de até 2 MB.");
  const avatar = $("#profile-avatar-large");
  avatar.classList.add("uploading");
  try {
    const avatarUrl = await dataGateway.uploadProfileImage(file);
    if (!avatarUrl) throw new Error("Upload indisponível");
    state.profile.avatarUrl = avatarUrl;
    renderProfile();
    showToast("Foto de perfil atualizada");
  } catch (error) {
    console.warn("Falha ao atualizar a foto do perfil.", error);
    showToast("Não foi possível salvar a foto agora.");
  } finally {
    avatar.classList.remove("uploading");
    $("#profile-image-input").value = "";
  }
}

function openProfileNameForm() {
  openSheet(`<h2 class="sheet-title">Nome do perfil</h2><p class="sheet-subtitle">Este nome aparece no painel e nos relatórios exportados.</p>
    <form class="sheet-form" id="profile-name-form">
      ${field("profile-name-input", "Nome completo", state.profile?.name || "", true, "text", "Seu nome")}
      <button class="primary-button" type="submit">Salvar nome</button>
    </form>`, () => {
    $("#profile-name-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      const name = $("#profile-name-input").value.trim();
      if (name.length < 2) return showToast("Informe um nome válido.");
      button.disabled = true;
      button.textContent = "Salvando…";
      try {
        const savedName = await dataGateway.updateProfileName(name);
        state.profile.name = savedName;
        state.profile.initials = savedName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
        renderProfile();
        renderReport();
        closeSheet();
        showToast("Nome do perfil atualizado");
      } catch (error) {
        console.warn("Falha ao atualizar nome.", error);
        button.disabled = false;
        button.textContent = "Salvar nome";
        showToast("Não foi possível alterar o nome agora.");
      }
    });
  });
}

function openProfilePasswordForm() {
  openSheet(`<h2 class="sheet-title">Redefinir senha</h2><p class="sheet-subtitle">Crie uma senha segura com pelo menos oito caracteres.</p>
    <form class="sheet-form" id="profile-password-form">
      ${field("profile-new-password", "Nova senha", "", true, "password", "Mínimo de 8 caracteres")}
      ${field("profile-confirm-password", "Confirmar senha", "", true, "password", "Repita a nova senha")}
      <button class="primary-button" type="submit">Atualizar senha</button>
    </form>`, () => {
    $("#profile-password-form").addEventListener("submit", async event => {
      event.preventDefault();
      const password = $("#profile-new-password").value;
      const confirmation = $("#profile-confirm-password").value;
      if (password.length < 8) return showToast("Use pelo menos 8 caracteres.");
      if (password !== confirmation) return showToast("As senhas não são iguais.");
      const button = event.submitter;
      button.disabled = true;
      button.textContent = "Atualizando…";
      const result = await authGateway.updatePassword(password);
      if (!result.ok) {
        button.disabled = false;
        button.textContent = "Atualizar senha";
        return showToast(result.message);
      }
      closeSheet();
      showToast("Senha atualizada com sucesso");
    });
  });
}

function showRecoveryForm() {
  recoveryMode = true;
  $("#recovery-eyebrow").textContent = invitationLinkDetected ? "Convite aceito" : "Acesso recuperado";
  $("#recovery-title").textContent = invitationLinkDetected ? "Crie sua senha de acesso" : "Crie sua nova senha";
  $("#recovery-copy").textContent = invitationLinkDetected
    ? "Só falta definir sua senha. Depois disso, você entrará diretamente no ambiente autorizado."
    : "Defina uma senha segura e você entrará no aplicativo logo em seguida.";
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
  applyAccessMode();
  $("#auth-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  expireUnansweredLeads();
  renderProfile();
  renderDashboard();
  renderLeads();
  renderReport();
  stopWorkspaceRealtime?.();
  try {
    stopWorkspaceRealtime = await dataGateway.subscribeToWorkspace?.(applyRemoteSnapshot);
  } catch (error) {
    console.warn("Atualização em tempo real será retomada depois.", error);
  }
  stopExtensionRealtime?.();
  if (canEditOperation()) {
    try {
      await syncPendingExtensionEvents();
      stopExtensionRealtime = await dataGateway.subscribeToExtensionEvents?.(event => {
        applyExtensionEvents(event, true).catch(error => console.warn("Evento da extensão pendente.", error));
      });
    } catch (error) {
      console.info("Extensão Chrome ainda não conectada.", error);
    }
  }
  showToast(message);
  const tourSeenLocally = localStorage.getItem(`munnius-social-tour-v1:${state.profile?.id || "local"}`) === "seen";
  if (!state.profile?.productTourSeen && !tourSeenLocally) setTimeout(() => startProductTour(), 700);
}

function uid(prefix) { return crypto.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
function clinicById(id) { return state.clinics.find(clinic => clinic.id === id); }
function leadById(id) { return state.leads.find(lead => lead.id === id); }
function formatDate(value, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" }).format(new Date(value));
}
function isSameDay(a, b = new Date()) { const date = new Date(a); return date.toDateString() === new Date(b).toDateString(); }
function periodBounds(period, reference = null) {
  const anchor = reference ? new Date(`${reference}T12:00:00`) : new Date();
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);
  if (period === "month") start.setDate(1);
  const end = new Date(period === "week" && reference ? anchor : start);
  end.setHours(0, 0, 0, 0);
  if (period === "day") end.setDate(end.getDate() + 1);
  if (period === "week") end.setDate(end.getDate() + (reference ? 1 : 7));
  if (period === "month") end.setMonth(end.getMonth() + 1, 1);
  return { start, end };
}
function periodStart(period, reference = null) { return periodBounds(period, reference).start; }
function inPeriod(value, period, reference = null) {
  if (!value) return false;
  const date = new Date(value);
  const { start, end } = periodBounds(period, reference);
  return date >= start && date < end;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add("hidden"), 2300);
}

const productTourSteps = [
  {
    icon: "waving_hand",
    title: "Bem-vindo ao App Social da Munnius",
    copy: "Aqui você poderá realizar a gestão do seu Social Selling, acompanhar a rotina e transformar conversas em oportunidades rastreáveis."
  },
  {
    view: "home", target: ".period-control", icon: "date_range",
    title: "Veja o período que importa",
    copy: "Alterne entre Hoje, Semana e Mês. Todos os indicadores da Home acompanham o período selecionado."
  },
  {
    view: "home", target: ".operation-hero", icon: "speed",
    title: "Ritmo e meta no mesmo lugar",
    copy: "A faixa resume as ações realizadas e mostra, ao lado, o avanço da meta global de telefones e agendamentos."
  },
  {
    view: "home", target: "#clinic-list", icon: "play_circle",
    title: "Comece por uma clínica",
    copy: "Inicie a sessão da conta que será trabalhada. O app mantém o tempo e as ações separados por clínica."
  },
  {
    view: "session", target: ".session-day-overview", icon: "timer",
    title: "Controle a ronda do dia",
    copy: "Em Sessão você vê quais clínicas já foram trabalhadas, quanto tempo recebeu cada uma e quais ainda faltam."
  },
  {
    view: "leads", target: ".crm-toolbar", icon: "filter_alt",
    title: "Encontre a oportunidade certa",
    copy: "Pesquise por nome ou @, filtre a prioridade das clínicas e veja rapidamente quais conversas já possuem telefone."
  },
  {
    view: "leads", target: ".kanban-navigation", icon: "view_kanban",
    title: "Acompanhe o mini CRM",
    copy: "O funil organiza leads mapeados, conversas, encaminhamentos, agendamentos e comparecimentos sem burocracia."
  },
  {
    view: "reports", target: ".report-kind-control", icon: "monitoring",
    title: "Mostre o trabalho realizado",
    copy: "Gere relatórios da operação, auditoria de telefones ou um resumo executivo pronto para compartilhar."
  },
  {
    view: "settings", target: "#settings-grid", icon: "settings",
    title: "Centralize as configurações",
    copy: "Metas, clínicas, acessos, segurança e este tutorial ficam reunidos em Configurações."
  },
  {
    view: "more", target: ".profile-menu-list", icon: "account_circle",
    title: "Seu perfil, do seu jeito",
    copy: "Troque nome, foto e senha, além de deixar preparada sua preferência de notificações."
  },
  {
    icon: "rocket_launch",
    title: "Tudo pronto para começar",
    copy: "Abra uma clínica, inicie a sessão e registre a operação. O Munnius Social cuida da organização enquanto você cuida das conversas."
  }
];
let productTourIndex = -1;

function positionProductTourFocus(selector) {
  const tour = $("#product-tour");
  const ring = $("#tour-focus-ring");
  const card = $("#tour-card");
  const target = selector ? $(selector) : null;
  tour.classList.toggle("tour-no-target", !target);
  ring.classList.toggle("hidden", !target);
  card.classList.remove("tour-card-top");
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    const padding = 8;
    ring.style.left = `${Math.max(8, rect.left - padding)}px`;
    ring.style.top = `${Math.max(8, rect.top - padding)}px`;
    ring.style.width = `${Math.min(innerWidth - 16, rect.width + padding * 2)}px`;
    ring.style.height = `${Math.min(innerHeight - 16, rect.height + padding * 2)}px`;
    card.classList.toggle("tour-card-top", rect.top > innerHeight * .56);
  }, 240);
}

function renderProductTourStep() {
  const step = productTourSteps[productTourIndex];
  if (!step) return finishProductTour();
  if (step.view) navigate(step.view);
  $("#tour-step-label").textContent = `${productTourIndex + 1} de ${productTourSteps.length}`;
  $("#tour-progress-bar").style.width = `${(productTourIndex + 1) / productTourSteps.length * 100}%`;
  $("#tour-icon").textContent = step.icon;
  $("#tour-title").textContent = step.title;
  $("#tour-copy").textContent = step.copy;
  $("#tour-back").classList.toggle("hidden", productTourIndex === 0);
  $("#tour-next").textContent = productTourIndex === productTourSteps.length - 1 ? "Concluir" : productTourIndex === 0 ? "Começar" : "Próximo";
  requestAnimationFrame(() => positionProductTourFocus(step.target));
}

function startProductTour(force = false) {
  if (!force && !$("#product-tour").classList.contains("hidden")) return;
  productTourIndex = 0;
  $("#product-tour").classList.remove("hidden");
  document.body.classList.add("tour-open");
  renderProductTourStep();
}

async function finishProductTour() {
  $("#product-tour").classList.add("hidden");
  document.body.classList.remove("tour-open");
  productTourIndex = -1;
  const key = `munnius-social-tour-v1:${state.profile?.id || "local"}`;
  localStorage.setItem(key, "seen");
  state.profile.productTourSeen = true;
  try { await dataGateway.markProductTourSeen?.(); } catch (error) { console.info("Tutorial concluído localmente.", error); }
}

function nextProductTour() {
  if (productTourIndex >= productTourSteps.length - 1) return finishProductTour();
  productTourIndex += 1;
  renderProductTourStep();
}

function previousProductTour() {
  productTourIndex = Math.max(0, productTourIndex - 1);
  renderProductTourStep();
}

function navigate(view) {
  const currentView = $(".view.active")?.dataset.viewPanel;
  if (currentView === "session" && view !== "session") pauseSessionTimer();
  if (view === "session") resumeSessionTimer();
  $$(".view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  if ($("#page-title")) $("#page-title").textContent = titles[view];
  if (view === "more") {
    localStorage.setItem(`munnius-social-news-v1:${state.profile?.id || "local"}`, "seen");
    $("#profile-news-badge").classList.add("hidden");
  }
  if (view === "home") renderDashboard();
  if (view === "clinics") renderClinics();
  if (view === "leads") renderLeads();
  if (view === "reports") renderReport();
  if (view === "admin") renderAdminAccess();
  if (view === "session") renderSessionClinicTracker();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function periodStats(period = state.period || "day", reference = null) {
  const contains = value => inPeriod(value, period, reference);
  const leads = state.leads.filter(lead => contains(lead.prospectedAt));
  const sessions = state.sessions.filter(session => contains(session.startedAt));
  if (state.session && contains(state.session.startedAt)) {
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
  const identifiedDirects = state.directs.filter(direct => direct.sentAt && !direct.anonymousSourceId && contains(direct.sentAt)).length;
  const anonymousDirects = (state.anonymousDirectBatches || [])
    .filter(batch => batch.sentAt && contains(batch.sentAt))
    .reduce((total, batch) => total + Number(batch.quantity || 0), 0);
  const trackedDirects = identifiedDirects + anonymousDirects;
  const trackedResponses = state.directs.filter(direct => direct.respondedAt && contains(direct.respondedAt)).length;
  const leadResponses = state.leads.filter(lead => lead.respondedAt && contains(lead.respondedAt)).length;
  const mappedPhonesTotal = state.leads.filter(lead => {
    const mappedAt = leadPhoneMappedAt(lead);
    return mappedAt && contains(mappedAt);
  }).length;
  const qualifiedTotal = state.leads.filter(lead => {
    const qualifiedAt = leadQualifiedAt(lead);
    return qualifiedAt && contains(qualifiedAt);
  }).length;
  const mappedPhonesCurrent = state.leads.filter(lead => {
    const mappedAt = leadPhoneMappedAt(lead);
    return mappedAt && contains(mappedAt) && isPhoneStage(lead);
  }).length;
  const phonesTotal = mappedPhonesTotal;
  const scheduledTotal = state.leads.filter(lead => leadScheduledRecordedAt(lead) && contains(leadScheduledRecordedAt(lead))).length;
  const attendedTotal = state.leads.filter(lead => lead.attendedAt && contains(lead.attendedAt)).length;
  return {
    leads: leads.length,
    sessions,
    ...counts,
    phones: mappedPhonesCurrent,
    phonesTotal,
    hunters: state.leads.filter(lead => lead.status === "sent_to_hunter" && leadQualifiedAt(lead) && contains(leadQualifiedAt(lead))).length,
    huntersTotal: qualifiedTotal,
    scheduled: state.leads.filter(lead => lead.status === "scheduled" && leadScheduledRecordedAt(lead) && contains(leadScheduledRecordedAt(lead))).length,
    scheduledTotal,
    attended: state.leads.filter(lead => lead.status === "attended" && lead.attendedAt && contains(lead.attendedAt)).length,
    attendedTotal,
    noShows: state.leads.filter(lead => lead.status === "no_show" && lead.noShowAt && contains(lead.noShowAt)).length,
    directs: Math.max(counts.directs, trackedDirects),
    responses: Math.max(counts.responses, trackedResponses, leadResponses)
  };
}

function leadPhoneMappedAt(lead) {
  if (!phoneDigits(lead.whatsapp || "") && !lead.phoneCapturedAt) return null;
  return lead.phoneCapturedAt || lead.sentToHunterAt || lead.respondedAt || lead.lastContactAt || lead.prospectedAt || null;
}

function leadScheduledRecordedAt(lead) {
  return lead.scheduledRecordedAt
    || [...(lead.timeline || [])].reverse().find(item => /confirmou agendamento/i.test(item.label || ""))?.at
    || lead.scheduledAt
    || null;
}

function leadQualifiedAt(lead) {
  const qualifiedStatuses = ["sent_to_hunter", "scheduled", "attended", "no_show"];
  if (!lead.sentToHunterAt && !qualifiedStatuses.includes(lead.status)) return null;
  return lead.sentToHunterAt || lead.phoneCapturedAt || lead.scheduledAt || lead.attendedAt || lead.lastContactAt || lead.prospectedAt || null;
}

function isPhoneStage(lead) {
  return Boolean(leadPhoneMappedAt(lead)) && ["new", "talking", "follow_up"].includes(lead.status);
}

function reportActionCount(stats) {
  return ["likes", "comments", "directs", "responses"].reduce((total, key) => total + Number(stats[key] || 0), 0)
    + phoneActionCount(stats);
}

function phoneActionCount(stats) {
  return Math.max(Number(stats.phones || 0), Number(stats.phonesTotal || 0));
}

function rate(part, total) {
  return total ? Math.round(Number(part || 0) / total * 100) : 0;
}

function currentPipelineStats() {
  return {
    mapped: state.leads.filter(lead => lead.status === "new").length + anonymousPipelineCount("mapped"),
    talking: state.leads.filter(lead => ["talking", "follow_up"].includes(lead.status)).length + anonymousPipelineCount("talking"),
    lost: state.leads.filter(lead => lead.status === "lost").length + anonymousPipelineCount("lost"),
    qualified: state.leads.filter(lead => lead.status === "sent_to_hunter").length,
    scheduled: state.leads.filter(lead => lead.status === "scheduled").length,
    attended: state.leads.filter(lead => lead.status === "attended").length
  };
}

function clinicCurrentPipelineStats(clinicId) {
  const anonymousMapped = (state.anonymousDirectBatches || [])
    .filter(batch => batch.clinicId === clinicId)
    .reduce((total, batch) => total + Number(batch.remaining || 0), 0);
  const anonymousTalking = (state.anonymousConversationBatches || [])
    .filter(batch => batch.clinicId === clinicId)
    .reduce((total, batch) => total + Number(batch.remaining || 0), 0);
  const leads = state.leads.filter(lead => lead.clinicId === clinicId);
  return {
    mapped: leads.filter(lead => lead.status === "new").length + anonymousMapped,
    talking: leads.filter(lead => ["talking", "follow_up"].includes(lead.status)).length + anonymousTalking,
    qualified: leads.filter(lead => lead.status === "sent_to_hunter").length,
    scheduled: leads.filter(lead => lead.status === "scheduled").length,
    attended: leads.filter(lead => lead.status === "attended").length
  };
}

function currentPipelineRates(pipeline) {
  const advanced = pipeline.qualified + pipeline.scheduled + pipeline.attended;
  const conversations = pipeline.talking + advanced;
  const total = pipeline.mapped + conversations;
  return {
    mapped: 100,
    talking: rate(conversations, total),
    qualified: rate(advanced, conversations),
    scheduled: rate(pipeline.scheduled + pipeline.attended, advanced),
    attended: rate(pipeline.attended, pipeline.scheduled + pipeline.attended)
  };
}

function timelineMovementCount(period, pattern, reference = null) {
  return state.leads.filter(lead => (lead.timeline || []).some(item => item.at && inPeriod(item.at, period, reference) && pattern.test(item.label || ""))).length;
}

function crmMovementStats(period, stats = periodStats(period), reference = null) {
  const anonymousExpired = [...(state.anonymousDirectBatches || []), ...(state.anonymousConversationBatches || [])]
    .filter(batch => batch.expiredAt && inPeriod(batch.expiredAt, period, reference))
    .reduce((total, batch) => total + Number(batch.expired || 0), 0);
  return {
    mapped: Number(stats.directs || 0),
    talking: Math.max(Number(stats.responses || 0), timelineMovementCount(period, /lead respondeu|resposta registrada|etapa alterada para conversando/i, reference)),
    lost: timelineMovementCount(period, /sem resposta após|sem evolução após|etapa alterada para perdido/i, reference) + anonymousExpired,
    qualified: Number(stats.huntersTotal || 0),
    scheduled: Number(stats.scheduledTotal || 0),
    attended: Number(stats.attendedTotal || 0)
  };
}

function clinicReportStats(clinicId, period, periodSummary, reference = null) {
  const contains = value => inPeriod(value, period, reference);
  const sessions = periodSummary.sessions.filter(session => session.clinicId === clinicId);
  const sessionCounts = sessions.reduce((total, session) => {
    Object.keys(countLabels).forEach(key => total[key] += Number(session.counts?.[key] || 0));
    return total;
  }, { profiles: 0, likes: 0, comments: 0, directs: 0, responses: 0, phones: 0 });
  const clinicLeads = state.leads.filter(lead => lead.clinicId === clinicId);
  const identifiedDirects = state.directs.filter(direct => direct.clinicId === clinicId && direct.sentAt && !direct.anonymousSourceId && contains(direct.sentAt)).length;
  const anonymousDirects = (state.anonymousDirectBatches || []).filter(batch => batch.clinicId === clinicId && batch.sentAt && contains(batch.sentAt))
    .reduce((total, batch) => total + Number(batch.quantity || 0), 0);
  const trackedResponses = state.directs.filter(direct => direct.clinicId === clinicId && direct.respondedAt && contains(direct.respondedAt)).length;
  const leadResponses = clinicLeads.filter(lead => lead.respondedAt && contains(lead.respondedAt)).length;
  const directs = Math.max(sessionCounts.directs, identifiedDirects + anonymousDirects);
  const responses = Math.max(sessionCounts.responses, trackedResponses, leadResponses);
  const mappedPhonesTotal = clinicLeads.filter(lead => {
    const mappedAt = leadPhoneMappedAt(lead);
    return mappedAt && contains(mappedAt);
  }).length;
  const mappedPhonesCurrent = clinicLeads.filter(lead => {
    const mappedAt = leadPhoneMappedAt(lead);
    return mappedAt && contains(mappedAt) && isPhoneStage(lead);
  }).length;
  const phonesTotal = mappedPhonesTotal;
  const qualifiedTotal = clinicLeads.filter(lead => {
    const qualifiedAt = leadQualifiedAt(lead);
    return qualifiedAt && contains(qualifiedAt);
  }).length;
  const captured = clinicLeads.filter(lead => {
    if (!leadPhoneMappedAt(lead)) return false;
    return [leadPhoneMappedAt(lead), leadQualifiedAt(lead), leadScheduledRecordedAt(lead), lead.attendedAt, lead.noShowAt]
      .some(date => date && contains(date));
  }).length;
  return {
    actions: Number(sessionCounts.likes || 0) + Number(sessionCounts.comments || 0) + directs + responses + Math.max(Number(sessionCounts.phones || 0), phonesTotal),
    directs,
    responses,
    lost: clinicLeads.filter(lead => (lead.timeline || []).some(item => item.at && contains(item.at) && /sem resposta após|sem evolução após|etapa alterada para perdido/i.test(item.label || ""))).length,
    leads: clinicLeads.filter(lead => contains(lead.prospectedAt)).length,
    phones: mappedPhonesCurrent,
    phonesTotal,
    captured,
    qualified: clinicLeads.filter(lead => lead.status === "sent_to_hunter" && leadQualifiedAt(lead) && contains(leadQualifiedAt(lead))).length,
    qualifiedTotal,
    scheduled: clinicLeads.filter(lead => lead.status === "scheduled" && leadScheduledRecordedAt(lead) && contains(leadScheduledRecordedAt(lead))).length,
    scheduledTotal: clinicLeads.filter(lead => leadScheduledRecordedAt(lead) && contains(leadScheduledRecordedAt(lead))).length,
    attended: clinicLeads.filter(lead => lead.status === "attended" && lead.attendedAt && contains(lead.attendedAt)).length,
    attendedTotal: clinicLeads.filter(lead => lead.attendedAt && contains(lead.attendedAt)).length
  };
}

function renderDashboard() {
  expireUnansweredLeads();
  const stats = periodStats(state.period);
  const activeClinics = state.clinics.filter(clinic => clinic.active);
  const actions = reportActionCount(stats);
  const pipeline = currentPipelineStats();
  $("#actions-total").textContent = actions;
  $("#leads-total").textContent = stats.phonesTotal;
  $("#clinics-total").textContent = activeClinics.length;
  $("#hunters-total").textContent = stats.scheduledTotal;
  $("#followups-total").textContent = pipeline.talking;
  $("#pipeline-mapped").textContent = pipeline.mapped;
  $("#pipeline-talking").textContent = pipeline.talking;
  $("#pipeline-qualified").textContent = pipeline.qualified;
  $("#pipeline-scheduled").textContent = pipeline.scheduled;
  $("#pipeline-attended").textContent = pipeline.attended;
  $("#hero-summary").textContent = actions
    ? `${stats.directs} directs · ${stats.responses} respostas · ${phoneActionCount(stats)} telefones`
    : activeClinics.length ? "Escolha uma clínica abaixo e comece a sessão." : "Cadastre sua primeira clínica para começar.";
  renderClinics();
}

function clinicLeadCount(clinicId, period = "day") { return state.leads.filter(lead => lead.clinicId === clinicId && inPeriod(lead.prospectedAt, period)).length; }
function clinicMarkup(clinic, detailed = false) {
  const active = state.session?.clinicId === clinic.id;
  const editable = canEditOperation();
  const priority = clinicPriority(clinic);
  const activity = clinicActivityToday(clinic.id);
  const scheduled = state.leads.filter(lead => lead.clinicId === clinic.id && leadScheduledRecordedAt(lead) && inPeriod(leadScheduledRecordedAt(lead), "month")).length;
  const avatar = clinic.photoUrl
    ? `<img src="${escapeHtml(clinic.photoUrl)}" alt="" loading="lazy">`
    : escapeHtml(clinic.name.split(" ").slice(-1)[0]?.[0] || "C");
  return `<article class="clinic-card ${detailed && editable ? "clickable" : detailed ? "viewer-clinic-card" : "home-clinic-card"} ${active ? "has-active-session" : ""}" ${detailed && editable ? `data-clinic-detail="${clinic.id}"` : ""}>
    <div class="clinic-avatar" style="background:${clinic.color}">${avatar}</div>
    <div class="clinic-main"><strong title="${escapeHtml(clinic.name)}">${escapeHtml(clinic.name)} <em class="priority-pill priority-${clinic.priority.toLowerCase()}">${clinic.priority}</em></strong><span>${detailed ? `${escapeHtml(clinic.instagram)} · Closer ${escapeHtml(clinic.hunter)} · ${priority.minutes} min` : `${activity.actions} ${activity.actions === 1 ? "ação" : "ações"} hoje · ${priority.label}`}</span><div class="progress"><i style="width:${Math.min(100, activity.seconds / (priority.minutes * 60) * 100)}%"></i></div></div>
    <div class="clinic-card-side">${detailed ? `<div class="clinic-score"><strong>${activity.actions}</strong><span>ações hoje · ${scheduled} agend.</span></div>` : ""}
      ${detailed ? editable ? `<span class="material-symbols-outlined clinic-chevron">chevron_right</span>` : `<span class="viewer-status"><span class="material-symbols-outlined">visibility</span>Ver</span>` : editable ? `<button class="clinic-start ${active ? "active" : ""}" data-start-session="${clinic.id}"><span class="material-symbols-outlined">${active ? "timer" : "play_arrow"}</span>${active ? "Continuar" : "Iniciar"}</button>` : `<span class="viewer-status"><span class="material-symbols-outlined">visibility</span>Ver</span>`}
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
  renderGoals();
  renderSessionClinicTracker();
}

function slugifyOrganization(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function accessRoleLabel(role) {
  return { admin: "Admin da organização", social_seller: "Social seller", manager: "Gestor · Somente leitura" }[role] || "Social seller";
}

async function renderAdminAccess() {
  if (!state.profile?.platformAdmin) return navigate("home");
  $("#admin-metrics").innerHTML = `<div class="admin-loading"><span class="material-symbols-outlined">progress_activity</span>Carregando acessos…</div>`;
  $("#admin-organization-list").innerHTML = "";
  try {
    adminDirectoryCache = await dataGateway.loadAdminDirectory();
  } catch (error) {
    console.warn("Não foi possível carregar a administração.", error);
    $("#admin-metrics").innerHTML = "";
    $("#admin-organization-list").innerHTML = emptyState("Não foi possível carregar organizações e acessos.");
    return;
  }
  const organizations = adminDirectoryCache.organizations || [];
  const invites = adminDirectoryCache.invites || [];
  const memberships = adminDirectoryCache.memberships || [];
  const activeAccesses = invites.filter(invite => invite.active).length;
  const pendingAccesses = invites.filter(invite => invite.active && !invite.claimed).length;
  $("#admin-metrics").innerHTML = [
    ["domain", organizations.filter(item => item.active).length, "Organizações"],
    ["verified_user", activeAccesses, "Acessos ativos"],
    ["outgoing_mail", pendingAccesses, "Convites pendentes"]
  ].map(([icon, value, label]) => `<article><span class="material-symbols-outlined">${icon}</span><div><strong>${value}</strong><small>${label}</small></div></article>`).join("");
  $("#admin-organization-list").innerHTML = organizations.map(organization => {
    const organizationInvites = invites.filter(invite => invite.organizationId === organization.id);
    const organizationMemberships = memberships.filter(member => member.organizationId === organization.id);
    const knownKeys = new Set(organizationInvites.map(invite => invite.email.toLowerCase()));
    const accessRows = [
      ...organizationInvites,
      ...organizationMemberships.filter(member => !knownKeys.has(member.email.toLowerCase())).map(member => ({
        id: null,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        active: member.active,
        claimed: true
      }))
    ];
    return `<section class="admin-organization-card">
      <header><span class="material-symbols-outlined">domain</span><div><strong>${escapeHtml(organization.name)}</strong><small>${escapeHtml(organization.slug)} · ${accessRows.filter(item => item.active).length} acessos</small></div><span class="admin-organization-actions"><button data-admin-edit-organization="${organization.id}" aria-label="Editar nome"><span class="material-symbols-outlined">edit</span></button><button data-admin-add-access="${organization.id}"><span class="material-symbols-outlined">person_add</span>Adicionar</button></span></header>
      <div class="admin-access-list">${accessRows.map(access => `<article>
        <span class="admin-access-avatar">${initials(access.fullName || access.email)}</span>
        <div><strong>${escapeHtml(access.fullName || access.email)}</strong><small>${escapeHtml(access.email)} · ${accessRoleLabel(access.role)}</small></div>
        <em class="${access.active ? access.claimed ? "active" : "pending" : "inactive"}">${access.active ? access.claimed ? "Ativo" : "Pendente" : "Pausado"}</em>
        ${access.id ? `<button data-admin-toggle-access="${access.id}" data-access-active="${access.active}">${access.active ? "Pausar" : "Reativar"}</button>` : ""}
      </article>`).join("") || `<div class="admin-empty-access">Nenhum acesso nesta organização.</div>`}</div>
    </section>`;
  }).join("") || emptyState("Crie a primeira organização para começar.");
  $$("[data-admin-edit-organization]").forEach(button => button.addEventListener("click", () => openAdminOrganizationEditForm(button.dataset.adminEditOrganization)));
  $$("[data-admin-add-access]").forEach(button => button.addEventListener("click", () => openAdminAccessForm(button.dataset.adminAddAccess)));
  $$("[data-admin-toggle-access]").forEach(button => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await dataGateway.setAccessActive(button.dataset.adminToggleAccess, button.dataset.accessActive !== "true");
      showToast(button.dataset.accessActive === "true" ? "Acesso pausado" : "Acesso reativado");
      await renderAdminAccess();
    } catch (error) {
      console.warn("Falha ao atualizar acesso.", error);
      button.disabled = false;
      showToast("Não foi possível atualizar o acesso.");
    }
  }));
}

function openAdminOrganizationEditForm(organizationId) {
  const organization = adminDirectoryCache.organizations.find(item => item.id === organizationId);
  if (!organization) return showToast("Organização não encontrada.");
  openSheet(`<h2 class="sheet-title">Editar organização</h2><p class="sheet-subtitle">O identificador técnico permanece igual; somente o nome visível será alterado.</p>
    <form class="sheet-form" id="admin-organization-edit-form">
      ${field("admin-organization-edit-name", "Nome da organização", organization.name, true, "text", "Nome da organização")}
      <button class="primary-button" type="submit">Salvar nome</button>
    </form>`, () => {
    $("#admin-organization-edit-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      try {
        await dataGateway.updateOrganization(organizationId, $("#admin-organization-edit-name").value);
        closeSheet();
        showToast("Nome da organização atualizado");
        await renderAdminAccess();
      } catch (error) {
        console.warn("Falha ao renomear organização.", error);
        button.disabled = false;
        showToast("Não foi possível atualizar o nome.");
      }
    });
  });
}

function openAdminOrganizationForm() {
  openSheet(`<h2 class="sheet-title">Nova organização</h2><p class="sheet-subtitle">Cada organização possui banco operacional e usuários completamente isolados.</p>
    <form class="sheet-form" id="admin-organization-form">
      ${field("admin-organization-name", "Nome da organização", "", true, "text", "Ex.: Ambiente de testes")}
      ${field("admin-organization-slug", "Identificador", "", true, "text", "ambiente-de-testes")}
      <button class="primary-button" type="submit">Criar organização</button>
    </form>`, () => {
    $("#admin-organization-name").addEventListener("input", event => {
      const slug = $("#admin-organization-slug");
      if (!slug.dataset.edited) slug.value = slugifyOrganization(event.target.value);
    });
    $("#admin-organization-slug").addEventListener("input", event => {
      event.target.dataset.edited = "true";
      event.target.value = slugifyOrganization(event.target.value);
    });
    $("#admin-organization-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      try {
        await dataGateway.createOrganization($("#admin-organization-name").value, $("#admin-organization-slug").value);
        closeSheet();
        showToast("Organização criada com isolamento próprio");
        await renderAdminAccess();
      } catch (error) {
        console.warn("Falha ao criar organização.", error);
        button.disabled = false;
        showToast("Não foi possível criar. Confira se o identificador já existe.");
      }
    });
  });
}

function openAdminAccessForm(organizationId) {
  const organization = adminDirectoryCache.organizations.find(item => item.id === organizationId);
  if (!organization) return showToast("Organização não encontrada.");
  openSheet(`<h2 class="sheet-title">Permitir novo acesso</h2><p class="sheet-subtitle">${escapeHtml(organization.name)} terá dados separados das demais organizações.</p>
    <form class="sheet-form" id="admin-access-form">
      ${field("admin-access-name", "Nome", "", true, "text", "Nome da pessoa")}
      ${field("admin-access-email", "E-mail permitido", "", true, "email", "pessoa@empresa.com.br")}
      <div class="field"><label for="admin-access-role">Cargo</label><select id="admin-access-role"><option value="social_seller">Social seller</option><option value="manager">Gestor · somente leitura</option><option value="admin">Admin da organização</option></select></div>
      <div class="admin-isolation-note" id="admin-role-note"><span class="material-symbols-outlined">shield_lock</span><p><strong>Acesso isolado</strong><small>Social seller opera clínicas, sessões, leads e relatórios de ${escapeHtml(organization.name)}.</small></p></div>
      <div class="admin-delivery-note"><span class="material-symbols-outlined">login</span><p><strong>Entrada gratuita e imediata</strong><small>Depois de liberar, a pessoa entra com Google usando exatamente o e-mail cadastrado. O envio automático de convite depende de um correio SMTP próprio.</small></p></div>
      <button class="primary-button" type="submit">Liberar acesso</button>
    </form>`, () => {
    const roleSelect = $("#admin-access-role");
    const roleNote = $("#admin-role-note small");
    roleSelect.addEventListener("change", () => {
      roleNote.textContent = roleSelect.value === "manager"
        ? `Gestor visualiza toda a operação de ${organization.name}, aplica filtros e exporta relatórios, sem alterar nenhum dado.`
        : roleSelect.value === "admin"
          ? `Administra os acessos da organização e também pode operar os dados de ${organization.name}.`
          : `Social seller opera clínicas, sessões, leads e relatórios de ${organization.name}.`;
    });
    $("#admin-access-form").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      button.textContent = "Preparando acesso…";
      try {
        const result = await dataGateway.saveAccess({
          email: $("#admin-access-email").value.trim().toLowerCase(),
          name: $("#admin-access-name").value.trim(),
          organizationId,
          role: $("#admin-access-role").value
        });
        closeSheet();
        showToast(result.invitationSent ? "Acesso criado e convite enviado por e-mail" : "Acesso liberado: a pessoa já pode entrar com Google");
        await renderAdminAccess();
      } catch (error) {
        console.warn("Falha ao criar acesso.", error);
        button.disabled = false;
        button.textContent = "Permitir acesso";
        showToast("Não foi possível preparar esse acesso.");
      }
    });
  });
}

function renderGoals() {
  const monthly = periodStats("month");
  [["goal-phones-progress", "goal-phones-bar"], ["clinic-goal-phones-progress", "clinic-goal-phones-bar"]].forEach(([labelId, barId]) => {
    const label = $(`#${labelId}`); const bar = $(`#${barId}`);
    if (label) label.textContent = `${monthly.phonesTotal} / ${state.goals.phones}`;
    if (bar) bar.style.width = `${Math.min(100, monthly.phonesTotal / state.goals.phones * 100)}%`;
  });
  [["goal-scheduled-progress", "goal-scheduled-bar"], ["clinic-goal-scheduled-progress", "clinic-goal-scheduled-bar"]].forEach(([labelId, barId]) => {
    const label = $(`#${labelId}`); const bar = $(`#${barId}`);
    if (label) label.textContent = `${monthly.scheduledTotal} / ${state.goals.scheduled}`;
    if (bar) bar.style.width = `${Math.min(100, monthly.scheduledTotal / state.goals.scheduled * 100)}%`;
  });
}

function openGoalsForm() {
  if (!requireOperationEdit()) return;
  openSheet(`<h2 class="sheet-title">Metas globais</h2><p class="sheet-subtitle">Defina o alvo atual da operação inteira. Nenhuma meta é vinculada a uma clínica específica.</p>
    <form class="sheet-form" id="goals-form">
      ${field("goals-phones", "Números prospectados no período", state.goals.phones, true, "number", "60")}
      ${field("goals-scheduled", "Agendamentos no período", state.goals.scheduled, true, "number", "30")}
      <button class="primary-button" type="submit">Salvar metas</button>
    </form>`, () => {
    $("#goals-form").addEventListener("submit", event => {
      event.preventDefault();
      state.goals = {
        phones: Math.max(1, Number($("#goals-phones").value || 60)),
        scheduled: Math.max(1, Number($("#goals-scheduled").value || 30))
      };
      persist();
      renderDashboard();
      renderGoals();
      closeSheet();
      showToast("Metas globais atualizadas");
    });
  });
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
    seconds: sessions.reduce((total, session) => total + Number(session.durationSeconds || 0), 0),
    counts: sessions.reduce((totals, session) => {
      Object.keys(countLabels).forEach(key => totals[key] += Number(session.counts?.[key] || 0));
      return totals;
    }, { profiles: 0, likes: 0, comments: 0, directs: 0, responses: 0, phones: 0 })
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
          <div class="session-clinic-counts">
            <span><i class="material-symbols-outlined">favorite</i>${activity.counts.likes}</span>
            <span><i class="material-symbols-outlined">chat_bubble</i>${activity.counts.comments}</span>
            <span><i class="material-symbols-outlined">send</i>${activity.counts.directs}</span>
            <span><i class="material-symbols-outlined">mark_chat_read</i>${activity.counts.responses}</span>
            <span><i class="material-symbols-outlined">phone_in_talk</i>${activity.counts.phones}</span>
          </div>
          <span class="clinic-time-track" aria-hidden="true"><i style="width:${spentPct}%"></i></span>
        </div>
        ${canEditOperation() ? `<button class="session-round-button ${activity.active ? "active" : ""}" data-session-clinic="${clinic.id}" ${state.session && !activity.active ? "disabled" : ""}>
          <span class="material-symbols-outlined">${buttonIcon}</span>${buttonLabel}
        </button>` : `<span class="viewer-status"><span class="material-symbols-outlined">visibility</span>Visualizar</span>`}
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
  const phoneOnly = Boolean(state.leadPhoneOnly);
  $("#lead-phone-filter").classList.toggle("active", phoneOnly);
  $("#lead-phone-filter").setAttribute("aria-pressed", String(phoneOnly));
  const filtered = state.leads
    .filter(lead => `${lead.name} ${lead.instagram}`.toLowerCase().includes(query))
    .filter(lead => !phoneOnly || Boolean(phoneDigits(lead.whatsapp || "") || lead.phoneCapturedAt))
    .filter(lead => {
      if (priorityFilter === "all") return true;
      return clinicPriority(clinicById(lead.clinicId)).key === priorityFilter;
    })
    .sort((a, b) => clinicPriority(clinicById(a.clinicId)).order - clinicPriority(clinicById(b.clinicId)).order
      || new Date(b.lastContactAt || b.prospectedAt) - new Date(a.lastContactAt || a.prospectedAt));
  const columns = [
    { key: "new", title: "Mapeados", subtitle: "Direct enviado", matcher: lead => lead.status === "new", icon: "send" },
    { key: "talking", title: "Conversando", subtitle: "Conversas em andamento", matcher: lead => ["talking", "follow_up"].includes(lead.status), icon: "forum" },
    { key: "lost", title: "Perdidos", subtitle: "Sem evolução", matcher: lead => lead.status === "lost", icon: "person_cancel" },
    { key: "sent_to_hunter", title: "Com a Hunter", subtitle: "Aguardando retorno", matcher: lead => lead.status === "sent_to_hunter", icon: "forward_to_inbox" },
    { key: "scheduled", title: "Agendados", subtitle: "Confirmar presença", matcher: lead => lead.status === "scheduled", icon: "event_available" },
    { key: "outcomes", title: "Desfecho", subtitle: "Compareceu ou faltou", matcher: lead => ["attended", "no_show", "finished"].includes(lead.status), icon: "verified" }
  ];
  $("#lead-kanban").innerHTML = columns.map(column => {
    const items = filtered.filter(column.matcher);
    const anonymousKind = column.key === "new" ? "mapped" : column.key === "talking" ? "talking" : null;
    const anonymousBatches = !phoneOnly && anonymousKind ? anonymousPipelineDisplayBatches(anonymousKind, priorityFilter) : [];
    const anonymousVolume = anonymousBatches.reduce((total, batch) => total + Number(batch.remaining || 0), 0);
    const volumeCard = anonymousBatches.map(batch => {
      const clinic = clinicById(batch.clinicId);
      return `<article class="kanban-volume-card ${column.key}">
        <span class="material-symbols-outlined">${column.key === "new" ? "alternate_email" : "forum"}</span>
        <div><strong>${batch.remaining} ${batch.remaining === 1 ? "lead anônimo" : "leads anônimos"}</strong><small>${escapeHtml(clinic?.name || "Clínica")} · ${anonymousBatchDeadline(batch, anonymousKind)}</small></div>
        ${anonymousKind === "talking" && canEditOperation() ? `<button type="button" data-anonymous-hunter="${batch.groupedBatchIds?.[0] || batch.id}" aria-label="Identificar lead e enviar à Hunter"><span class="material-symbols-outlined">person_edit</span>Identificar</button>` : ""}
      </article>`;
    }).join("");
    return `<section class="kanban-column" data-kanban-column="${column.key}">
      <header><span class="kanban-column-icon"><span class="material-symbols-outlined">${column.icon}</span></span><div><strong>${column.title}</strong><small>${column.subtitle}</small></div><span class="kanban-column-tools"><b>${items.length + anonymousVolume}</b>${canEditOperation() ? `<button type="button" data-add-lead-stage="${column.key}" aria-label="Adicionar em ${column.title}"><span class="material-symbols-outlined">add</span></button>` : ""}</span></header>
      <div class="kanban-cards">${volumeCard}${items.map(kanbanLeadCard).join("") || (!volumeCard ? `<div class="kanban-empty">Nenhum lead nesta etapa</div>` : "")}</div>
    </section>`;
  }).join("");
  $$("[data-lead]").forEach(card => card.addEventListener("click", () => openLeadDetail(card.dataset.lead)));
  $$("[data-quick-responded]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    markLeadResponded(button.dataset.quickResponded);
  }));
  $$("[data-quick-phone]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openLeadForm({ leadId: button.dataset.quickPhone, mode: "phone" });
  }));
  $$("[data-quick-hunter]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    sendLeadToHunter(button.dataset.quickHunter);
  }));
  $$("[data-quick-resend]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const lead = leadById(button.dataset.quickResend);
    if (lead) openHunterWhatsApp(lead);
  }));
  $$("[data-quick-hunter-update]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openHunterUpdate(button.dataset.quickHunterUpdate);
  }));
  $$("[data-anonymous-hunter]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openLeadForm({ mode: "phone", anonymousBatchId: button.dataset.anonymousHunter });
  }));
  $$("[data-add-lead-stage]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    if (button.dataset.addLeadStage === "outcomes") return openOutcomeStagePicker();
    openLeadForm({ initialStatus: button.dataset.addLeadStage });
  }));
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
  const canCapturePhone = ["new", "talking", "follow_up", "lost"].includes(lead.status);
  const quickActions = canEditOperation() ? [
    ["new", "lost"].includes(lead.status)
      ? `<button type="button" data-quick-responded="${lead.id}"><span class="material-symbols-outlined">mark_chat_read</span>Respondeu</button>`
      : "",
    canCapturePhone && !lead.whatsapp
      ? `<button type="button" class="primary" data-quick-phone="${lead.id}"><span class="material-symbols-outlined">phone_in_talk</span>Adicionar telefone</button>`
      : "",
    canCapturePhone && lead.whatsapp
      ? `<button type="button" class="primary" data-quick-hunter="${lead.id}"><span class="material-symbols-outlined">forward_to_inbox</span>Enviar à Hunter</button>`
      : "",
    lead.status === "sent_to_hunter"
      ? `<button type="button" data-quick-resend="${lead.id}"><span class="material-symbols-outlined">forward_to_inbox</span>Reencaminhar</button>
         <button type="button" class="primary" data-quick-hunter-update="${lead.id}"><span class="material-symbols-outlined">event_available</span>Adicionar agendamento</button>`
      : "",
    lead.status === "scheduled"
      ? `<button type="button" class="primary" data-quick-hunter-update="${lead.id}"><span class="material-symbols-outlined">how_to_reg</span>Registrar presença</button>`
      : ""
  ].filter(Boolean).join("") : "";
  return `<article class="kanban-lead-card clickable" data-lead="${lead.id}">
    <div class="kanban-card-top"><span class="priority-dot priority-${priority.key.toLowerCase()}">${priority.key}</span><small>${escapeHtml(clinic?.name || "Clínica")}</small><span class="lead-temperature ${lead.temperature || "cold"}">${{ hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Frio"}</span></div>
    <strong>${escapeHtml(lead.name || lead.instagram || "Lead sem nome")}</strong>
    <span class="kanban-lead-meta"><span>${escapeHtml(lead.instagram || "Instagram não informado")}${lead.interest ? ` · ${escapeHtml(lead.interest)}` : ""}</span>${leadPhoneMappedAt(lead) ? `<i class="material-symbols-outlined" title="Telefone já captado" aria-label="Telefone já captado">phone_in_talk</i>` : ""}</span>
    <footer><span class="material-symbols-outlined">hourglass_bottom</span><span class="kanban-deadline">${leadDeadlineLabel(lead)}</span><b class="material-symbols-outlined">chevron_right</b></footer>
    ${quickActions ? `<div class="kanban-card-actions">${quickActions}</div>` : ""}
  </article>`;
}

function markLeadResponded(leadId) {
  if (!requireOperationEdit()) return;
  const lead = leadById(leadId);
  if (!lead) return;
  const now = new Date().toISOString();
  lead.status = "talking";
  lead.respondedAt ||= now;
  lead.lastContactAt = now;
  lead.timeline ||= [];
  lead.timeline.push({ at: now, label: "Lead respondeu ao direct" });
  persist();
  renderDashboard();
  renderLeads();
  renderReport();
  showToast(`${lead.instagram || lead.name} avançou para Conversando`);
}

function sendLeadToHunter(leadId) {
  if (!requireOperationEdit()) return;
  const lead = leadById(leadId);
  if (!lead) return;
  if (!lead.whatsapp || !String(lead.name || "").trim() || !isUsableLeadHandle(lead.clinicId, lead.instagram)) {
    return openLeadForm({ leadId, mode: "phone" });
  }
  const clinic = clinicById(lead.clinicId);
  const now = new Date().toISOString();
  lead.status = "sent_to_hunter";
  lead.sentToHunterAt ||= now;
  lead.lastContactAt = now;
  lead.timeline ||= [];
  lead.timeline.push({ at: now, label: `Encaminhado para ${clinic?.hunter || "Hunter"}` });
  persist();
  renderDashboard();
  renderLeads();
  renderReport();
  openHunterWhatsApp(lead);
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
  const groupedItems = [...groups.values()];
  container.innerHTML = groupedItems.map((group, groupIndex) => `<section class="hunter-group">
    <header><span class="material-symbols-outlined">support_agent</span><div><strong>${escapeHtml(group.hunter)}</strong><small>${group.leads.length} ${group.leads.length === 1 ? "retorno pendente" : "retornos pendentes"}</small></div>
      ${canEditOperation() ? `<button class="hunter-group-message" data-hunter-group="${groupIndex}"><span class="material-symbols-outlined">chat</span>Cobrar</button>` : `<span class="viewer-status"><span class="material-symbols-outlined">visibility</span>Acompanhamento</span>`}
    </header>
    <div>${group.leads.map(lead => {
      const clinic = clinicById(lead.clinicId);
      return `<article ${canEditOperation() ? `data-hunter-update="${lead.id}"` : `data-lead="${lead.id}"`}><div><strong>${escapeHtml(lead.name || lead.instagram)}</strong><small>${escapeHtml(clinic?.name || "")} · ${lead.status === "scheduled" ? `agendado ${formatDate(lead.scheduledAt, true)}` : "aguardando agendamento"}</small></div><span class="material-symbols-outlined">chevron_right</span></article>`;
    }).join("")}</div>
  </section>`).join("") || `<p class="report-empty">Nenhum retorno pendente com as Hunters.</p>`;
  $$("[data-hunter-group]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openHunterGroupReminder(groupedItems[Number(button.dataset.hunterGroup)]);
  }));
  $$("[data-hunter-update]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openHunterUpdate(button.dataset.hunterUpdate);
  }));
  $$("[data-lead]", container).forEach(card => card.addEventListener("click", () => openLeadDetail(card.dataset.lead)));
}

function openHunterGroupReminder(group) {
  if (!group?.phone) return showToast("Cadastre o WhatsApp da Hunter.");
  const calendar = "\u{1F4C5}";
  const phone = "\u{1F4F2}";
  const lines = group.leads.map((lead, index) => {
    const clinic = clinicById(lead.clinicId);
    const pending = lead.status === "scheduled"
      ? `confirmar comparecimento (${formatDate(lead.scheduledAt, true)})`
      : "confirmar se avançou para agendamento";
    return `${index + 1}. *${lead.name || lead.instagram}* · ${clinic?.name || "Clínica"}\n   ${pending}`;
  });
  const message = `${phone} *CHECK-IN DOS LEADS*\n\nOi, ${group.hunter}! Pode me atualizar estes ${group.leads.length} contatos?\n\n${lines.join("\n\n")}\n\n${calendar} Assim eu deixo nosso acompanhamento certinho por aqui. Obrigada!`;
  window.open(`https://wa.me/${group.phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function renderFollowups() {
  if (!$("#followup-list")) return;
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

function reportPeriodCopy(period, reference, start, end) {
  const labels = { day: "Hoje", week: "Últimos 7 dias", month: "Este mês" };
  const label = reference
    ? period === "day" ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(start)
      : period === "month" ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(start)
      : `7 dias até ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(end)}`
    : labels[period];
  const date = period === "day"
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(start)
    : `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(start)} a ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(end)}`;
  return { label, date };
}

function reportBrandMarkup(kind) {
  return `<div class="report-brand"><span class="report-brand-mark"><img src="assets/munnius-mark-light.png" alt="Munnius"></span><span>${escapeHtml(kind)} de <strong>${escapeHtml(state.profile?.name || "Social seller")}</strong></span></div>`;
}

function leadReachedHunter(lead) {
  return Boolean(lead.sentToHunterAt || ["sent_to_hunter", "scheduled", "attended", "no_show"].includes(lead.status));
}

function leadReachedScheduling(lead) {
  return Boolean(leadScheduledRecordedAt(lead) || ["scheduled", "attended", "no_show"].includes(lead.status));
}

function leadReachedAttendance(lead) {
  return Boolean(lead.attendedAt || lead.status === "attended");
}

function renderPhoneReport(reference, reportStart, displayEnd) {
  const period = state.reportPeriod;
  const copy = reportPeriodCopy(period, reference, reportStart, displayEnd);
  const leads = state.leads
    .filter(lead => phoneDigits(lead.whatsapp || "") && inPeriod(leadPhoneMappedAt(lead), period, reference))
    .sort((a, b) => {
      const highlighted = lead => ["sent_to_hunter", "scheduled", "attended"].includes(lead.status) ? 1 : 0;
      return highlighted(b) - highlighted(a) || new Date(leadPhoneMappedAt(b) || 0) - new Date(leadPhoneMappedAt(a) || 0);
    });
  const reachedHunter = leads.filter(leadReachedHunter).length;
  const reachedScheduling = leads.filter(leadReachedScheduling).length;
  const reachedAttendance = leads.filter(leadReachedAttendance).length;
  $("#phone-report-card").innerHTML = `${reportBrandMarkup("Auditoria de telefones")}
    <p class="overline">Rastreabilidade dos contatos</p>
    <div class="report-heading"><div><h2>${escapeHtml(copy.label)}</h2><p>${escapeHtml(copy.date)}</p></div><span class="report-badge">Telefones</span></div>
    <div class="phone-funnel-summary">
      <div><span class="material-symbols-outlined">phone_in_talk</span><strong>${leads.length}</strong><small>Captados</small></div>
      <div><span class="material-symbols-outlined">forward_to_inbox</span><strong>${reachedHunter}</strong><small>Foram à Hunter</small></div>
      <div><span class="material-symbols-outlined">event_available</span><strong>${reachedScheduling}</strong><small>Foram agendados</small></div>
      <div><span class="material-symbols-outlined">verified</span><strong>${reachedAttendance}</strong><small>Compareceram</small></div>
    </div>
    <p class="phone-funnel-note">As etapas são cumulativas: o mesmo contato aparece em todas as fases que alcançou.</p>
    <div class="report-section-title"><span>Listagem para auditoria</span><small>${leads.length} ${leads.length === 1 ? "contato" : "contatos"}</small></div>
    <div class="phone-audit-list">${leads.map(lead => {
      const clinic = clinicById(lead.clinicId);
      const highlighted = ["sent_to_hunter", "scheduled", "attended"].includes(lead.status);
      return `<div class="phone-audit-row ${highlighted ? "highlighted" : ""}">
        <span class="phone-audit-icon material-symbols-outlined">${lead.status === "attended" ? "verified" : lead.status === "scheduled" ? "event_available" : lead.status === "sent_to_hunter" ? "forward_to_inbox" : "phone_in_talk"}</span>
        <p><strong>${escapeHtml(lead.name || lead.instagram || "Lead sem nome")}</strong><small>${escapeHtml(lead.instagram || "Instagram não informado")} · ${escapeHtml(phoneDigits(lead.whatsapp))}</small></p>
        <b>${escapeHtml(statusNames[lead.status] || "Conversando")}</b>
        <span class="phone-audit-context"><strong>${escapeHtml(clinic?.name || "Clínica")}</strong><small>Hunter ${escapeHtml(clinic?.hunter || "não informada")} · captado ${formatDate(leadPhoneMappedAt(lead))}</small></span>
      </div>`;
    }).join("") || `<p class="report-empty">Nenhum telefone foi captado neste período.</p>`}</div>
    <div class="report-footer"><span>Auditoria de telefones captados</span><strong>Origem, etapa e responsável</strong></div>`;
}

function renderExecutiveReport(reference, reportStart, displayEnd) {
  const period = state.reportPeriod;
  const copy = reportPeriodCopy(period, reference, reportStart, displayEnd);
  const stats = periodStats(period, reference);
  const actions = reportActionCount(stats);
  const phones = phoneActionCount(stats);
  const responseRate = rate(stats.responses, stats.directs);
  const directsPerPhone = phones ? (stats.directs / phones).toFixed(1).replace(".", ",") : "—";
  $("#executive-report-card").innerHTML = `${reportBrandMarkup("Resumo executivo")}
    <p class="overline">Principais resultados</p>
    <div class="report-heading"><div><h2>${escapeHtml(copy.label)}</h2><p>${escapeHtml(copy.date)}</p></div><span class="report-badge">Executivo</span></div>
    <div class="executive-hero"><span class="material-symbols-outlined">auto_graph</span><p><strong>${phones} telefones captados</strong><small>${stats.huntersTotal} encaminhados · ${stats.scheduledTotal} agendados · ${stats.attendedTotal} comparecimentos</small></p></div>
    <div class="executive-metrics">
      <div><strong>${actions}</strong><small>Ações realizadas</small></div>
      <div><strong>${stats.directs}</strong><small>Directs enviados</small></div>
      <div><strong>${stats.responses}</strong><small>Directs respondidos</small></div>
      <div><strong>${phones}</strong><small>Telefones captados</small></div>
      <div><strong>${stats.scheduledTotal}</strong><small>Agendamentos</small></div>
      <div><strong>${stats.attendedTotal}</strong><small>Comparecimentos</small></div>
    </div>
    <div class="executive-efficiency"><span><strong>${responseRate}%</strong><small>taxa de resposta</small></span><i></i><span><strong>${directsPerPhone}</strong><small>directs por telefone</small></span></div>
    <div class="report-footer"><span>Resumo executivo de social selling</span><strong>Atividade que virou oportunidade</strong></div>`;
}

function renderReport() {
  const reportKind = state.reportKind || "operation";
  $$("[data-report-kind]").forEach(button => button.classList.toggle("active", button.dataset.reportKind === reportKind));
  $$("[data-report-card]").forEach(card => card.classList.toggle("hidden", card.dataset.reportCard !== reportKind));
  const reference = state.reportReference || null;
  $("#report-reference-date").value = reference || "";
  $("#clear-report-date").classList.toggle("hidden", !reference);
  const stats = periodStats(state.reportPeriod, reference);
  const movements = crmMovementStats(state.reportPeriod, stats, reference);
  const pipeline = currentPipelineStats();
  const pipelineRates = currentPipelineRates(pipeline);
  const monthly = periodStats("month");
  const actions = reportActionCount(stats);
  const labels = { day: "Hoje", week: "Últimos 7 dias", month: "Este mês" };
  const { start: reportStart, end: reportEnd } = periodBounds(state.reportPeriod, reference);
  const displayEnd = new Date(reportEnd); displayEnd.setMilliseconds(-1);
  $("#report-label").textContent = reference
    ? state.reportPeriod === "day" ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(reportStart)
      : state.reportPeriod === "month" ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(reportStart)
      : `7 dias até ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(displayEnd)}`
    : labels[state.reportPeriod];
  $("#report-date").textContent = state.reportPeriod === "day"
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(reportStart)
    : `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(reportStart)} a ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(displayEnd)}`;
  $("#report-phones").textContent = phoneActionCount(stats);
  $("#report-actions-total").textContent = `${actions} ${actions === 1 ? "ação no período" : "ações no período"}`;
  $("#report-likes").textContent = stats.likes;
  $("#report-comments").textContent = stats.comments;
  $("#report-directs-detail").textContent = stats.directs;
  $("#report-responses").textContent = stats.responses;
  const pipelineItems = [
    ["mapped", "person_search", "Leads mapeados", "início do funil", `${movements.mapped} directs enviados`],
    ["talking", "forum", "Conversando", `${pipelineRates.talking}% avançaram`, `${movements.talking} responderam`],
    ["qualified", "forward_to_inbox", "Encaminhados", `${pipelineRates.qualified}% das conversas`, `${movements.qualified} enviados`],
    ["scheduled", "event_available", "Agendados", `${pipelineRates.scheduled}% dos encaminhados`, `${movements.scheduled} novos`],
    ["attended", "verified", "Compareceram", `${pipelineRates.attended}% dos agendados`, `${movements.attended} registros`]
  ];
  $("#report-current-pipeline").innerHTML = pipelineItems.map(([key, icon, label, helper, movementLabel]) => `
    <div class="report-pipeline-stage"><span class="material-symbols-outlined">${icon}</span><strong>${pipeline[key]}</strong><small>${label}</small><mark>${movementLabel}</mark><em>${helper}</em></div>`).join("");
  $("#report-expired-note").classList.toggle("hidden", !movements.lost);
  $("#report-expired-note").textContent = movements.lost ? `${movements.lost} ${movements.lost === 1 ? "oportunidade foi encaminhada" : "oportunidades foram encaminhadas"} discretamente para Perdidos por tempo de resposta esgotado.` : "";
  $("#report-goal-month").textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  $("#report-goal-phones").textContent = `${monthly.phonesTotal} / ${state.goals.phones}`;
  $("#report-goal-scheduled").textContent = `${monthly.scheduledTotal} / ${state.goals.scheduled}`;
  $("#report-goal-phones-bar").style.width = `${Math.min(100, monthly.phonesTotal / state.goals.phones * 100)}%`;
  $("#report-goal-scheduled-bar").style.width = `${Math.min(100, monthly.scheduledTotal / state.goals.scheduled * 100)}%`;
  $("#report-user").textContent = state.profile?.name || "Social seller";
  const clinicRows = state.clinics.filter(clinic => clinic.active).map(clinic => ({ clinic, current: clinicCurrentPipelineStats(clinic.id) }))
    .filter(row => Object.values(row.current).some(Boolean))
    .sort((a, b) => (b.current.qualified + b.current.scheduled + b.current.attended) - (a.current.qualified + a.current.scheduled + a.current.attended)
      || b.current.talking - a.current.talking || b.current.mapped - a.current.mapped);
  $("#report-clinic-breakdown").innerHTML = clinicRows.map(({ clinic, current }) => {
    return `<div><span class="clinic-mini-avatar" style="background:${clinic.color}">${initials(clinic.name).slice(0,1)}</span>
      <p><strong>${escapeHtml(clinic.name)}</strong><small>Status atual</small></p>
      <b><i class="clinic-current-line">${current.mapped} mapeados · ${current.talking} conversando · ${current.qualified} Hunter · ${current.scheduled} agend. · ${current.attended} comp.</i></b>
    </div>`;
  }).join("") || `<p class="report-empty">Nenhuma oportunidade ativa nas clínicas.</p>`;
  renderPhoneReport(reference, reportStart, displayEnd);
  renderExecutiveReport(reference, reportStart, displayEnd);
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
  if (!requireOperationEdit()) return;
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
  if (!requireOperationEdit()) return;
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
  if (!requireOperationEdit()) return;
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
      if (!normalizedInstagram && stage === "sent") {
        addAnonymousDirect(clinic.id, state.session.id, now, "manual_web");
      } else if (!normalizedInstagram && stage !== "sent") {
        advanceAnonymousLead(clinic.id, stage, now, state.session.id, "manual_web");
      }
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
  if (!requireOperationEdit()) return;
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
  if (!requireOperationEdit()) return;
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
  if (!requireOperationEdit()) return;
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
      ${field("clinic-price", "Valor da avaliação", clinic.evaluationPrice, false, "number", "300")}
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
        color: clinic.color || ["#9b88aa", "#c88e82", "#7899aa", "#91aa9d"][state.clinics.length % 4], active: true
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
        <label class="bant-note"><span>O que ela respondeu</span><textarea id="qualification-note-${group.key}" placeholder="Resumo curto da resposta">${escapeHtml(lead.qualificationNotes?.[group.key] || "")}</textarea></label>
      </section>`).join("")}</div>`;
}

function readQualification() {
  return Object.fromEntries(qualificationItems.map(([key]) => [key, Boolean($(`#qualification-${key}`)?.checked)]));
}

function readQualificationNotes() {
  return Object.fromEntries(qualificationGroups.map(group => [group.key, $(`#qualification-note-${group.key}`)?.value.trim() || ""]));
}

function qualificationProgress(qualification = {}) {
  const total = qualificationItems.length;
  const done = qualificationItems.filter(([key]) => Boolean(qualification?.[key])).length;
  return { done, total, percent: total ? Math.round(done / total * 100) : 0, complete: done === total };
}

function isBantComplete(lead = {}) {
  return qualificationProgress(lead.qualification).complete;
}

function openOutcomeStagePicker() {
  if (!requireOperationEdit()) return;
  openSheet(`<h2 class="sheet-title">Adicionar desfecho</h2><p class="sheet-subtitle">Escolha o resultado confirmado pela Hunter.</p>
    <div class="clinic-options">
      <button class="clinic-option" data-outcome-stage="attended"><span><strong>Compareceu</strong><small>Registrar atendimento realizado</small></span><b class="material-symbols-outlined">how_to_reg</b></button>
      <button class="clinic-option" data-outcome-stage="no_show"><span><strong>Não compareceu</strong><small>Registrar ausência no atendimento</small></span><b class="material-symbols-outlined">person_off</b></button>
    </div>`, () => {
    $$("[data-outcome-stage]").forEach(button => button.addEventListener("click", () => openLeadForm({ initialStatus: button.dataset.outcomeStage })));
  });
}

function openLeadForm({ leadId = null, mode = "mapped", onSaved = null, anonymousBatchId = null, initialStatus = null } = {}) {
  if (!requireOperationEdit()) return;
  const originalLead = leadId ? leadById(leadId) : null;
  const selectedAnonymousBatch = anonymousBatchId
    ? (state.anonymousConversationBatches || []).find(batch => batch.id === anonymousBatchId && Number(batch.remaining || 0) > 0)
    : null;
  if (anonymousBatchId && !selectedAnonymousBatch) return showToast("Esse grupo já foi atualizado em outro aparelho.");
  const lead = originalLead || {};
  const edit = Boolean(originalLead);
  const requestedStatus = initialStatus === "outcomes" ? "attended" : initialStatus;
  const isPhone = mode === "phone" || requestedStatus === "sent_to_hunter";
  const isResponse = mode === "response" || requestedStatus === "talking";
  const fixedStatus = requestedStatus || (isPhone ? "sent_to_hunter" : isResponse ? "talking" : null);
  const requiresIdentity = isPhone || ["lost", "sent_to_hunter", "scheduled", "attended", "no_show", "finished"].includes(fixedStatus);
  const stageTitle = fixedStatus ? statusNames[fixedStatus] || "Desfecho" : null;
  const title = initialStatus ? `Adicionar em ${stageTitle}` : isPhone ? "Telefone captado" : isResponse ? "Lead respondeu" : edit ? "Editar lead" : "Lead mapeado";
  const submitLabel = isPhone ? "🎉 Salvar e enviar para closer" : edit ? "Salvar alterações" : fixedStatus ? `Salvar em ${stageTitle}` : "Salvar lead";
  const initialBant = qualificationProgress(lead.qualification);
  openSheet(`<h2 class="sheet-title">${title}</h2><p class="sheet-subtitle">${isPhone ? "Conclua a pré-qualificação e entregue a oportunidade sem a closer repetir perguntas." : "Cole o @ ou o link do Instagram para não perder a conversa."}</p>
    <form class="sheet-form" id="lead-form">
      ${field("lead-instagram", "Instagram", lead.instagram, requiresIdentity || Boolean(selectedAnonymousBatch), "text", "@usuario ou link")}
      ${field("lead-name", "Nome", lead.name, requiresIdentity, "text", "Nome do lead")}
      ${(edit || (fixedStatus && !isPhone && !["new", "talking", "lost"].includes(fixedStatus))) && !isPhone ? field("lead-phone", "WhatsApp", lead.whatsapp, false, "tel", "(00) 00000-0000") : ""}
      <div class="field"><label for="lead-clinic">Clínica</label><select id="lead-clinic" ${selectedAnonymousBatch ? "disabled" : ""}>${state.clinics.filter(c => c.active).map(c => `<option value="${c.id}" ${(lead.clinicId || selectedAnonymousBatch?.clinicId || state.session?.clinicId) === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
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
      ${isPhone ? field("lead-phone", "WhatsApp para entrega", lead.whatsapp, true, "tel", "(00) 00000-0000") : ""}
      ${fixedStatus ? "" : `<div class="field"><label for="lead-status">Etapa do lead</label><select id="lead-status">${Object.entries(statusNames).filter(([key]) => key !== "follow_up").map(([key, label]) => `<option value="${key}" ${(lead.status === "follow_up" ? "talking" : lead.status || "new") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>`}
      ${["scheduled", "attended", "no_show"].includes(fixedStatus) ? `<div class="field"><label for="lead-stage-date">Data do ${fixedStatus === "scheduled" ? "agendamento" : "atendimento"}</label><input id="lead-stage-date" type="datetime-local"></div>` : ""}
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
      const rawInstagram = $("#lead-instagram").value.trim();
      const now = new Date().toISOString();
      const status = fixedStatus || $("#lead-status").value;
      if (requiresIdentity && (!String($("#lead-name").value || "").trim() || !isUsableLeadHandle(clinicId, rawInstagram))) {
        showToast("Para esta etapa, informe o nome e o @ do lead.");
        return;
      }
      if (!rawInstagram && status === "new" && !originalLead) {
        addAnonymousDirect(clinicId, state.session?.id || null, now, "manual_web", 1);
        if (state.session?.clinicId === clinicId) updateAction("directs");
        persist();
        renderDashboard();
        renderLeads();
        closeSheet();
        showToast("Lead anônimo adicionado em Mapeados");
        return;
      }
      if (!rawInstagram && isResponse && !originalLead) {
        const conversation = advanceAnonymousLead(clinicId, "responded", now, state.session?.id || null, "manual_web");
        if (state.session?.clinicId === clinicId) {
          updateAction("responses");
          const sourceBatch = (state.anonymousDirectBatches || []).find(batch => batch.id === conversation?.sourceBatchId);
          if (sourceBatch?.inferredOrigin) updateAction("directs");
        }
        persist();
        renderDashboard();
        renderLeads();
        closeSheet();
        showToast("Resposta anônima movida para Conversando");
        return;
      }
      const instagram = instagramHandle(rawInstagram);
      const existing = !edit ? state.leads.find(item => item.clinicId === clinicId && instagramHandle(item.instagram) === instagram) : null;
      const anonymousConversationMatch = selectedAnonymousBatch
        ? consumeAnonymousConversationBatch(selectedAnonymousBatch.id)
        : !originalLead && !existing && ["sent_to_hunter", "scheduled", "attended", "no_show"].includes(status)
          ? consumeOldestAnonymousConversation(clinicId)
        : null;
      const anonymousMatch = !originalLead && !existing && status !== "new" && !anonymousConversationMatch
        ? consumeOldestAnonymousDirect(clinicId)
        : null;
      const record = originalLead || existing || {
        id: uid("lead"), prospectedAt: anonymousMatch?.sentAt || anonymousConversationMatch?.respondedAt || new Date().toISOString(), timeline: [], sentToHunterAt: null
      };
      const shouldSend = isPhone || (status === "sent_to_hunter" && !record.sentToHunterAt);
      record.timeline ||= [];
      Object.assign(record, {
        name: $("#lead-name").value.trim(), instagram,
        whatsapp: $("#lead-phone") ? phoneDigits($("#lead-phone").value) : record.whatsapp || "",
        clinicId, status, lastContactAt: now,
        interest: $("#lead-interest").value.trim(),
        temperature: $("#lead-temperature").value,
        qualification: readQualification(),
        qualificationNotes: readQualificationNotes()
      });
      if (record.whatsapp) record.phoneCapturedAt ||= now;
      if (!originalLead && !existing) state.leads.unshift(record);
      if (isResponse) {
        record.respondedAt ||= now;
        record.timeline.push({ at: now, label: existing ? "Nova resposta registrada" : "Lead respondeu ao direct" });
      } else if (isPhone) {
        record.phoneCapturedAt ||= now;
        record.timeline.push({ at: now, label: "WhatsApp captado e qualificação concluída" });
      }
      else record.timeline.push({ at: now, label: edit ? `Etapa alterada para ${statusNames[status]}` : "Lead mapeado" });
      if ((anonymousMatch || anonymousConversationMatch) && !state.directs.some(item => item.leadId === record.id)) {
        state.directs.push({
          id: uid("direct"), clinicId, leadId: record.id, instagram,
          sessionId: anonymousMatch?.sessionId || anonymousConversationMatch?.sessionId || null, source: anonymousMatch?.source || anonymousConversationMatch?.source || "manual_web",
          sentAt: anonymousMatch?.sentAt || null,
          respondedAt: anonymousConversationMatch?.respondedAt || (status === "lost" ? null : now),
          phoneAt: record.whatsapp ? (record.phoneCapturedAt || now) : null,
          status: record.whatsapp ? "phone" : status === "lost" ? "lost" : "responded",
          anonymousSourceId: anonymousMatch?.id || anonymousConversationMatch?.sourceBatchId || null,
          anonymousConversationSourceId: anonymousConversationMatch?.id || null,
          createdAt: anonymousMatch?.sentAt || anonymousConversationMatch?.respondedAt || now, updatedAt: now
        });
      }
      if (!anonymousMatch && !anonymousConversationMatch && !originalLead && !existing) {
        const directsBefore = state.directs.length;
        ensureNamedDirectOrigin(record, record.prospectedAt || now, "manual_web", state.session?.id || null);
        if (state.directs.length > directsBefore && state.session?.clinicId === clinicId) updateAction("directs");
      }
      const followupAt = $("#lead-followup")?.value;
      if (followupAt) {
        state.followups.push({ id: uid("fu"), leadId: record.id, scheduledFor: new Date(followupAt).toISOString(), step: "Follow-up", status: "pending" });
        record.status = "follow_up";
        record.timeline.push({ at: now, label: `Follow-up agendado para ${formatDate(followupAt, true)}` });
      }
      const stageDate = $("#lead-stage-date")?.value ? new Date($("#lead-stage-date").value).toISOString() : now;
      if (status === "scheduled") {
        record.scheduledAt = stageDate;
        record.scheduledRecordedAt ||= now;
        record.timeline.push({ at: now, label: `Hunter confirmou agendamento para ${formatDate(stageDate, true)}` });
      }
      if (status === "attended") {
        record.attendedAt = stageDate;
        record.timeline.push({ at: now, label: "Comparecimento confirmado" });
      }
      if (status === "no_show") {
        record.noShowAt = stageDate;
        record.timeline.push({ at: now, label: "Ausência registrada" });
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
    const note = lead.qualificationNotes?.[group.key];
    return `<section class="bant-summary-group"><span>${group.key}</span><div><strong>${group.title}</strong>${checked.length ? checked.map(([, label]) => `<small>✓ ${escapeHtml(label)}</small>`).join("") : "<small>Ainda não explorado</small>"}${note ? `<small class="bant-summary-note">${escapeHtml(note)}</small>` : ""}</div></section>`;
  }).join("");
  const canSend = canEditOperation() && lead.whatsapp && !lead.sentToHunterAt;
  const hunterTracking = lead.sentToHunterAt ? `<div class="hunter-tracking">
      <div><span class="material-symbols-outlined">${lead.status === "attended" ? "verified" : lead.status === "no_show" ? "event_busy" : lead.status === "scheduled" ? "event_available" : "hourglass_top"}</span>
        <p><strong>Retorno da Hunter</strong><small>${lead.status === "attended" ? "Paciente compareceu" : lead.status === "no_show" ? "Paciente não compareceu" : lead.status === "scheduled" ? `Agendado para ${formatDate(lead.scheduledAt, true)}` : "Aguardando confirmação do agendamento"}</small></p>
      </div>
      ${canEditOperation() ? lead.status === "sent_to_hunter" ? `<div class="hunter-tracking-actions"><button class="small-link" id="resend-hunter">Reencaminhar</button><button class="small-link" id="hunter-update">Atualizar</button></div>` : lead.status === "scheduled" ? `<button class="small-link" id="hunter-update">Atualizar</button>` : "" : ""}
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
    <div class="detail-actions ${canEditOperation() ? "" : "viewer-detail-actions"}">${canEditOperation() ? `<button class="secondary-button" id="edit-lead">Editar</button>` : ""}<button class="primary-button" id="contact-lead">Abrir Instagram</button></div>
    <h3 class="timeline-title">Histórico resumido</h3><div class="timeline">${[...(lead.timeline || [])].reverse().map(item => `<div><i></i><span><strong>${escapeHtml(item.label)}</strong><small>${formatDate(item.at, true)}</small></span></div>`).join("")}</div>
    ${canSend ? `<button class="primary-button" id="send-hunter"><span class="material-symbols-outlined">forward_to_inbox</span>Enviar para closer</button>` : ""}
    ${canEditOperation() ? `<button class="danger-link" id="delete-lead"><span class="material-symbols-outlined">delete</span>Excluir lead</button>` : ""}`, () => {
    $("#edit-lead")?.addEventListener("click", () => openLeadForm({ leadId }));
    $("#contact-lead").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#delete-lead")?.addEventListener("click", () => openDeleteLeadConfirmation(leadId));
    $("#resend-hunter")?.addEventListener("click", () => openHunterWhatsApp(lead));
    $("#hunter-update")?.addEventListener("click", () => openHunterUpdate(leadId));
    $("#send-hunter")?.addEventListener("click", () => sendLeadToHunter(leadId));
  });
}

function openDeleteLeadConfirmation(leadId) {
  if (!requireOperationEdit()) return;
  const lead = leadById(leadId);
  if (!lead) return;
  openSheet(`<div class="destructive-confirmation">
    <span class="material-symbols-outlined">delete_forever</span>
    <h2 class="sheet-title">Excluir este lead?</h2>
    <p class="sheet-subtitle">${escapeHtml(lead.name || lead.instagram)} será removido do CRM, das pendências e dos indicadores. Essa ação não pode ser desfeita.</p>
    <div class="detail-actions"><button class="secondary-button" id="cancel-delete-lead">Cancelar</button><button class="danger-button" id="confirm-delete-lead">Excluir definitivamente</button></div>
  </div>`, () => {
    $("#cancel-delete-lead").addEventListener("click", () => openLeadDetail(leadId));
    $("#confirm-delete-lead").addEventListener("click", async () => {
      const linkedDirects = state.directs.filter(direct => direct.leadId === leadId);
      linkedDirects.forEach(direct => {
        if (direct.anonymousConversationSourceId) {
          const batch = (state.anonymousConversationBatches || []).find(item => item.id === direct.anonymousConversationSourceId);
          if (batch) {
            batch.consumed = Math.max(0, Number(batch.consumed || 0) - 1);
            if (new Date(batch.respondedAt || 0).getTime() >= Date.now() - 14 * 86400000) {
              batch.remaining = Number(batch.remaining || 0) + 1;
              batch.expiredAt = null;
            } else {
              batch.expired = Number(batch.expired || 0) + 1;
            }
          }
          return;
        }
        if (direct.anonymousSourceId) {
          const batch = (state.anonymousDirectBatches || []).find(item => item.id === direct.anonymousSourceId);
          if (batch) {
            batch.consumed = Math.max(0, Number(batch.consumed || 0) - 1);
            if (new Date(batch.sentAt || 0).getTime() >= Date.now() - 7 * 86400000) {
              batch.remaining = Number(batch.remaining || 0) + 1;
              batch.expiredAt = null;
            } else {
              batch.expired = Number(batch.expired || 0) + 1;
            }
          }
          return;
        }
        const session = state.session?.id === direct.sessionId
          ? state.session
          : state.sessions.find(item => item.id === direct.sessionId);
        if (!session?.counts) return;
        if (direct.sentAt) session.counts.directs = Math.max(0, Number(session.counts.directs || 0) - 1);
        if (direct.respondedAt) session.counts.responses = Math.max(0, Number(session.counts.responses || 0) - 1);
        if (direct.phoneAt) session.counts.phones = Math.max(0, Number(session.counts.phones || 0) - 1);
      });
      state.deletedLeadIds = [...new Set([...(state.deletedLeadIds || []), leadId])];
      state.leads = state.leads.filter(item => item.id !== leadId);
      state.followups = state.followups.filter(item => item.leadId !== leadId);
      state.directs = state.directs.filter(item => item.leadId !== leadId);
      try {
        await persistImmediately();
      } catch (error) {
        console.warn("Exclusão salva localmente; sincronização pendente.", error);
        persist();
      }
      renderDashboard();
      renderLeads();
      renderFollowups();
      renderReport();
      renderDirectHistory();
      closeSheet();
      showToast("Lead excluído de todos os indicadores");
    });
  });
}

function openHunterUpdate(leadId) {
  if (!requireOperationEdit()) return;
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
        const recordedAt = new Date().toISOString();
        lead.status = "scheduled";
        lead.scheduledAt = scheduledAt;
        lead.scheduledRecordedAt = recordedAt;
        lead.timeline.push({ at: recordedAt, label: `Hunter confirmou agendamento para ${formatDate(scheduledAt, true)}` });
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
  const temperature = { hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Não avaliada";
  const notes = qualificationGroups
    .map(group => String(lead.qualificationNotes?.[group.key] || "").trim())
    .filter(Boolean);
  const checked = qualificationItems
    .filter(([key]) => lead.qualification?.[key])
    .map(([, label]) => label);
  const aligned = [...notes, ...checked]
    .filter((value, index, items) => value && items.indexOf(value) === index)
    .slice(0, 6)
    .join("; ") || "Contexto mínimo; continuar a qualificação.";
  const leadIdentity = [lead.name || "Nome não informado", lead.instagram].filter(Boolean).join(" · ");
  const pendingFollowup = state.followups
    .filter(item => item.leadId === lead.id && item.status === "pending")
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];
  const sections = [
    "*NOVA OPORTUNIDADE GERADA!* 🎉",
    `*Clínica*\n${clinic.doctor || clinic.name}`,
    `*Nome da Lead*\n${leadIdentity}`,
    `*Telefone*\n${lead.whatsapp || "Não informado"}`,
    `*Interesse*\n${lead.interest || "Não identificado"}`,
    `*Temperatura*\n${temperature}`,
    `*Já alinhado*\n${aligned.slice(0, 650)}`
  ];
  if (pendingFollowup) sections.push(`*Follow combinado*\n${formatDate(pendingFollowup.scheduledFor, true)}`);
  const message = sections.join("\n\n");
  showToast(`Mensagem preparada para ${clinic.hunter || "a Hunter"}`);
  window.open(`https://wa.me/${clinic.hunterPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function openFollowup(followupId) {
  if (!requireOperationEdit()) return;
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

function canvasFitText(ctx, text, x, y, maxWidth, { size = 16, minSize = 11, weight = 500, color = null, align = "left" } = {}) {
  let currentSize = size;
  ctx.textAlign = align;
  ctx.font = `${weight} ${currentSize}px Arial`;
  while (currentSize > minSize && ctx.measureText(String(text)).width > maxWidth) {
    currentSize -= 1;
    ctx.font = `${weight} ${currentSize}px Arial`;
  }
  let fitted = String(text);
  if (ctx.measureText(fitted).width > maxWidth) {
    while (fitted.length > 1 && ctx.measureText(`${fitted}…`).width > maxWidth) fitted = fitted.slice(0, -1);
    fitted = `${fitted}…`;
  }
  if (color) ctx.fillStyle = color;
  ctx.fillText(fitted, x, y);
  ctx.textAlign = "left";
}

function canvasActivityIcon(ctx, type, x, y, tone) {
  ctx.save();
  ctx.strokeStyle = tone;
  ctx.fillStyle = tone;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === "heart") {
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 17);
    ctx.bezierCurveTo(x - 2, y + 9, x + 2, y, x + 9, y + 5);
    ctx.bezierCurveTo(x + 16, y, x + 20, y + 9, x + 9, y + 17);
    ctx.stroke();
  } else if (type === "chat") {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 3);
    ctx.lineTo(x + 16, y + 3);
    ctx.quadraticCurveTo(x + 19, y + 3, x + 19, y + 6);
    ctx.lineTo(x + 19, y + 13);
    ctx.quadraticCurveTo(x + 19, y + 16, x + 16, y + 16);
    ctx.lineTo(x + 8, y + 16);
    ctx.lineTo(x + 4, y + 20);
    ctx.lineTo(x + 4, y + 16);
    ctx.lineTo(x + 2, y + 16);
    ctx.quadraticCurveTo(x - 1, y + 16, x - 1, y + 13);
    ctx.lineTo(x - 1, y + 6);
    ctx.quadraticCurveTo(x - 1, y + 3, x + 2, y + 3);
    ctx.stroke();
  } else if (type === "person") {
    ctx.beginPath();
    ctx.arc(x + 9, y + 6, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 9, y + 19, 8, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 18, y + 7); ctx.lineTo(x + 18, y + 15);
    ctx.moveTo(x + 14, y + 11); ctx.lineTo(x + 22, y + 11);
    ctx.stroke();
  } else if (type === "phone") {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 2);
    ctx.quadraticCurveTo(x + 1, y + 4, x + 3, y + 9);
    ctx.quadraticCurveTo(x + 7, y + 18, x + 16, y + 20);
    ctx.quadraticCurveTo(x + 20, y + 20, x + 21, y + 16);
    ctx.lineTo(x + 16, y + 13);
    ctx.lineTo(x + 12, y + 16);
    ctx.quadraticCurveTo(x + 7, y + 13, x + 6, y + 8);
    ctx.lineTo(x + 9, y + 5);
    ctx.closePath();
    ctx.stroke();
  } else if (type === "send") {
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 13, y + 20);
    ctx.lineTo(x + 9, y + 11);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 11);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4);
    ctx.lineTo(x + 15, y + 4);
    ctx.quadraticCurveTo(x + 18, y + 4, x + 18, y + 7);
    ctx.lineTo(x + 18, y + 13);
    ctx.quadraticCurveTo(x + 18, y + 16, x + 15, y + 16);
    ctx.lineTo(x + 8, y + 16);
    ctx.lineTo(x + 4, y + 20);
    ctx.lineTo(x + 4, y + 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 10);
    ctx.lineTo(x + 9, y + 13);
    ctx.lineTo(x + 14, y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

function canvasMetric(ctx, x, y, value, label, tone = "#b58b00", width = 282, icon = null) {
  canvasRoundedRect(ctx, x, y, width, 106, 20, "#fffdf5", "#eadf9f");
  canvasRoundedRect(ctx, x + 18, y + 30, 42, 42, 13, "#fff0a8");
  if (icon) canvasActivityIcon(ctx, icon, x + 29, y + 40, tone);
  else {
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.arc(x + 39, y + 51, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#202631";
  ctx.font = "700 34px Arial";
  ctx.fillText(String(value), x + 74, y + 58);
  canvasFitText(ctx, label, x + 74, y + 82, width - 92, {
    size: width < 250 ? 13 : 18,
    minSize: width < 250 ? 8 : 11,
    weight: 500,
    color: "#68717d"
  });
}

async function exportReportLegacy(share = false) {
  const stats = periodStats(state.reportPeriod);
  const movements = crmMovementStats(state.reportPeriod, stats);
  const pipeline = currentPipelineStats();
  const pipelineRates = currentPipelineRates(pipeline);
  const monthly = periodStats("month");
  const actions = reportActionCount(stats);
  const reportClinicRows = state.clinics.filter(clinic => clinic.active).map(clinic => ({
    clinic,
    ...clinicReportStats(clinic.id, state.reportPeriod, stats)
  })).filter(row => row.actions || row.captured || row.qualifiedTotal || row.scheduledTotal || row.attendedTotal)
    .sort((a, b) => (b.captured - a.captured) || (b.qualifiedTotal - a.qualifiedTotal) || (b.actions - a.actions));
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = Math.max(1280, 1060 + reportClinicRows.length * 116 + 120);
  const ctx = canvas.getContext("2d");

  const background = ctx.createLinearGradient(0, 0, 1080, canvas.height);
  background.addColorStop(0, "#fff0a8");
  background.addColorStop(.48, "#fffdf3");
  background.addColorStop(1, "#f7dc74");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(226,182,27,.13)";
  ctx.beginPath(); ctx.arc(1030, 90, 245, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(124,111,145,.06)";
  ctx.beginPath(); ctx.arc(40, canvas.height - 60, 225, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(27,55,46,.12)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;
  canvasRoundedRect(ctx, 44, 38, 992, canvas.height - 76, 42, "#fffef9");
  ctx.restore();

  canvasRoundedRect(ctx, 74, 70, 932, 148, 28, "#fff9dc", "#eadf9f");
  canvasRoundedRect(ctx, 94, 92, 42, 42, 12, "#252b35");
  try {
    const mark = await canvasImage("assets/munnius-mark.png");
    ctx.save();
    ctx.filter = "brightness(0) invert(1)";
    ctx.drawImage(mark, 103, 101, 24, 24);
    ctx.restore();
  } catch {
    canvasRoundedRect(ctx, 105, 103, 20, 20, 6, null, "#ffffff");
  }
  ctx.fillStyle = "#8a6800";
  ctx.font = "700 13px Arial";
  ctx.letterSpacing = "2px";
  ctx.fillText("RELATÓRIO SOCIAL SELLING", 154, 103);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#202631";
  ctx.font = "700 28px Arial";
  ctx.fillText("Resultado da operação", 154, 139);
  canvasFitText(ctx, `Responsável · ${state.profile?.name || "Social seller"}`, 154, 172, 500, { size: 16, minSize: 12, weight: 500, color: "#68717d" });
  canvasRoundedRect(ctx, 746, 91, 230, 106, 22, "#fffef9", "#eadf9f");
  ctx.fillStyle = "#6f5700";
  ctx.font = "700 11px Arial";
  ctx.letterSpacing = "1.5px";
  ctx.fillText("PERÍODO", 770, 119);
  ctx.letterSpacing = "0px";
  canvasFitText(ctx, $("#report-label").textContent, 770, 153, 180, { size: 26, minSize: 18, weight: 700, color: "#202631" });
  canvasFitText(ctx, $("#report-date").textContent, 770, 180, 180, { size: 14, minSize: 11, weight: 400, color: "#68717d" });

  ctx.fillStyle = "#202631";
  ctx.font = "700 24px Arial";
  ctx.fillText("Ações realizadas", 82, 270);
  ctx.fillStyle = "#68717d";
  ctx.font = "400 17px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${actions} ${actions === 1 ? "ação" : "ações"} no período`, 998, 270);
  ctx.textAlign = "left";
  const activityMetrics = [
    [stats.likes, "Curtidas", "#ef7d62", "heart"],
    [stats.comments, "Comentários", "#7c6f91", "chat"],
    [stats.directs, "Directs enviados", "#b58b00", "send"],
    [stats.responses, "Directs respondidos", "#53657d", "reply"],
    [phoneActionCount(stats), "Telefones captados", "#3f5b78", "phone"]
  ];
  activityMetrics.forEach(([value, label, tone, icon], index) => {
    const width = 173.6;
    const x = 82 + index * (width + 12);
    canvasMetric(ctx, x, 292, value, label, tone, width, icon);
  });

  ctx.fillStyle = "#202631";
  ctx.font = "700 24px Arial";
  ctx.fillText("Fila de oportunidades", 82, 464);
  ctx.fillStyle = "#68717d";
  ctx.font = "400 16px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Status atual de Social Selling", 998, 464);
  ctx.textAlign = "left";
  canvasRoundedRect(ctx, 82, 488, 916, 204, 24, "#202631");
  const pipelineMetrics = [
    [pipeline.mapped, "Mapeados", movements.mapped, "início do funil"],
    [pipeline.talking, "Conversando", movements.talking, `${pipelineRates.talking}% avançaram`],
    [pipeline.qualified, "Encaminhados", movements.qualified, `${pipelineRates.qualified}% das conversas`],
    [pipeline.scheduled, "Agendados", movements.scheduled, `${pipelineRates.scheduled}% dos encaminhados`],
    [pipeline.attended, "Compareceram", movements.attended, `${pipelineRates.attended}% dos agendados`]
  ];
  pipelineMetrics.forEach(([value, label, movement, helper], index) => {
    const stageWidth = 916 / pipelineMetrics.length;
    const centerX = 82 + stageWidth * index + stageWidth / 2;
    if (index) {
      ctx.strokeStyle = "rgba(255,255,255,.12)";
      ctx.beginPath(); ctx.moveTo(82 + stageWidth * index, 514); ctx.lineTo(82 + stageWidth * index, 666); ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(String(value), centerX, 534);
    canvasFitText(ctx, label, centerX, 568, stageWidth - 20, { size: 14, minSize: 10, weight: 700, color: "rgba(255,255,255,.88)", align: "center" });
    canvasRoundedRect(ctx, centerX - 58, 586, 116, 28, 14, "rgba(244,207,79,.18)", "rgba(244,207,79,.28)");
    canvasFitText(ctx, `+${movement} no período`, centerX, 605, 104, { size: 11, minSize: 8, weight: 700, color: "#f4cf4f", align: "center" });
    canvasFitText(ctx, helper, centerX, 644, stageWidth - 22, { size: 11, minSize: 8, weight: 500, color: "rgba(255,255,255,.58)", align: "center" });
  });
  ctx.textAlign = "left";

  if (movements.lost) {
    canvasRoundedRect(ctx, 82, 710, 916, 48, 15, "#fff8ec", "#eadf9f");
    canvasFitText(ctx, `${movements.lost} ${movements.lost === 1 ? "oportunidade encaminhada" : "oportunidades encaminhadas"} para Perdidos por tempo esgotado no período.`, 104, 740, 870, { size: 13, minSize: 10, weight: 500, color: "#8b735e" });
  }

  ctx.fillStyle = "#202631";
  ctx.font = "700 24px Arial";
  ctx.fillText("Meta do mês atual", 82, 814);
  ctx.fillStyle = "#68717d";
  ctx.font = "400 16px Arial";
  ctx.textAlign = "right";
  ctx.fillText(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date()), 998, 814);
  ctx.textAlign = "left";
  canvasRoundedRect(ctx, 82, 838, 916, 100, 22, "#fff9dc", "#eadf9f");
  const monthlyGoals = [
    [monthly.phonesTotal, state.goals.phones, "Telefones captados"],
    [monthly.scheduledTotal, state.goals.scheduled, "Agendamentos confirmados"]
  ];
  monthlyGoals.forEach(([value, goal, label], index) => {
    const x = 112 + index * 438;
    ctx.fillStyle = "#202631";
    ctx.font = "700 24px Arial";
    ctx.fillText(`${value} / ${goal}`, x, 881);
    canvasFitText(ctx, label, x + 112, 881, 285, { size: 15, minSize: 12, weight: 500, color: "#68717d" });
    canvasRoundedRect(ctx, x, 904, 390, 8, 4, "#efe3aa");
    const progressWidth = goal ? Math.min(390, value / goal * 390) : 0;
    if (progressWidth > 0) canvasRoundedRect(ctx, x, 904, Math.max(8, progressWidth), 8, 4, "#d3a900");
  });

  ctx.fillStyle = "#202631";
  ctx.font = "700 24px Arial";
  ctx.fillText("Resultado por clínica", 82, 994);
  ctx.fillStyle = "#68717d";
  ctx.font = "400 17px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${reportClinicRows.length} ${reportClinicRows.length === 1 ? "clínica" : "clínicas"} no período`, 998, 994);
  ctx.textAlign = "left";
  const clinicRows = reportClinicRows;
  if (clinicRows.length) {
    clinicRows.forEach(({ clinic, actions: clinicActions, phonesTotal, directs, responses, qualifiedTotal, scheduledTotal, attendedTotal, lost }, index) => {
      const y = 1020 + index * 116;
      canvasRoundedRect(ctx, 82, y, 916, 102, 17, index % 2 === 0 ? "#fff9dc" : "#fffef9", "#eee4bf");
      ctx.fillStyle = clinic.color || "#d3a900";
      ctx.beginPath(); ctx.arc(108, y + 31, 17, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 15px Arial";
      ctx.textAlign = "center";
      ctx.fillText(initials(clinic.name).slice(0, 1), 108, y + 36);
      ctx.textAlign = "left";
      canvasFitText(ctx, clinic.name, 138, y + 30, 410, { size: 19, minSize: 14, weight: 700, color: "#202631" });
      ctx.fillStyle = "#8a6800"; ctx.font = "700 11px Arial"; ctx.fillText("AÇÕES", 138, y + 56);
      canvasFitText(ctx, `${clinicActions} realizadas · ${phonesTotal} ${phonesTotal === 1 ? "telefone" : "telefones"}`, 204, y + 57, 350, { size: 14, minSize: 11, weight: 600, color: "#59616d" });
      ctx.fillStyle = "#8a6800"; ctx.font = "700 11px Arial"; ctx.fillText("CRM", 138, y + 82);
      const crmLine = `+${directs} mapeados · +${responses} conversando · +${qualifiedTotal} Hunter · +${scheduledTotal} agend. · +${attendedTotal} comp.${lost ? ` · ${lost} expirados` : ""}`;
      canvasFitText(ctx, crmLine, 184, y + 83, 790, { size: 14, minSize: 9, weight: 600, color: "#59616d" });
    });
  } else {
    ctx.fillStyle = "#7a8782";
    ctx.font = "400 18px Arial";
    ctx.fillText("As clínicas aparecem aqui quando houver atividade no período.", 82, 1038);
  }

  const footerY = canvas.height - 100;
  ctx.strokeStyle = "#e0e5df";
  ctx.beginPath(); ctx.moveTo(82, footerY); ctx.lineTo(998, footerY); ctx.stroke();
  ctx.fillStyle = "#7d8a84";
  ctx.font = "400 15px Arial";
  ctx.fillText("Relatório de social selling", 82, footerY + 33);
  ctx.textAlign = "right";
  ctx.fillText(`Gerado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}`, 998, footerY + 33);
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

async function exportReport(share = false) {
  const reportCard = $(`[data-report-card="${state.reportKind || "operation"}"]`) || $("#report-card");
  if (!reportCard) return showToast("Relatório indisponível para exportação");
  if (!window.html2canvas) return exportReportLegacy(share);
  showToast("Preparando a imagem do relatório...");
  reportCard.classList.add("is-exporting");
  try {
    await document.fonts?.ready;
    await Promise.all([...reportCard.querySelectorAll("img")].map(image => image.complete ? image.decode?.().catch(() => {}) : new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    })));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const exportWidth = Math.ceil(reportCard.getBoundingClientRect().width);
    const canvas = await window.html2canvas(reportCard, {
      backgroundColor: null,
      logging: false,
      scale: Math.min(3, Math.max(2, Number(window.devicePixelRatio || 1))),
      useCORS: true,
      onclone: clonedDocument => {
        const clonedCard = clonedDocument.getElementById("report-card");
        if (!clonedCard) return;
        clonedCard.style.animation = "none";
        clonedCard.style.opacity = "1";
        clonedCard.style.transform = "none";
        clonedCard.style.width = `${exportWidth}px`;
        clonedCard.style.maxWidth = "none";
        clonedCard.style.margin = "0";
        const clonedLogo = clonedCard.querySelector(".report-brand-mark img");
        if (clonedLogo) {
          clonedLogo.src = new URL("assets/munnius-mark-light.png", location.href).href;
          clonedLogo.style.display = "block";
          clonedLogo.style.opacity = "1";
        }
      }
    });
    reportCard.classList.remove("is-exporting");
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) throw new Error("Falha ao montar a imagem");
    const file = new File([blob], `relatorio-${state.reportKind || "operacao"}-${state.reportPeriod}.png`, { type: "image/png" });
    if (share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Relatório de social selling" });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Relatório baixado igual ao cartão da tela");
  } catch (error) {
    reportCard.classList.remove("is-exporting");
    console.error("Falha ao capturar o relatório", error);
    showToast("Não foi possível gerar a imagem agora");
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
$("#sidebar-home")?.addEventListener("click", () => navigate("home"));
function selectReportingPeriod(period) {
  state.period = period;
  state.reportPeriod = period;
  $$("[data-period]").forEach(button => button.classList.toggle("active", button.dataset.period === period));
  $$("[data-report-period]").forEach(button => button.classList.toggle("active", button.dataset.reportPeriod === period));
}
function selectReportKind(kind) {
  state.reportKind = ["operation", "phones", "executive"].includes(kind) ? kind : "operation";
  renderReport();
}
$$("[data-period]").forEach(button => button.addEventListener("click", () => { selectReportingPeriod(button.dataset.period); renderDashboard(); }));
$$("[data-report-period]").forEach(button => button.addEventListener("click", () => { selectReportingPeriod(button.dataset.reportPeriod); renderReport(); }));
$$("[data-report-kind]").forEach(button => button.addEventListener("click", () => selectReportKind(button.dataset.reportKind)));
$$("[data-open-report]").forEach(button => button.addEventListener("click", () => {
  state.reportKind = button.dataset.openReport || "operation";
  navigate("reports");
}));
$("#report-reference-date").addEventListener("change", event => {
  state.reportReference = event.target.value || null;
  renderReport();
});
$("#clear-report-date").addEventListener("click", () => {
  state.reportReference = null;
  renderReport();
});
$("#choose-clinic").addEventListener("click", clinicPicker);
$$("[data-action]").forEach(button => button.addEventListener("click", () => handleSessionAction(button.dataset.action)));
$("#undo-action").addEventListener("click", () => state.lastAction ? (updateAction(state.lastAction, -1), state.lastAction = null, showToast("Última ação desfeita")) : showToast("Nenhuma ação para desfazer"));
$("#adjust-counts").addEventListener("click", openAdjustCounts);
$("#finish-session").addEventListener("click", finishSession);
$("#open-instagram").addEventListener("click", () => { const clinic = clinicById(state.session?.clinicId); if (clinic) window.open(`https://instagram.com/${clinic.instagram.replace("@", "")}`, "_blank", "noopener"); });
$("#quick-lead").addEventListener("click", () => openLeadForm({ mode: "response" }));
$("#lead-search").addEventListener("input", renderLeads);
$("#lead-priority-filter").addEventListener("change", event => { state.priorityFilter = event.target.value; renderLeads(); });
$("#lead-phone-filter").addEventListener("click", () => { state.leadPhoneOnly = !state.leadPhoneOnly; renderLeads(); });
$("#kanban-prev").addEventListener("click", () => $("#lead-kanban").scrollBy({ left: -Math.max(280, $("#lead-kanban").clientWidth * .86), behavior: "smooth" }));
$("#kanban-next").addEventListener("click", () => $("#lead-kanban").scrollBy({ left: Math.max(280, $("#lead-kanban").clientWidth * .86), behavior: "smooth" }));
$$("[data-followup-filter]").forEach(button => button.addEventListener("click", () => { $$("[data-followup-filter]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.followupFilter = button.dataset.followupFilter; renderFollowups(); }));
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", event => { if (event.target === $("#sheet-backdrop")) closeSheet(); });
$("#add-clinic").addEventListener("click", () => openClinicForm());
$("#profile-avatar-large").addEventListener("click", () => $("#profile-image-input").click());
$("#profile-image-input").addEventListener("change", event => saveProfileImage(event.target.files?.[0]));
$("#edit-profile-name").addEventListener("click", openProfileNameForm);
$("#change-profile-password").addEventListener("click", openProfilePasswordForm);
$("#profile-notifications").addEventListener("change", async event => {
  const enabled = event.target.checked;
  state.profile.notificationsEnabled = enabled;
  try {
    await dataGateway.updateNotificationPreference(enabled);
    showToast(enabled ? "Notificações serão ativadas quando disponíveis" : "Preferência de notificações desativada");
  } catch (error) {
    event.target.checked = !enabled;
    state.profile.notificationsEnabled = !enabled;
    showToast("Não foi possível salvar essa preferência.");
  }
});
$("#admin-add-organization").addEventListener("click", openAdminOrganizationForm);
$("#settings-edit-goals").addEventListener("click", openGoalsForm);
$("#edit-goals-clinics").addEventListener("click", openGoalsForm);
$("#restart-product-tour").addEventListener("click", () => startProductTour(true));
$("#tour-next").addEventListener("click", nextProductTour);
$("#tour-next-layer").addEventListener("click", nextProductTour);
$("#tour-back").addEventListener("click", previousProductTour);
$("#tour-skip").addEventListener("click", finishProductTour);
$("#export-report").addEventListener("click", () => exportReport(false));
$("#share-report").addEventListener("click", () => exportReport(true));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeSheet(); });
window.addEventListener("resize", () => {
  if (productTourIndex < 0) return;
  positionProductTourFocus(productTourSteps[productTourIndex]?.target);
});

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
