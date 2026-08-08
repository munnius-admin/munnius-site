importScripts("config.js");

const STORAGE_KEY = "munniusExtensionState";

// Mantém tokens e dados do workspace restritos aos contextos internos da extensão.
// O content script que observa o Instagram só se comunica por mensagens tipadas.
chrome.storage.local
  .setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  .catch(() => {});

const EMPTY_COUNTS = Object.freeze({
  likes: 0,
  comments: 0,
  directs: 0,
  responses: 0,
  phones: 0
});
const COUNTER_BY_EVENT = {
  like: "likes",
  comment: "comments",
  direct_sent: "directs",
  response_detected: "responses",
  phone_captured: "phones"
};
const EVENT_LABELS = {
  session_started: "Sessão iniciada",
  session_finished: "Sessão encerrada",
  profile_viewed: "Perfil mapeado",
  like: "Curtida mapeada",
  comment: "Comentário mapeado",
  direct_sent: "Direct mapeado",
  response_detected: "Resposta registrada",
  lead_qualified: "Qualificação atualizada",
  phone_candidate: "Possível telefone encontrado",
  phone_captured: "Telefone confirmado"
};

function defaultState() {
  return {
    auth: null,
    organizationId: null,
    role: null,
    clinics: [],
    sessions: [],
    templates: [],
    activeSession: null,
    counters: { ...EMPTY_COUNTS },
    recentEvents: [],
    outreach: [],
    pendingUploads: [],
    phoneCandidate: null,
    currentContext: null,
    tabContexts: {}
  };
}

async function readState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const state = { ...defaultState(), ...(stored[STORAGE_KEY] || {}) };
  state.tabContexts ||= {};
  return state;
}

