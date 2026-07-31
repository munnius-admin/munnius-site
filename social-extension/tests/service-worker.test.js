const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

function workerHarness() {
  let persisted = {};
  const runtimeListeners = [];
  const context = vm.createContext({
    console,
    crypto: webcrypto,
    fetch: async () => { throw new Error("Network should not be used in this test."); },
    importScripts() {},
    MUNNIUS_EXTENSION_CONFIG: { supabaseUrl: "", supabaseAnonKey: "" },
    chrome: {
      storage: {
        local: {
          async get(key) { return { [key]: persisted[key] }; },
          async set(value) { persisted = { ...persisted, ...value }; },
          async setAccessLevel() {}
        }
      },
      runtime: {
        onInstalled: { addListener() {} },
        onMessage: { addListener(listener) { runtimeListeners.push(listener); } },
        sendMessage() { return Promise.resolve(); }
      },
      sidePanel: { setPanelBehavior() { return Promise.resolve(); } }
    }
  });
  const source = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
  vm.runInContext(source, context, { filename: "service-worker.js" });
  return { context, getPersisted: () => persisted };
}

test("keeps sessions isolated by tab and advances the second Direct to a response", async () => {
  const { context, getPersisted } = workerHarness();
  const state = context.defaultState();
  state.clinics = [
    { id: "clinic-a", name: "Clínica A", instagram: "@clinicaa", active: true },
    { id: "clinic-b", name: "Clínica B", instagram: "@clinicab", active: true }
  ];
  await context.writeState(state, 101);

  await context.updateTabContext(101, { accountHandle: "@clinicaa" });
  await context.setAutomation(101, true);
  await context.startSession("clinic-a", 101);
  await context.updateTabContext(202, { accountHandle: "@clinicab" });
  await context.setAutomation(202, true);
  await context.startSession("clinic-b", 202);

  await context.trackEvent({ type: "direct_sent", profileHandle: "@leadum" }, 101);
  await context.trackEvent({ type: "direct_sent", profileHandle: "@leadum" }, 101);
  const ignored = await context.trackEvent({ type: "direct_sent", profileHandle: "@leadum" }, 101);
  await context.trackEvent({ type: "direct_sent", profileHandle: "@leaddois" }, 202);

  const persisted = getPersisted().munniusExtensionState;
  assert.deepEqual({ ...persisted.tabContexts["101"].counters }, {
    profiles: 0, likes: 0, comments: 0, directs: 1, responses: 1, phones: 0
  });
  assert.deepEqual({ ...persisted.tabContexts["202"].counters }, {
    profiles: 0, likes: 0, comments: 0, directs: 1, responses: 0, phones: 0
  });
  assert.equal(ignored.ignored, "conversation_already_tracked");
});

test("manual actions still work while automation is disabled", async () => {
  const { context, getPersisted } = workerHarness();
  const state = context.defaultState();
  state.clinics = [{ id: "clinic-a", name: "Clínica A", instagram: "@clinicaa", active: true }];
  await context.writeState(state, 303);
  await context.selectClinic(303, "clinic-a");
  await context.startSession("clinic-a", 303);

  const automatic = await context.trackEvent({ type: "like", profileHandle: "@lead" }, 303);
  await context.trackEvent({ type: "like", profileHandle: "@lead", manual: true }, 303);

  assert.equal(automatic.ignored, "automation_disabled");
  assert.equal(getPersisted().munniusExtensionState.tabContexts["303"].counters.likes, 1);
});
