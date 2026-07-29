const $ = selector => document.querySelector(selector);
let state = null;
let timerId;
let qualificationDraft = null;

function message(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload }).then(response => {
    if (!response?.ok) throw new Error(response?.message || "Não foi possível concluir.");
    return response.state;
  });
}

function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.add("hidden"), 2200);
}

function elapsedLabel(session) {
  if (!session?.startedAt) return "00:00";
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt)) / 1000));
  const remaining = Number(session.limitSeconds || 0) - elapsed;
  const absolute = Math.abs(remaining);
  return `${remaining < 0 ? "+" : ""}${[Math.floor(absolute / 60), absolute % 60]
    .map(value => String(value).padStart(2, "0")).join(":")}`;
}

function renderTimer() {
  $("#session-timer").textContent = elapsedLabel(state?.activeSession);
}

function renderMessages() {
  const fallback = [
    { id: "first", title: "1º contato", message: "Oi! Vi seu perfil e queria te contar um pouco sobre o trabalho da clínica 😊" },
    { id: "follow1", title: "1º follow-up", message: "Oi! Passando só para saber se você conseguiu ver minha mensagem 😊" },
    { id: "follow2", title: "2º follow-up", message: "Oi! Caso ainda tenha interesse, posso te passar as informações por aqui." },
    { id: "phone", title: "Pedir WhatsApp", message: "Posso pedir para nossa equipe entrar em contato com você? Qual é o melhor WhatsApp?" }
  ];
  const templates = state.templates?.length ? state.templates : fallback;
  $("#message-list").innerHTML = templates.slice(0, 8).map(template => `
    <article class="message-item">
      <div><strong>${escapeHtml(template.title)}</strong><small>${escapeHtml(template.message)}</small></div>
      <button data-copy="${template.id}">Copiar</button>
    </article>`).join("");
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
    const template = templates.find(item => item.id === button.dataset.copy);
    await navigator.clipboard.writeText(template.message);
    toast("Mensagem copiada");
  }));
}

function escapeHtml(value = "") {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function renderHistory() {
  $("#history-list").innerHTML = (state.recentEvents || []).slice(0, 10).map(event => `
    <article class="history-item">
      <i></i><div><strong>${escapeHtml(event.label)}</strong><small>${escapeHtml(event.detail || "Instagram")}</small></div>
      <time>${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.at))}</time>
    </article>`).join("") || `<div class="empty">As ações detectadas aparecerão aqui.</div>`;
}

function renderOutreach() {
  const items = (state.outreach || [])
    .filter(item => !state.activeSession?.clinicId || item.clinicId === state.activeSession.clinicId)
    .slice(0, 16);
  $("#outreach-list").innerHTML = items.map(item => {
    const status = item.status === "phone" ? "Telefone" : item.status === "responded" ? "Respondido" : "Aguardando";
    return `<article class="outreach-item ${item.status}">
      <span>${item.status === "phone" ? "☎" : item.status === "responded" ? "↩" : "➤"}</span>
      <div><strong>${escapeHtml(item.profileHandle)}</strong><small>${status}</small></div>
      <div class="outreach-actions">
        ${item.status === "sent" ? `<button data-outreach-response="${item.id}">Respondeu</button>` : ""}
        ${item.status !== "phone" ? `<button class="phone" data-outreach-phone="${item.id}">Telefone</button>` : ""}
      </div>
    </article>`;
  }).join("") || `<div class="empty">Os @ detectados nos directs aparecerão aqui.</div>`;
  document.querySelectorAll("[data-outreach-response]").forEach(button => button.addEventListener("click", async () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachResponse);
    if (!item) return;
    render(await message("MARK_RESPONSE", {
      context: {
        profileHandle: item.profileHandle,
        instagramUrl: `https://www.instagram.com/${item.profileHandle.replace("@", "")}/`
      }
    }));
    toast(`${item.profileHandle} avançou para Respondido`);
  }));
  document.querySelectorAll("[data-outreach-phone]").forEach(button => button.addEventListener("click", () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachPhone);
    if (item) openQualification({ profileHandle: item.profileHandle, phone: item.phone || "" });
  }));
}