function normalizeHandle(value = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match?.[1] || trimmed).replace(/^@/, "").replace(/\/$/, "").toLowerCase()}`;
}

function tabContext(state, tabId) {
  const key = String(tabId || "panel");
  state.tabContexts ||= {};
  state.tabContexts[key] ||= {
    tabId: tabId || null,
    automationEnabled: false,
    accountHandle: "",
    matchedClinicId: null,
    selectedClinicId: null,
    selectionSource: null,
    matchStatus: "checking",
    activeSession: null,
    counters: { ...EMPTY_COUNTS },
    phoneCandidate: null,
    currentContext: null
  };
  return state.tabContexts[key];
}

function clinicForAccount(state, accountHandle) {
  const normalized = normalizeHandle(accountHandle);
  if (!normalized) return null;
  return (state.clinics || []).find(clinic => normalizeHandle(clinic.instagram) === normalized) || null;
}

function workspaceOutreach(payload = {}) {
  const records = new Map();
  const upsert = input => {
    const profileHandle = normalizeHandle(input.profileHandle);
    if (!input.clinicId || !profileHandle) return;
    const key = `${input.clinicId}:${profileHandle}`;
    const current = records.get(key) || {
      id: input.id || crypto.randomUUID(),
      clinicId: input.clinicId,
      profileHandle,
      sentAt: null,
      respondedAt: null,
      phoneAt: null,
      phone: "",
      status: "sent"
    };
    current.sentAt ||= input.sentAt || null;
    current.respondedAt ||= input.respondedAt || null;
    current.phoneAt ||= input.phoneAt || null;
    current.phone ||= input.phone || "";
    current.name ||= input.name || "";
    current.interest ||= input.interest || "";
    current.temperature ||= input.temperature || "warm";
    current.qualification = { ...(current.qualification || {}), ...(input.qualification || {}) };
    current.qualificationNotes = { ...(current.qualificationNotes || {}), ...(input.qualificationNotes || {}) };
    current.status = current.phoneAt || current.phone
      ? "phone"
      : current.respondedAt
        ? "responded"
        : "sent";
    current.updatedAt = input.updatedAt || current.updatedAt || current.phoneAt || current.respondedAt || current.sentAt;
    records.set(key, current);
  };
  (payload.directs || []).forEach(direct => upsert({
    id: direct.id,
    clinicId: direct.clinicId,
    profileHandle: direct.instagram,
    sentAt: direct.sentAt,
    respondedAt: direct.respondedAt,
    phoneAt: direct.phoneAt,
    phone: direct.phone,
    updatedAt: direct.phoneAt || direct.respondedAt || direct.sentAt || direct.createdAt
  }));
  (payload.leads || []).forEach(lead => upsert({
    id: lead.id,
    clinicId: lead.clinicId,
    profileHandle: lead.instagram,
    sentAt: lead.directSentAt,
    respondedAt: lead.respondedAt || (["talking", "follow_up", "sent_to_hunter", "scheduled", "attended", "no_show", "finished"].includes(lead.status)
      ? lead.lastContactAt
      : null),
    phoneAt: lead.phoneCapturedAt,
    phone: lead.whatsapp,
    name: lead.name,
    interest: lead.interest,
    temperature: lead.temperature,
    qualification: lead.qualification,
    qualificationNotes: lead.qualificationNotes,
    updatedAt: lead.updatedAt || lead.lastContactAt || lead.prospectedAt
  }));
  return [...records.values()];
}

function stateForTab(state, tabId) {
  const context = tabContext(state, tabId);
  return {
    ...state,
    activeTabId: tabId || null,
    activeSession: context.activeSession,
    counters: context.counters,
    phoneCandidate: context.phoneCandidate,
    currentContext: context.currentContext,
    automationEnabled: context.automationEnabled,
    accountHandle: context.accountHandle,
    matchedClinicId: context.matchedClinicId,
    selectedClinicId: context.selectedClinicId,
    matchStatus: context.matchStatus
  };
}

async function writeState(state, tabId = null) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  chrome.runtime.sendMessage({ type: "STATE_UPDATED", tabId, state: stateForTab(state, tabId) }).catch(() => {});
  return stateForTab(state, tabId);
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${MUNNIUS_EXTENSION_CONFIG.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: MUNNIUS_EXTENSION_CONFIG.supabaseAnonKey,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.msg || payload?.message || payload?.error_description || "Falha ao conectar.");
  return payload;
}

async function signIn(email, password, tabId = null) {
  const payload = await authRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  const state = await readState();
  state.auth = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    user: payload.user
  };
  await hydrateWorkspace(state);
  await retryPendingUploads(state);
  return writeState(state, tabId);
}

async function ensureAccessToken(state) {
  if (!state.auth?.accessToken) throw new Error("Entre na extensão para sincronizar.");
  if (state.auth.expiresAt > Date.now() + 60000) return state.auth.accessToken;
  const payload = await authRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: state.auth.refreshToken })
  });
  state.auth = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || state.auth.refreshToken,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    user: payload.user || state.auth.user
  };
  return state.auth.accessToken;
}

async function apiRequest(state, path, options = {}) {
  const accessToken = await ensureAccessToken(state);
  return authRequest(`/rest/v1/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
}

async function hydrateWorkspace(state) {
  const userId = state.auth?.user?.id;
  if (!userId) throw new Error("Sessão inválida.");
  const memberships = await apiRequest(
    state,
    `organization_members?profile_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=organization_id,role&limit=1`
  );
  const membership = memberships?.[0];
  if (!membership) throw new Error("Usuário sem organização ativa.");
  state.organizationId = membership.organization_id;
  state.role = membership.role;
  const snapshots = await apiRequest(
    state,
    `organization_snapshots?organization_id=eq.${encodeURIComponent(state.organizationId)}&select=payload&limit=1`
  );
  const payload = snapshots?.[0]?.payload || {};
  state.clinics = (payload.clinics || []).filter(clinic => clinic.active);
  state.sessions = payload.sessions || [];
  state.templates = payload.templates || [];
  const syncedOutreach = workspaceOutreach(payload);
  const localOutreach = state.outreach || [];
  const mergedOutreach = new Map();
  [...syncedOutreach, ...localOutreach].forEach(item => {
    const key = `${item.clinicId}:${normalizeHandle(item.profileHandle)}`;
    if (!item.clinicId || !normalizeHandle(item.profileHandle)) return;
    const previous = mergedOutreach.get(key);
    const previousAt = new Date(previous?.updatedAt || previous?.phoneAt || previous?.respondedAt || previous?.sentAt || 0).getTime();
    const itemAt = new Date(item.updatedAt || item.phoneAt || item.respondedAt || item.sentAt || 0).getTime();
    mergedOutreach.set(key, previous && previousAt > itemAt ? previous : { ...previous, ...item });
  });
  state.outreach = [...mergedOutreach.values()]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 1000);
  Object.values(state.tabContexts || {}).forEach(context => {
    const clinic = clinicForAccount(state, context.accountHandle);
    context.matchedClinicId = clinic?.id || null;
    context.matchStatus = clinic ? "matched" : context.accountHandle ? "unmatched" : "checking";
    if (clinic && (!context.selectedClinicId || context.selectionSource === "automatic")) {
      context.selectedClinicId = clinic.id;
      context.selectionSource = "automatic";
    }
  });
  return state;
}

