(() => {
  const RESERVED_PATHS = new Set([
    "", "accounts", "direct", "explore", "reels", "reel", "p", "stories",
    "about", "developer", "legal", "privacy", "terms"
  ]);
  let previousUrl = "";
  let lastPhone = "";
  let lastConversationHandle = "";
  let lastAccountHandle = "";
  let lastPublishedContext = "";
  let scanTimer;
  let responseScanTimer;
  const lastEmission = new Map();

  function normalizeText(value = "") {
    return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function handleFromHref(href = "") {
    try {
      const pathname = href.startsWith("http") ? new URL(href).pathname : href;
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length !== 1 || RESERVED_PATHS.has(parts[0].toLowerCase())) return "";
      return `@${parts[0]}`;
    } catch {
      return "";
    }
  }

  function singleHandleFromPath(pathname = location.pathname) {
    return handleFromHref(pathname);
  }

  function handlesFrom(container) {
    const handles = [...(container || document).querySelectorAll('a[href^="/"], a[href^="https://www.instagram.com/"]')]
      .map(anchor => handleFromHref(anchor.getAttribute("href") || ""))
      .filter(Boolean);
    return [...new Set(handles)];
  }

  function handleFromVisibleText(container) {
    const text = container?.innerText || "";
    const explicit = text.match(/@[\w.]{2,30}/)?.[0];
    return explicit || "";
  }

  function ownAccountHandle() {
    const links = [...document.querySelectorAll('a[href]')];
    for (const anchor of links) {
      const label = normalizeText([
        anchor.innerText,
        anchor.getAttribute("aria-label"),
        anchor.querySelector("img")?.getAttribute("alt")
      ].filter(Boolean).join(" "));
      if (!/(^|\s)(perfil|profile)(\s|$)/.test(label)) continue;
      const handle = handleFromHref(anchor.getAttribute("href") || "");
      if (handle) return handle;
    }
    return lastAccountHandle;
  }

  function directScope(target) {
    return target?.closest?.('[role="dialog"]')
      || target?.closest?.("form")
      || (location.pathname.startsWith("/direct/") ? document.querySelector('main, [role="main"]') : null);
  }

  function isDirectComposer(target) {
    if (!target?.matches?.('textarea, [contenteditable="true"], [role="textbox"]')) return false;
    const hint = normalizeText([
      target.getAttribute?.("placeholder"),
      target.getAttribute?.("aria-label")
    ].filter(Boolean).join(" "));
    if (/(mensagem|message|direct)/.test(hint)) return true;
    const scope = directScope(target);
    const scopeText = normalizeText(scope?.innerText || "");
    return location.pathname.startsWith("/direct/") || /(enviar|send|mensagem|message)/.test(scopeText);
  }

  function conversationHandle(target = document) {
    const accountHandle = ownAccountHandle();
    if (accountHandle) lastAccountHandle = accountHandle;
    const profilePageHandle = singleHandleFromPath(location.pathname);
    if (profilePageHandle && normalizeHandle(profilePageHandle) !== normalizeHandle(accountHandle)) return profilePageHandle;
    const scopes = [
      target?.closest?.('[role="dialog"]'),
      target?.closest?.("article"),
      target?.closest?.("form"),
      document.querySelector('[role="dialog"]'),
      document.querySelector('main header, [role="main"] header')
    ].filter(Boolean);
    for (const scope of scopes) {
      const textHandle = handleFromVisibleText(scope);
      if (textHandle && normalizeHandle(textHandle) !== normalizeHandle(accountHandle)) return textHandle;
      const handles = handlesFrom(scope).filter(handle => normalizeHandle(handle) !== normalizeHandle(accountHandle));
      if (handles.length === 1) return handles[0];
      if (handles.length > 1 && lastConversationHandle && handles.includes(lastConversationHandle)) return lastConversationHandle;
    }
    return lastConversationHandle;
  }

  function normalizeHandle(value = "") {
    return String(value || "").trim().replace(/^@/, "").toLowerCase();
  }

  function contextFor(target = document) {
    const accountHandle = ownAccountHandle();
    if (accountHandle) lastAccountHandle = accountHandle;
    const profileHandle = conversationHandle(target);
    if (profileHandle) lastConversationHandle = profileHandle;
    const inDirect = location.pathname.startsWith("/direct/") || Boolean(directScope(target));
    return {
      profileHandle,
      instagramUrl: profileHandle
        ? `https://www.instagram.com/${profileHandle.replace("@", "")}/`
        : location.href,
      pageUrl: location.href,
      route: inDirect ? "direct" : profileHandle ? "profile" : "feed",
      accountHandle: accountHandle || lastAccountHandle
    };
  }

  function publishTabContext(target = document) {
    const context = contextFor(target);
    const key = `${context.accountHandle || ""}:${context.profileHandle || ""}:${context.route}`;
    if (key === lastPublishedContext) return;
    lastPublishedContext = key;
    chrome.runtime.sendMessage({
      type: "UPDATE_TAB_CONTEXT",
      accountHandle: context.accountHandle || "",
      context
    }).catch(() => {});
  }

  function emit(type, extra = {}, cooldown = 700) {
    const context = contextFor(extra.target);
    const key = `${type}:${context.profileHandle}:${extra.phone || ""}`;
    const lastAt = lastEmission.get(key) || 0;
    if (Date.now() - lastAt < cooldown) return;
    lastEmission.set(key, Date.now());
    chrome.runtime.sendMessage({
      type: "TRACKED_EVENT",
      event: {
        type,
        profileHandle: context.profileHandle,
        instagramUrl: context.instagramUrl,
        context,
        accountHandle: context.accountHandle,
        phone: extra.phone || null
      }
    }).catch(() => {});
  }

  function buttonText(button) {
    return normalizeText([
      button?.innerText,
      button?.getAttribute?.("aria-label"),
      button?.querySelector?.("svg")?.getAttribute?.("aria-label"),
      button?.querySelector?.("svg title")?.textContent
    ].filter(Boolean).join(" "));
  }

  function isCommentComposer(target) {
    const placeholder = normalizeText(target?.getAttribute?.("placeholder") || target?.getAttribute?.("aria-label") || "");
    return /coment|comment/.test(placeholder);
  }

  document.addEventListener("click", event => {
    const conversationRow = event.target.closest?.('a[href*="/direct/t/"], [role="row"], [role="listitem"]');
    if (conversationRow && location.pathname.startsWith("/direct/")) {
      lastConversationHandle = handleFromVisibleText(conversationRow) || handlesFrom(conversationRow)[0] || lastConversationHandle;
      const unreadText = normalizeText([
        conversationRow.innerText,
        conversationRow.getAttribute?.("aria-label"),
        conversationRow.querySelector?.('[aria-label*="lida" i], [aria-label*="unread" i]')?.getAttribute?.("aria-label")
      ].filter(Boolean).join(" "));
      if (/(nao lida|unread|nova mensagem|new message)/.test(unreadText)) {
        setTimeout(() => emit("response_detected", { target: conversationRow }, 0), 900);
      }
    }

    const button = event.target.closest?.('button, [role="button"]');
    if (!button) return;
    const text = buttonText(button);
    if (/(^|\s)(seguir|follow)(\s|$)/.test(text) && !/(seguindo|following|deixar de seguir|unfollow)/.test(text)) {
      emit("follow", { target: button }, 1200);
      return;
    }
    if (/(^| )(curtir|like)( |$)/.test(text) && !/(descurtir|unlike)/.test(text)) {
      emit("like", { target: button }, 900);
      return;
    }
    if (/(^|\s)(publicar|post)(\s|$)/.test(text)) {
      const scope = button.closest("form, article, [role='dialog']") || document;
      if (scope.querySelector('textarea, [contenteditable="true"]')) emit("comment", { target: button }, 1200);
      return;
    }
    if (/(^|\s)(enviar|send)(\s|$)/.test(text)) {
      const scope = button.closest("form, [role='dialog']") || button.parentElement;
      if (scope?.querySelector?.('textarea, [contenteditable="true"], [role="textbox"]') || location.pathname.startsWith("/direct/")) {
        emit("direct_sent", { target: button }, 1200);
      }
    }
  }, true);

  document.addEventListener("dblclick", event => {
    const media = event.target.closest?.("img, video");
    if (!media) return;
    const scope = media.closest("article, [role='dialog']") || media.parentElement;
    emit("like", { target: scope }, 1200);
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    if (isDirectComposer(event.target)) emit("direct_sent", { target: event.target }, 1200);
    else if (isCommentComposer(event.target)) emit("comment", { target: event.target }, 1200);
  }, true);

  function inspectRoute() {
    const routeChanged = location.href !== previousUrl;
    if (routeChanged) {
      previousUrl = location.href;
      const handle = singleHandleFromPath(location.pathname);
      if (handle && normalizeHandle(handle) !== normalizeHandle(ownAccountHandle())) {
        lastConversationHandle = handle;
        emit("profile_viewed", { target: document }, 0);
      }
      schedulePhoneScan();
    }
    publishTabContext();
  }

  function scheduleResponseScan() {
    clearTimeout(responseScanTimer);
    responseScanTimer = setTimeout(() => {
      if (!location.pathname.startsWith("/direct/")) return;
      const rows = [...document.querySelectorAll('[role="row"], [role="listitem"], a[href*="/direct/t/"]')];
      rows.forEach(row => {
        const text = normalizeText([
          row.innerText,
          row.getAttribute?.("aria-label"),
          row.querySelector?.('[aria-label*="lida" i], [aria-label*="unread" i]')?.getAttribute?.("aria-label")
        ].filter(Boolean).join(" "));
        if (!/(nao lida|unread|nova mensagem|new message)/.test(text)) return;
        const handle = handleFromVisibleText(row) || handlesFrom(row).find(item => normalizeHandle(item) !== normalizeHandle(ownAccountHandle()));
        if (!handle) return;
        lastConversationHandle = handle;
        emit("response_detected", { target: row }, 5000);
      });
    }, 900);
  }

  function schedulePhoneScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const main = document.querySelector('main, [role="main"]');
      const scope = dialog || (location.pathname.startsWith("/direct/") ? main : null);
      if (!scope) return;
      const visibleText = (scope.innerText || "").slice(-30000);
      const matches = visibleText.match(/(?:\+?55[\s.-]*)?(?:\(?\d{2}\)?[\s.-]*)?(?:9[\s.-]*)?\d{4}[\s.-]*\d{4}/g) || [];
      const candidate = [...matches].reverse().map(value => value.trim()).find(value => {
        const length = value.replace(/\D/g, "").length;
        return length >= 8 && length <= 13;
      });
      if (!candidate || candidate === lastPhone) return;
      lastPhone = candidate;
      emit("phone_candidate", { target: scope, phone: candidate }, 0);
    }, 950);
  }

  const observer = new MutationObserver(() => {
    inspectRoute();
    schedulePhoneScan();
    scheduleResponseScan();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(inspectRoute, 800);
  inspectRoute();
  scheduleResponseScan();
})();
