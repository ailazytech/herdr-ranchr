import test from "node:test";
import assert from "node:assert/strict";
import * as folders from "../mods/herdr-folders/i18n.js";
import * as pane from "../mods/pane-address/i18n.js";

for (const [name, mod] of [["folders", folders], ["pane", pane]]) {
  test(`${name}: language keys match and variables interpolate`, () => {
    assert.deepEqual(Object.keys(mod.messages["zh-TW"]).sort(), Object.keys(mod.messages.en).sort());
    assert.equal(mod.t("emojiTitle", { name: "Demo" }, "en"), "Emoji for Demo");
    assert.equal(mod.t("emojiTitle", { name: "示範" }, "zh-TW"), "示範的表情符號");
    assert.equal(mod.t("emojiTitle", {}, "en"), "Emoji for {name}");
  });

  test(`${name}: missing translations fall back to English`, () => {
    mod.messages.en.testFallback = "Hello {name}";
    try {
      assert.equal(mod.t("testFallback", { name: "Sam" }, "zh-TW"), "Hello Sam");
      assert.equal(mod.t("missing", {}, "zh-TW"), "missing");
    } finally {
      delete mod.messages.en.testFallback;
    }
  });

  test(`${name}: detection, selection and failure`, async () => {
    const state = {};
    const shared = (key) => state[key];
    const set = (key, value) => { state[key] = value; };
    let calls = 0;
    await mod.initLanguage(shared, set, async (cmd, args) => {
      calls++;
      assert.equal(cmd, "node");
      assert.deepEqual(args, ["-p", "Intl.DateTimeFormat().resolvedOptions().locale"]);
      return { code: 0, stdout: "zh-HK\n" };
    });
    assert.equal(mod.language(shared), "zh-TW");
    state["ui.language"] = "en";
    assert.equal(mod.language(shared), "en");
    await mod.initLanguage(shared, set, async () => { calls++; });
    assert.equal(calls, 1);
    delete state["ui.system-language"];
    await mod.initLanguage(shared, set, async () => { throw new Error("failed"); });
    assert.equal(state["ui.system-language"], "en");
  });
}