function priorityMinutes(clinic = {}) {
  const key = clinic.priority || (Number(clinic.trafficInvestment || 0) >= 5000 ? "A" : Number(clinic.trafficInvestment || 0) >= 3000 ? "B" : "C");
  return key === "A" ? 30 : key === "B" ? 20 : 15;
}

function isToday(value) {
  return value && new Date(value).toDateString() === new Date().toDateString();
}

function eventDedupeKey(session, clinicId, event) {
  if (event.dedupeKey) return event.dedupeKey;
  const identity = normalizeHandle(event.profileHandle) || event.instagramUrl || event.phone || "unknown";
  if (event.type === "profile_viewed") return `${session?.id}:profile:${identity}`;
  if (["direct_sent", "response_detected", "phone_captured"].includes(event.type) && identity !== "unknown") {
    return `conversation:${clinicId}:${identity}:${event.type}`;
  }
  return `${session?.id}:${event.type}:${identity}:${Math.floor(Date.now() / 1500)}`;
}

function appendHistory(state, event) {
  state.recentEvents = [{
    id: crypto.randomUUID(),
    type: event.type,
    label: EVENT_LABELS[event.type] || "Ação registrada",
    detail: event.profileHandle || event.phone || "",
    profileHandle: event.profileHandle || "",
    at: event.eventAt || new Date().toISOString(),
    source: "chrome_extension"
  }, ...(state.recentEvents || [])].slice(0, 40);
}

function updateOutreach(state, clinicId, event) {
  if (!["direct_sent", "response_detected", "lead_qualified", "phone_captured"].includes(event.type)) return;
  const handle = event.profileHandle || "";
  if (!handle) return;
  state.outreach ||= [];
  let item = state.outreach.find(record => record.clinicId === clinicId && normalizeHandle(record.profileHandle) === normalizeHandle(handle));
  if (!item) {
    item = {
      id: crypto.randomUUID(),
      clinicId,
      profileHandle: handle,
      sentAt: event.type === "direct_sent" ? event.eventAt : null,
      respondedAt: null,
      phoneAt: null,
      phone: "",
      status: event.type === "direct_sent" ? "sent" : event.type === "response_detected" ? "responded" : "phone"
    };
    state.outreach.unshift(item);
  }
  if (event.type === "direct_sent") {
    item.sentAt ||= event.eventAt;
    if (!item.respondedAt && !item.phoneAt) item.status = "sent";
  }
  if (["response_detected", "lead_qualified"].includes(event.type)) {
    item.respondedAt ||= event.eventAt;
    if (!item.phoneAt) item.status = "responded";
  }
  if (event.type === "phone_captured") {
    item.respondedAt ||= event.eventAt;
    item.phoneAt = event.eventAt;
    item.phone = event.phone || item.phone || "";
    item.status = "phone";
  }
  item.name = event.name || item.name || "";
  item.interest = event.interest || item.interest || "";
  item.temperature = event.temperature || item.temperature || "warm";
  item.qualification = { ...(item.qualification || {}), ...(event.qualification || {}) };
  item.qualificationNotes = { ...(item.qualificationNotes || {}), ...(event.qualificationNotes || {}) };
  item.updatedAt = event.eventAt;
  state.outreach = state.outreach.slice(0, 1000);
}