function openQualification(candidate = {}) {
  qualificationDraft = {
    phone: candidate.phone || "",
    profileHandle: candidate.profileHandle || state.currentContext?.profileHandle || "",
    instagramUrl: candidate.instagramUrl || state.currentContext?.instagramUrl || ""
  };
  $("#qualification-profile").textContent = qualificationDraft.profileHandle || "Perfil não identificado";
  $("#qualification-phone").value = qualificationDraft.phone;
  $("#qualification-interest").value = "";
  $("#qualification-temperature").value = "warm";
  document.querySelectorAll("[data-extension-qualification]").forEach(input => { input.checked = false; });
  $("#qualification-card").classList.remove("hidden");
  $("#qualification-phone").focus();
}

function closeQualification() {
  qualificationDraft = null;
  $("#qualification-card").classList.add("hidden");
}

function readExtensionQualification() {
  return Object.fromEntries([...document.querySelectorAll("[data-extension-qualification]")]
    .map(input => [input.dataset.extensionQualification, input.checked]));
}

function hunterMessage(candidate, qualification) {
  const clinic = state.clinics.find(item => item.id === state.activeSession?.clinicId);
  const labels = {
    priorInvestment: "Pesquisou ou investiu antes",
    valueUnderstood: "Entendeu o valor",
    decisionAuthority: "Decide por conta própria",
    knowsDoctor: "Conhece a Dra.",
    procedureDiscussed: "Falou sobre o incômodo",
    fitConfirmed: "A solução faz sentido",
    interestedThisMonth: "Interesse ainda este mês",
    importantDate: "Tem uma data importante"
  };
  const checked = Object.entries(qualification).filter(([, value]) => value).map(([key]) => `✅ ${labels[key]}`);
  const temperature = { hot: "🔥 Quente", warm: "🌤️ Morno", cold: "❄️ Frio" }[$("#qualification-temperature").value];
  return {
    clinic,
    text: `🎉 *NOVA OPORTUNIDADE PARA VOCÊ!*\n\nBoa, ${clinic?.hunter || "Hunter"}! Novo contato da *${clinic?.name || "clínica"}* para você assumir. 🚀\n\n👤 *Lead*\n• Instagram: ${candidate.profileHandle || "Não informado"}\n• WhatsApp: ${$("#qualification-phone").value || "Não informado"}\n• Interesse: ${$("#qualification-interest").value || "Ainda não identificado"}\n• Temperatura: ${temperature}\n\n🧭 *Contexto já alinhado*\n${checked.length ? checked.join("\n") : "▫️ Contexto mínimo — continue a qualificação por aqui."}\n\n✨ Avance para o agendamento sem repetir o que já foi conversado.`
  };
}

async function savePhoneCapture(sendToHunter = false) {
  if (!state.activeSession) return toast("Inicie uma sessão primeiro");
  const candidate = qualificationDraft || {};
  const qualification = readExtensionQualification();
  const phone = $("#qualification-phone").value.trim();
  const handoff = hunterMessage(candidate, qualification);
  render(await message("CONFIRM_PHONE", {
    phone,
    profileHandle: candidate.profileHandle || "",
    instagramUrl: candidate.instagramUrl || "",
    qualification,
    interest: $("#qualification-interest").value.trim(),
    temperature: $("#qualification-temperature").value,
    sendToHunter
  }));
  closeQualification();
  if (sendToHunter) {
    if (!phone) return toast("Telefone salvo. Preencha o número para abrir a Hunter.");
    if (!handoff.clinic?.hunterPhone) return toast("Telefone salvo. Cadastre o WhatsApp da Hunter.");
    chrome.tabs.create({ url: `https://wa.me/${handoff.clinic.hunterPhone}?text=${encodeURIComponent(handoff.text)}` });
    toast("Entrega preparada para a Hunter");
  } else {
    toast("Telefone salvo no funil");
  }
}

