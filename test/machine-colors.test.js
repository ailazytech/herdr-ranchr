import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MACHINE_PALETTE,
  MARK_COLORS,
  resolveMarkColor,
  machineOfAddress,
  assignMachineColors,
  setMachineColor,
  spaceAgentsBySpace,
  capMarks,
} from "../mods/herdr-folders/tree.js";

test("machineOfAddress: maps remote addresses to machine and bare addresses to local", () => {
  assert.equal(machineOfAddress("studio/t9s"), "studio");
  assert.equal(machineOfAddress("t2j"), "");
  assert.equal(machineOfAddress("box/sub/t1"), "box");
  assert.equal(machineOfAddress(""), "");
  assert.equal(machineOfAddress(null), "");
  assert.equal(machineOfAddress(undefined), "");
});

test("assignMachineColors: local defaults to null, remotes get defaults in sorted name order", () => {
  const { colors, changed } = assignMachineColors(undefined, ["zeta", "alpha", "beta", "alpha"]);
  assert.equal(changed, true);
  assert.deepEqual(colors, {
    "": null,
    alpha: MACHINE_PALETTE[0],
    beta: MACHINE_PALETTE[1],
    zeta: MACHINE_PALETTE[2],
  });

  const again = assignMachineColors(colors, ["beta", "zeta", "alpha"]);
  assert.equal(again.changed, false);
  assert.deepEqual(again.colors, colors);
});

test("assignMachineColors: preserves user choices including explicit null and offline machines", () => {
  const saved = { "": "ansi4", "studio": null, offline: "ansi1" };
  const before = structuredClone(saved);
  const { colors, changed } = assignMachineColors(saved, ["studio", "gamma"]);
  assert.equal(changed, true);
  assert.deepEqual(saved, before);
  assert.equal(colors[""], "ansi4");
  assert.equal(colors["studio"], null);
  assert.equal(colors.offline, "ansi1");
  // ansi4 and ansi1 are used once each; palette[0] (ansi6) has 0 uses.
  assert.equal(colors.gamma, "ansi6");

  // Re-running with empty machine list (e.g. startup before refreshMachines) preserves saved colors.
  const startup = assignMachineColors(colors, []);
  assert.equal(startup.changed, false);
  assert.deepEqual(startup.colors, colors);
});

test("assignMachineColors: wraps around when more than six remote machines exist", () => {
  const names = ["m1", "m2", "m3", "m4", "m5", "m6", "m7"];
  const { colors } = assignMachineColors({}, names);
  assert.deepEqual(names.map((n) => colors[n]), [...MACHINE_PALETTE, MACHINE_PALETTE[0]]);
});

test("setMachineColor and resolveMarkColor", () => {
  const initial = { "": null, "studio": "ansi6" };
  const updated = setMachineColor(initial, "", "ansi3");
  assert.equal(initial[""], null);
  assert.equal(updated[""], "ansi3");
  assert.equal(setMachineColor(updated, "studio", null)["studio"], null);

  const theme = { working: "#ffaa00", accent: "#112233" };
  assert.equal(resolveMarkColor("ansi6", theme), MARK_COLORS.ansi6);
  assert.equal(resolveMarkColor("#abcdef", theme), "#abcdef");
  assert.equal(resolveMarkColor("accent", theme), "#112233");
  assert.equal(resolveMarkColor(null, theme, "#999999"), "#999999");
  assert.equal(resolveMarkColor(null, theme), null);
});