async function uploadEvent(state, event) {
  const session = event.session || state.activeSession;
  if (!state.auth || !state.organizationId || !session) return;
  const row = {
    id: event.id || crypto.randomUUID(),
    organization_id: state.organizationId,
    actor_user_id: state.auth.user.id,
    clinic_id: session.clinicId,
    session_id: session.id,
    event_type: event.type,
    instagram_handle: event.profileHandle || null,
    instagram_url: event.instagramUrl || null,
    dedupe_key: event.dedupeKey,
    event_at: event.eventAt || new Date().toISOString(),
    payload: {
      name: event.name || null,
      phone: event.phone || null,
      qualification: event.qualification || null,
      qualificationNotes: event.qualificationNotes || null,
      interest: event.interest || null,
      temperature: event.temperature || null,
      sendToHunter: Boolean(event.sendToHunter),
      source: "chrome_extension",
      startedAt: session.startedAt,
      context: event.context || null
    }
  };
  await apiRequest(state, "extension_events?on_conflict=organization_id,dedupe_key", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(row)
  });
}

async function queueOrUpload(state, event) {
  try {
    await uploadEvent(state, event);
  } catch (error) {
    state.pendingUploads = [...(state.pendingUploads || []), event].slice(-300);
    state.lastSyncError = error.message;
  }
}

async function retryPendingUploads(state) {
  const pending = [...(state.pendingUploads || [])];
  if (!pending.length || !state.auth) return;
  state.pendingUploads = [];
  for (const event of pending) await queueOrUpload(state, event);
}

async function startSession(clinicId, tabId) {
  const state = await readState();
  const context = tabContext(state, tabId);
  if (context.activeSession) throw new Error("Encerre a sessão desta aba primeiro.");
  clinicId ||= context.selectedClinicId || context.matchedClinicId;
  if (!clinicId) throw new Error("Selecione uma clínica antes de iniciar.");
  const clinic = state.clinics.find(item => item.id === clinicId);
  if (!clinic) throw new Error("Clínica não encontrada.");
  if (context.automationEnabled && context.matchedClinicId !== clinicId) {
    throw new Error("A aba aberta não corresponde à clínica selecionada.");
  }
  const spentToday = (state.sessions || [])
    .filter(session => session.clinicId === clinicId && isToday(session.startedAt))
    .reduce((total, session) => total + Number(session.durationSeconds || 0), 0);
  const limitSeconds = Math.max(0, priorityMinutes(clinic) * 60 - spentToday);
  context.selectedClinicId = clinicId;
  context.activeSession = {
    id: crypto.randomUUID(),
    clinicId,
    clinicName: clinic.name,
    instagram: clinic.instagram,
    startedAt: new Date().toISOString(),
    limitSeconds,
    seenKeys: []
  };
  context.counters = { ...EMPTY_COUNTS };
  const event = {
    type: "session_started",
    eventAt: context.activeSession.startedAt,
    dedupeKey: `${context.activeSession.id}:started`,
    session: context.activeSession
  };
  appendHistory(state, event);
  await queueOrUpload(state, event);
  return writeState(state, tabId);
}

async function finishSession(tabId) {
  const state = await readState();
  const context = tabContext(state, tabId);
  if (!context.activeSession) return writeState(state, tabId);
  const event = {
    type: "session_finished",
    eventAt: new Date().toISOString(),
    dedupeKey: `${context.activeSession.id}:finished`,
    session: context.activeSession,
    context: {
      durationSeconds: Math.max(1, Math.floor((Date.now() - new Date(context.activeSession.startedAt)) / 1000)),
      counts: context.counters
    }
  };
  appendHistory(state, event);
  await queueOrUpload(state, event);
  state.lastSession = { ...context.activeSession, endedAt: event.eventAt, counts: context.counters };
  state.sessions = [...(state.sessions || []), {
    ...context.activeSession,
    endedAt: event.eventAt,
    durationSeconds: event.context.durationSeconds,
    counts: context.counters
  }].slice(-300);
  context.activeSession = null;
  context.currentContext = null;
  context.phoneCandidate = null;
  return writeState(state, tabId);
}