function render(nextState) {
  state = nextState;
  const authenticated = Boolean(state.auth);
  $("#login-view").classList.toggle("hidden", authenticated);
  $("#workspace-view").classList.toggle("hidden", !authenticated);
  if (!authenticated) return;
  const select = $("#clinic-select");
  const selected = state.activeSession?.clinicId || select.value;
  select.innerHTML = `<option value="">Selecionar clínica</option>${(state.clinics || []).map(clinic =>
    `<option value="${clinic.id}" ${clinic.id === selected ? "selected" : ""}>${escapeHtml(clinic.name)} · ${escapeHtml(clinic.instagram)}</option>`
  ).join("")}`;
  select.disabled = Boolean(state.activeSession);
  $("#session-title").textContent = state.activeSession?.clinicName || "Escolha a clínica";
  $("#session-button").textContent = state.activeSession ? "Encerrar e sincronizar" : "Iniciar acompanhamento";
  $("#session-button").classList.toggle("finish", Boolean(state.activeSession));
  const counts = state.counters || {};
  Object.entries({ profiles: "profiles", likes: "likes", comments: "comments", directs: "directs", responses: "responses", phones: "phones" })
    .forEach(([key, id]) => $(`#count-${id}`).textContent = counts[key] || 0);
  $("#current-profile").textContent = state.currentContext?.profileHandle || "Abra um perfil no Instagram";
  const candidate = state.phoneCandidate;
  $("#phone-card").classList.toggle("hidden", !candidate);
  if (candidate) {
    $("#phone-value").textContent = candidate.phone;
    $("#phone-profile").textContent = candidate.profileHandle || "Conversa atual";
  }
  $("#connection-status").innerHTML = `<i></i>${state.pendingUploads?.length ? `${state.pendingUploads.length} pendente(s)` : "Sincronizado"}`;
  renderTimer();
  renderMessages();
  renderOutreach();
  renderHistory();
}

$("#login-button").addEventListener("click", async () => {
  const button = $("#login-button");
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    render(await message("LOGIN", { email: $("#email").value.trim(), password: $("#password").value }));
    $("#password").value = "";
    toast("Extensão conectada");
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
});

$("#session-button").addEventListener("click", async () => {
  try {
    render(state.activeSession
      ? await message("FINISH_SESSION")
      : await message("START_SESSION", { clinicId: $("#clinic-select").value }));
  } catch (error) { toast(error.message); }
});
$("#mark-response").addEventListener("click", async () => {
  if (!state.activeSession) return toast("Inicie uma sessão primeiro");
  render(await message("MARK_RESPONSE", { context: state.currentContext || {} }));
  toast("Resposta registrada");
});
$("#confirm-phone").addEventListener("click", async () => {
  if (state.phoneCandidate) openQualification(state.phoneCandidate);
});
$("#dismiss-phone").addEventListener("click", async () => render(await message("DISMISS_PHONE")));
$("#close-qualification").addEventListener("click", closeQualification);
$("#save-phone").addEventListener("click", () => savePhoneCapture(false).catch(error => toast(error.message)));
$("#send-phone-hunter").addEventListener("click", () => savePhoneCapture(true).catch(error => toast(error.message)));
$("#refresh-workspace").addEventListener("click", async () => {
  try { render(await message("REFRESH_WORKSPACE")); toast("Clínicas atualizadas"); }
  catch (error) { toast(error.message); }
});
$("#open-app").addEventListener("click", () => chrome.tabs.create({ url: MUNNIUS_EXTENSION_CONFIG.appUrl }));
$("#logout-button").addEventListener("click", async () => render(await message("LOGOUT")));

chrome.runtime.onMessage.addListener(messageEvent => {
  if (messageEvent.type === "STATE_UPDATED") render(messageEvent.state);
});

message("GET_STATE").then(render).catch(error => toast(error.message));
timerId = setInterval(renderTimer, 1000);