test("spaceAgentsBySpace: includes local agents and remote sub-agents, keeps done as done, sorts by urgency and role", () => {
  const spaces = [
    {
      id: "note",
      name: "筆記",
      machine: null,
      tabs: [{ id: "tab1", name: "1", named: false }],
    },
    {
      id: "tiger",
      name: "老虎",
      machine: null,
      tabs: [
        { id: "t-main", name: "主控", named: true },
        { id: "t-adv", name: "顧問", named: true },
        { id: "t-exp", name: "實驗", named: true },
      ],
    },
  ];
  const agents = [
    { address: "t2j", space: "note", tab: "tab1", tab_name: "1", status: "done", program: { name: "Claude Code" } },
    { address: "t1h", space: "tiger", tab: "t-adv", tab_name: "顧問", status: "idle", program: { name: "Claude Code" } },
    { address: "t6q", space: "tiger", tab: "t-exp", tab_name: "實驗", status: "working", program: { name: "Claude Code" } },
    { address: "t5", space: "tiger", tab: "t-main", tab_name: "主控", status: "working", program: { name: "Claude Code" } },
  ];
  const terminals = [
    { address: "t2j", state: "live", status: "done" },
    { address: "studio/t9r", parent: "t2j", state: "live", status: "done", name: "wiki-fmt2" },
    { address: "studio/t9s", parent: "t2j", state: "live", status: "working", name: "wiki-native5" },
    { address: "studio/t9z", parent: "t2j", state: "exited", status: "done", name: "old-sub" },
    { address: "t128", parent: "t6q", state: "live", name: "quota-log" }, // non-agent: no status
    { address: "studio/t9w", parent: "t5", state: "live", status: "error", name: "q101" },
    { address: "studio/t9x", parent: "t5", state: "live", status: "idle", name: "q102" },
  ];
  const roles = { note: null, tiger: "main" };

  const bySpace = spaceAgentsBySpace({ spaces, agents, terminals, roles });

  // 筆記: t2j (done), wiki-fmt2 (done), wiki-native5 (working)
  assert.deepEqual(
    bySpace.note.map((x) => [x.address, x.machine, x.name, x.status, x.role]),
    [
      ["t2j", "", "Claude Code", "done", null],
      ["studio/t9r", "studio", "wiki-fmt2", "done", null],
      ["studio/t9s", "studio", "wiki-native5", "working", null],
    ],
  );

  // 老虎: blocked -> working (main before normal) -> idle
  assert.deepEqual(
    bySpace.tiger.map((x) => [x.address, x.machine, x.name, x.status, x.role]),
    [
      ["studio/t9w", "studio", "q101", "blocked", null],
      ["t5", "", "主控", "working", "main"],
      ["t6q", "", "實驗", "working", null],
      ["t1h", "", "顧問", "idle", null],
      ["studio/t9x", "studio", "q102", "idle", null],
    ],
  );
});

test("spaceAgentsBySpace: handles shell-pane parents, kept sub-agents without duplication, and cycles", () => {
  const spaces = [
    { id: "cafe", name: "Cafe", machine: null, tabs: [{ id: "tc1", name: "1", named: false }] },
    { id: "other", name: "Other", machine: null, tabs: [{ id: "to1", name: "1", named: false }] },
  ];
  const panes = [{ pane: "p1", tab: "tc1", terminal: "t42" }];
  const agents = [
    // Kept sub-agent placed into "other" space: has parent t42 in cafe, but lives in "other".
    { address: "studio/t3m", space: "other", tab: "to1", tab_name: "1", status: "working", program: { name: "Claude Code" } },
  ];
  const terminals = [
    { address: "t42", state: "live" },
    { address: "studio/t3c", parent: "t42", state: "live", status: "done", name: "cafe-b2" },
    { address: "studio/t3m", parent: "t42", state: "live", status: "working", name: "cafe-web2" },
    { address: "studio/t3n", parent: "studio/t3m", state: "live", status: "idle", name: "grandchild" },
    // Cycle guard
    { address: "t99", parent: "studio/t3c", state: "live", status: "idle", name: "cyc1" },
    { address: "studio/t3c", parent: "t99", state: "live", status: "done", name: "cafe-b2" },
  ];

  const bySpace = spaceAgentsBySpace({ spaces, agents, terminals, panes, roles: { other: "main" } });
  assert.deepEqual(bySpace.cafe.map((x) => x.address), ["studio/t3c", "t99"]);
  // t3m is in "other" (with role: null because it has a parent) and its grandchild stays in "other".
  assert.deepEqual(
    bySpace.other.map((x) => [x.address, x.name, x.status, x.role]),
    [
      ["studio/t3m", "cafe-web2", "working", null],
      ["studio/t3n", "grandchild", "idle", null],
    ],
  );
});

test("capMarks: caps at MAX_MARKS and reports remaining count", () => {
  const items = ["a", "b", "c", "d", "e", "f"];
  assert.deepEqual(capMarks(items, 4), { shown: ["a", "b", "c", "d"], more: 2 });
  assert.deepEqual(capMarks(items.slice(0, 4), 4), { shown: ["a", "b", "c", "d"], more: 0 });
  assert.deepEqual(capMarks(items.slice(0, 2), 4), { shown: ["a", "b"], more: 0 });
  assert.deepEqual(capMarks(undefined, 4), { shown: [], more: 0 });
});