async function trackEvent(input, tabId) {
  const state = await readState();
  const context = tabContext(state, tabId);
  context.currentContext = input.context || context.currentContext;
  const isManual = Boolean(input.manual || input.context?.source === "manual_extension");
  if (!isManual && !context.automationEnabled) return { ...stateForTab(state, tabId), ignored: "automation_disabled" };
  if (input.type === "phone_candidate") {
    if (!context.activeSession) return { ...stateForTab(state, tabId), ignored: "no_active_session" };
    context.phoneCandidate = {
      phone: input.phone,
      profileHandle: input.profileHandle || "",
      instagramUrl: input.instagramUrl || "",
      detectedAt: new Date().toISOString()
    };
    appendHistory(state, input);
    return writeState(state, tabId);
  }
  if (!context.activeSession) return { ...stateForTab(state, tabId), ignored: "no_active_session" };
  if (!isManual && context.matchStatus !== "matched") return { ...stateForTab(state, tabId), ignored: "clinic_not_matched" };
  if (!isManual && context.activeSession.clinicId !== context.matchedClinicId) return { ...stateForTab(state, tabId), ignored: "clinic_mismatch" };
  let event = {
    ...input,
    id: crypto.randomUUID(),
    eventAt: input.eventAt || new Date().toISOString(),
    session: context.activeSession
  };
  const clinicId = context.activeSession.clinicId;
  const clinic = state.clinics.find(item => item.id === clinicId);
  const clinicHandle = normalizeHandle(clinic?.instagram);
  let handle = normalizeHandle(event.profileHandle);
  if (handle && clinicHandle && handle === clinicHandle) {
    handle = "";
    event.profileHandle = "";
    event.instagramUrl = "";
    event.context = { ...(event.context || {}), profileHandle: "", instagramUrl: "", ownAccountDiscarded: true };
  }
  const existingOutreach = handle && state.outreach?.find(item => item.clinicId === clinicId && normalizeHandle(item.profileHandle) === handle);
  if (event.type === "direct_sent" && existingOutreach?.sentAt) {
    if (!existingOutreach.respondedAt) {
      event = {
        ...event,
        type: "response_detected",
        context: { ...(event.context || {}), inferredFromSecondDirect: true }
      };
    } else {
      return { ...stateForTab(state, tabId), ignored: "conversation_already_tracked" };
    }
  }
  event.dedupeKey = eventDedupeKey(context.activeSession, clinicId, event);
  context.activeSession.seenKeys ||= [];
  if (context.activeSession.seenKeys.includes(event.dedupeKey)) return stateForTab(state, tabId);
  context.activeSession.seenKeys = [...context.activeSession.seenKeys, event.dedupeKey].slice(-500);
  const counter = COUNTER_BY_EVENT[event.type];
  if (counter) context.counters[counter] = Number(context.counters[counter] || 0) + 1;
  updateOutreach(state, clinicId, event);
  appendHistory(state, event);
  await queueOrUpload(state, event);
  return writeState(state, tabId);
}

async function updateTabContext(tabId, input = {}) {
  const state = await readState();
  const context = tabContext(state, tabId);
  context.accountHandle = normalizeHandle(input.accountHandle || context.accountHandle);
  context.currentContext = input.context || context.currentContext;
  const clinic = clinicForAccount(state, context.accountHandle);
  context.matchedClinicId = clinic?.id || null;
  context.matchStatus = clinic ? "matched" : context.accountHandle ? "unmatched" : "checking";
  if (clinic && !context.activeSession && (!context.selectedClinicId || context.selectionSource === "automatic")) {
    context.selectedClinicId = clinic.id;
    context.selectionSource = "automatic";
  }
  if (!clinic && context.selectionSource === "automatic" && !context.activeSession) {
    context.selectedClinicId = null;
    context.selectionSource = null;
  }
  return writeState(state, tabId);
}

async function selectClinic(tabId, clinicId) {
  const state = await readState();
  const context = tabContext(state, tabId);
  if (context.activeSession) throw new Error("Encerre a sessão antes de trocar a clínica.");
  if (clinicId && !state.clinics.some(clinic => clinic.id === clinicId)) throw new Error("Clínica não encontrada.");
  if (context.automationEnabled && clinicId !== context.matchedClinicId) context.automationEnabled = false;
  context.selectedClinicId = clinicId || null;
  context.selectionSource = clinicId === context.matchedClinicId ? "automatic" : "manual";
  return writeState(state, tabId);
}

