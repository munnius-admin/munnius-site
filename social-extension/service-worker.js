importScripts("config.js");

const STORAGE_KEY = "munniusExtensionState";

// Mantém tokens e dados do workspace restritos aos contextos internos da extensão.
// O content script que observa o Instagram só se comunica por mensagens tipadas.
chrome.storage.local
  .setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" })
  .catch(() => {});

const EMPTY_COUNTS = Object.freeze({
  profiles: 0,
  likes: 0,
  comments: 0,
  directs: 0,
  responses: 0,
  phones: 0
});
const COUNTER_BY_EVENT = {
  follow: "profiles",
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
  follow: "Novo follow mapeado",
  like: "Curtida mapeada",
  comment: "Comentário mapeado",
  direct_sent: "Direct mapeado",
  response_detected: "Resposta registrada",
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
    currentContext: null
  };
}

async function readState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return { ...defaultState(), ...(stored[STORAGE_KEY] || {}) };
}

async function writeState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  chrome.runtime.sendMessage({ type: "STATE_UPDATED", state }).catch(() => {});
  return state;
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

async function signIn(email, password) {
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
  return writeState(state);
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
  return state;
}

function priorityMinutes(clinic = {}) {
  const key = clinic.priority || (Number(clinic.trafficInvestment || 0) >= 5000 ? "A" : Number(clinic.trafficInvestment || 0) >= 3000 ? "B" : "C");
  return key === "A" ? 30 : key === "B" ? 20 : 15;
}

function isToday(value) {
  return value && new Date(value).toDateString() === new Date().toDateString();
}