async function setAutomation(tabId, enabled) {
  const state = await readState();
  const context = tabContext(state, tabId);
  if (enabled && context.matchStatus !== "matched") {
    throw new Error("Aba utilizada não corresponde a nenhuma clínica cadastrada.");
  }
  if (enabled && context.activeSession && context.activeSession.clinicId !== context.matchedClinicId) {
    throw new Error("A sessão ativa pertence a outra clínica.");
  }
  if (enabled) {
    context.selectedClinicId = context.matchedClinicId;
    context.selectionSource = "automatic";
  }
  context.automationEnabled = Boolean(enabled);
  return writeState(state, tabId);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

let operationQueue = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = message.tabId || sender.tab?.id || null;
  const operation = async () => {
    if (message.type === "GET_STATE") {
      const state = await readState();
      if (state.auth && (!state.organizationId || !state.clinics.length)) {
        try { await hydrateWorkspace(state); } catch {}
      }
      const context = tabContext(state, tabId);
      if (state.activeSession && !context.activeSession) {
        context.activeSession = state.activeSession;
        context.counters = state.counters || { ...EMPTY_COUNTS };
        state.activeSession = null;
      }
      await retryPendingUploads(state);
      return writeState(state, tabId);
    }
    if (message.type === "LOGIN") return signIn(message.email, message.password, tabId);
    if (message.type === "LOGOUT") return writeState(defaultState(), tabId);
    if (message.type === "REFRESH_WORKSPACE") {
      const state = await readState();
      await hydrateWorkspace(state);
      return writeState(state, tabId);
    }
    if (message.type === "UPDATE_TAB_CONTEXT") return updateTabContext(tabId, message);
    if (message.type === "SELECT_CLINIC") return selectClinic(tabId, message.clinicId);
    if (message.type === "SET_AUTOMATION") return setAutomation(tabId, message.enabled);
    if (message.type === "START_SESSION") return startSession(message.clinicId, tabId);
    if (message.type === "FINISH_SESSION") return finishSession(tabId);
    if (message.type === "TRACKED_EVENT") return trackEvent(message.event, tabId);
    if (message.type === "MARK_RESPONSE") {
      return trackEvent({ type: "response_detected", manual: true, ...message.context }, tabId);
    }
    if (["CONFIRM_PHONE", "SAVE_LEAD_CONTEXT"].includes(message.type)) {
      const state = await readState();
      const tabState = tabContext(state, tabId);
      const explicitCandidate = {
        phone: message.phone || "",
        profileHandle: message.profileHandle || "",
        instagramUrl: message.instagramUrl || ""
      };
      const candidate = message.type === "SAVE_LEAD_CONTEXT"
        ? explicitCandidate
        : tabState.phoneCandidate || explicitCandidate;
      if (!candidate) return state;
      tabState.phoneCandidate = null;
      await writeState(state, tabId);
      const alreadyResponded = message.stage === "response" && state.outreach?.some(item =>
        item.clinicId === tabState.activeSession?.clinicId
        && normalizeHandle(item.profileHandle) === normalizeHandle(message.profileHandle || candidate.profileHandle)
        && ["responded", "phone"].includes(item.status)
      );
      return trackEvent({
        type: message.stage === "response" ? alreadyResponded ? "lead_qualified" : "response_detected" : "phone_captured",
        manual: true,
        ...candidate,
        name: message.name || candidate.name || "",
        phone: message.phone || candidate.phone || "",
        profileHandle: message.profileHandle || candidate.profileHandle || "",
        qualification: message.qualification || {},
        qualificationNotes: message.qualificationNotes || {},
        interest: message.interest || "",
        temperature: message.temperature || "warm",
        sendToHunter: Boolean(message.sendToHunter)
      }, tabId);
    }
    if (message.type === "DISMISS_PHONE") {
      const state = await readState();
      tabContext(state, tabId).phoneCandidate = null;
      return writeState(state, tabId);
    }
    return stateForTab(await readState(), tabId);
  };
  operationQueue = operationQueue.then(operation, operation);
  operationQueue.then(result => sendResponse({ ok: true, state: result }))
    .catch(error => sendResponse({ ok: false, message: error.message || "Não foi possível concluir." }));
  return true;
});