function eventDedupeKey(state, event) {
  if (event.dedupeKey) return event.dedupeKey;
  const identity = event.profileHandle || event.instagramUrl || event.phone || "unknown";
  if (event.type === "profile_viewed") return `${state.activeSession?.id}:profile:${identity}`;
  return `${state.activeSession?.id}:${event.type}:${identity}:${Math.floor(Date.now() / 1500)}`;
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

function updateOutreach(state, event) {
  if (!["direct_sent", "response_detected", "phone_captured"].includes(event.type)) return;
  const handle = event.profileHandle || "";
  if (!handle) return;
  state.outreach ||= [];
  let item = state.outreach.find(record => record.clinicId === state.activeSession?.clinicId && record.profileHandle === handle);
  if (!item) {
    item = {
      id: crypto.randomUUID(),
      clinicId: state.activeSession?.clinicId,
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
  if (event.type === "response_detected") {
    item.respondedAt ||= event.eventAt;
    if (!item.phoneAt) item.status = "responded";
  }
  if (event.type === "phone_captured") {
    item.respondedAt ||= event.eventAt;
    item.phoneAt = event.eventAt;
    item.phone = event.phone || item.phone || "";
    item.status = "phone";
  }
  item.updatedAt = event.eventAt;
  state.outreach = state.outreach.slice(0, 100);
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
      phone: event.phone || null,
      qualification: event.qualification || null,
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
  event.session ||= state.activeSession ? {
    id: state.activeSession.id,
    clinicId: state.activeSession.clinicId,
    startedAt: state.activeSession.startedAt
  } : null;
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

async function startSession(clinicId) {
  const state = await readState();
  if (state.activeSession) throw new Error("Encerre a sessão atual primeiro.");
  const clinic = state.clinics.find(item => item.id === clinicId);
  if (!clinic) throw new Error("Clínica não encontrada.");
  const spentToday = (state.sessions || [])
    .filter(session => session.clinicId === clinicId && isToday(session.startedAt))
    .reduce((total, session) => total + Number(session.durationSeconds || 0), 0);
  const limitSeconds = Math.max(0, priorityMinutes(clinic) * 60 - spentToday);
  state.activeSession = {
    id: crypto.randomUUID(),
    clinicId,
    clinicName: clinic.name,
    instagram: clinic.instagram,
    startedAt: new Date().toISOString(),
    limitSeconds,
    seenKeys: []
  };
  state.counters = { ...EMPTY_COUNTS };
  const event = {
    type: "session_started",
    eventAt: state.activeSession.startedAt,
    dedupeKey: `${state.activeSession.id}:started`
  };
  appendHistory(state, event);
  await queueOrUpload(state, event);
  return writeState(state);
}

async function finishSession() {
  const state = await readState();
  if (!state.activeSession) return writeState(state);
  const event = {
    type: "session_finished",
    eventAt: new Date().toISOString(),
    dedupeKey: `${state.activeSession.id}:finished`,
    context: {
      durationSeconds: Math.max(1, Math.floor((Date.now() - new Date(state.activeSession.startedAt)) / 1000)),
      counts: state.counters
    }
  };
  appendHistory(state, event);
  await queueOrUpload(state, event);
  state.lastSession = { ...state.activeSession, endedAt: event.eventAt, counts: state.counters };
  state.sessions = [...(state.sessions || []), {
    ...state.activeSession,
    endedAt: event.eventAt,
    durationSeconds: event.context.durationSeconds,
    counts: state.counters
  }].slice(-300);
  state.activeSession = null;
  state.currentContext = null;
  state.phoneCandidate = null;
  return writeState(state);
}

async function trackEvent(input) {
  const state = await readState();
  state.currentContext = input.context || state.currentContext;
  if (input.type === "phone_candidate") {
    if (!state.activeSession) return { ...state, ignored: "no_active_session" };
    state.phoneCandidate = {
      phone: input.phone,
      profileHandle: input.profileHandle || "",
      instagramUrl: input.instagramUrl || "",
      detectedAt: new Date().toISOString()
    };
    appendHistory(state, input);
    return writeState(state);
  }
  if (!state.activeSession) return { ...state, ignored: "no_active_session" };
  const event = {
    ...input,
    id: crypto.randomUUID(),
    eventAt: input.eventAt || new Date().toISOString()
  };
  event.dedupeKey = eventDedupeKey(state, event);
  state.activeSession.seenKeys ||= [];
  if (state.activeSession.seenKeys.includes(event.dedupeKey)) return state;
  state.activeSession.seenKeys = [...state.activeSession.seenKeys, event.dedupeKey].slice(-500);
  const counter = COUNTER_BY_EVENT[event.type];
  if (counter) state.counters[counter] = Number(state.counters[counter] || 0) + 1;
  updateOutreach(state, event);
  appendHistory(state, event);
  await queueOrUpload(state, event);
  return writeState(state);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_STATE") {
      const state = await readState();
      if (state.auth && (!state.organizationId || !state.clinics.length)) {
        try { await hydrateWorkspace(state); } catch {}
      }
      await retryPendingUploads(state);
      return writeState(state);
    }
    if (message.type === "LOGIN") return signIn(message.email, message.password);
    if (message.type === "LOGOUT") return writeState(defaultState());
    if (message.type === "REFRESH_WORKSPACE") {
      const state = await readState();
      await hydrateWorkspace(state);
      return writeState(state);
    }
    if (message.type === "START_SESSION") return startSession(message.clinicId);
    if (message.type === "FINISH_SESSION") return finishSession();
    if (message.type === "TRACKED_EVENT") return trackEvent(message.event);
    if (message.type === "MARK_RESPONSE") {
      return trackEvent({ type: "response_detected", ...message.context });
    }
    if (message.type === "CONFIRM_PHONE") {
      const state = await readState();
      const candidate = state.phoneCandidate || {
        phone: message.phone || "",
        profileHandle: message.profileHandle || "",
        instagramUrl: message.instagramUrl || ""
      };
      if (!candidate) return state;
      state.phoneCandidate = null;
      await writeState(state);
      return trackEvent({
        type: "phone_captured",
        ...candidate,
        phone: message.phone || candidate.phone || "",
        profileHandle: message.profileHandle || candidate.profileHandle || "",
        qualification: message.qualification || {},
        interest: message.interest || "",
        temperature: message.temperature || "warm",
        sendToHunter: Boolean(message.sendToHunter)
      });
    }
    if (message.type === "DISMISS_PHONE") {
      const state = await readState();
      state.phoneCandidate = null;
      return writeState(state);
    }
    return readState();
  })().then(result => sendResponse({ ok: true, state: result }))
    .catch(error => sendResponse({ ok: false, message: error.message || "Não foi possível concluir." }));
  return true;
});
