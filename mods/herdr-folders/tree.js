// The folder tree behind the sidebar: where each space, folder and machine
// sits, and which moves are allowed. Pure logic with no Herdr calls, so
// `node --test` covers it. Every function returns a new tree; none changes
// its input.
//
// A key names one thing: "folder:<id>", "space:<id>" or "machine:<name>".
// A parent ref names one list of children: "root", or the key of the folder
// or machine that owns the list. Spaces and machines in no list sit at the
// end of their default parent (see homeOf).

export const ROOT = "root";
export const DEFAULT_ICON = "mods/workspace-chrome/folder.svg";
// The list drawn above everything else. It holds keys like any folder.
export const PINNED = "pinned";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function emptyTree() {
  return { version: 1, folders: {}, machines: {}, emoji: {}, children: { [ROOT]: [] } };
}

// ---- keys ----

export const kindOf = (key) => key.slice(0, key.indexOf(":"));
export const nameOf = (key) => key.slice(key.indexOf(":") + 1);
const isContainer = (key) => kindOf(key) === "folder" || kindOf(key) === "machine";

// A remote space's id is "<machine>/<id>"; a local one has no slash.
function machineOfSpace(key) {
  const id = nameOf(key);
  return id.includes("/") ? id.slice(0, id.indexOf("/")) : null;
}

// Where a space or machine sits while no list names it.
function homeOf(machine) {
  return machine ? `machine:${machine}` : ROOT;
}

// ---- where things are ----

// The ref of the list that holds `key`, or null when no list does.
function parentOf(tree, key) {
  return Object.keys(tree.children).find((ref) => tree.children[ref].includes(key)) ?? null;
}

// Where `key` is drawn: its list, else its default parent.
function placeOf(tree, key) {
  const listed = parentOf(tree, key);
  if (listed) return listed;
  return kindOf(key) === "space" ? homeOf(machineOfSpace(key)) : ROOT;
}

// The machine on the path from `ref` up to the root; null for this computer.
export function machineAt(tree, ref) {
  const seen = new Set();
  let at = ref;
  while (!seen.has(at)) {
    seen.add(at);
    if (at === ROOT) return null;
    if (kindOf(at) === "machine") return nameOf(at);
    at = placeOf(tree, at);
  }
  return null; // a loop in a damaged store
}

// Whether `ref` is `key` or inside it.
function isWithin(tree, ref, key) {
  const seen = new Set();
  let at = ref;
  while (at !== ROOT && !seen.has(at)) {
    if (at === key) return true;
    seen.add(at);
    at = placeOf(tree, at);
  }
  return false;
}

// The machines a key's path must contain: null is this computer. A folder
// takes them from what it holds; a machine's own contents settle it.
function machinesNeeded(tree, key, seen = new Set()) {
  if (kindOf(key) === "space") return new Set([machineOfSpace(key)]);
  if (kindOf(key) === "machine") return new Set([null]);
  const needed = new Set();
  if (seen.has(key)) return needed;
  seen.add(key);
  for (const child of tree.children[key] ?? []) {
    for (const machine of machinesNeeded(tree, child, seen)) needed.add(machine);
  }
  return needed;
}

// Every space filed somewhere under `ref`, by id.
export function spacesUnder(tree, ref, seen = new Set()) {
  if (seen.has(ref)) return [];
  seen.add(ref);
  return (tree.children[ref] ?? []).flatMap((key) => (kindOf(key) === "space" ? [nameOf(key)] : spacesUnder(tree, key, seen)));
}

// ---- moving ----

// A machine sits outside any machine, a space sits in its own machine or outside
// every machine (a folder can hold spaces from several machines), and nothing
// moves into itself.
export function canMove(tree, key, ref) {
  if (isWithin(tree, ref, key)) return false;
  if (kindOf(ref) === "folder" && !(nameOf(ref) in tree.folders)) return false;
  const here = machineAt(tree, ref);
  return here === null || [...machinesNeeded(tree, key)].every((machine) => machine === here);
}

// `key` goes to position `index` of the list `ref`, counted with `key` taken
// out first. A move `canMove` refuses changes nothing.
export function move(tree, key, ref, index) {
  if (!canMove(tree, key, ref)) return tree;
  const children = {};
  for (const [at, list] of Object.entries(tree.children)) children[at] = list.filter((k) => k !== key);
  const list = [...(children[ref] ?? [])];
  list.splice(Math.min(Math.max(index, 0), list.length), 0, key);
  children[ref] = list;
  return { ...tree, children };
}

// The index to hand `move` for dropping `key` just before or after `target`.
export function slotNear(tree, ref, key, target, side) {
  const rest = (tree.children[ref] ?? []).filter((k) => k !== key);
  const at = rest.indexOf(target);
  if (at < 0) return rest.length;
  return side === "after" ? at + 1 : at;
}

// ---- pinning ----

export const isPinned = (tree, key) => (tree.children[PINNED] ?? []).includes(key);

// To the end of the pinned list, remembering where it sat.
export function pin(tree, key) {
  if (isPinned(tree, key)) return tree;
  const ref = placeOf(tree, key);
  const index = Math.max((tree.children[ref] ?? []).indexOf(key), 0);
  return { ...move(tree, key, PINNED, Infinity), pinnedFrom: { ...(tree.pinnedFrom ?? {}), [key]: { ref, index } } };
}

// Back where it sat; to its default parent if that folder is gone.
export function unpin(tree, key) {
  const from = tree.pinnedFrom?.[key];
  const pinnedFrom = { ...(tree.pinnedFrom ?? {}) };
  delete pinnedFrom[key];
  const home = kindOf(key) === "space" ? homeOf(machineOfSpace(key)) : ROOT;
  const back = from && canMove(tree, key, from.ref) ? from : { ref: home, index: Infinity };
  return { ...move(tree, key, back.ref, back.index), pinnedFrom };
}

// The names of the folders a key sits in, outermost first; a machine counts as
// one. Something pinned goes by where it was pinned from.
export function pathOf(tree, key) {
  const up = (k) => {
    const at = placeOf(tree, k);
    return at === PINNED ? tree.pinnedFrom?.[k]?.ref ?? ROOT : at;
  };
  const names = [];
  const seen = new Set();
  for (let at = up(key); at !== ROOT && !seen.has(at); at = up(at)) {
    seen.add(at);
    names.unshift(kindOf(at) === "folder" ? tree.folders[nameOf(at)]?.name : nameOf(at));
  }
  return names.filter(Boolean);
}

// ---- folders ----

// A new folder goes after the last folder in `ref`, else first.
export function insertFolder(tree, ref, id, name) {
  const key = `folder:${id}`;
  const list = [...(tree.children[ref] ?? [])];
  let after = 0;
  list.forEach((k, at) => {
    if (kindOf(k) === "folder") after = at + 1;
  });
  list.splice(after, 0, key);
  return {
    ...tree,
    folders: { ...tree.folders, [id]: { name, icon: DEFAULT_ICON, color: null, folded: false } },
    children: { ...tree.children, [ref]: list, [key]: [] },
  };
}

// The folder goes; what it held takes its place in its parent.
export function deleteFolder(tree, id) {
  const key = `folder:${id}`;
  const ref = placeOf(tree, key);
  const held = tree.children[key] ?? [];
  const children = {};
  for (const [at, list] of Object.entries(tree.children)) {
    if (at !== key) children[at] = list;
  }
  const list = [...(children[ref] ?? [])];
  const at = list.indexOf(key);
  if (at < 0) list.push(...held);
  else list.splice(at, 1, ...held);
  children[ref] = list;
  const folders = { ...tree.folders };
  delete folders[id];
  return { ...tree, folders, children };
}

export function updateFolder(tree, id, patch) {
  if (!(id in tree.folders)) return tree;
  return { ...tree, folders: { ...tree.folders, [id]: { ...tree.folders[id], ...patch } } };
}

// Folds or unfolds a folder or a machine.
export function setFolded(tree, key, folded) {
  if (kindOf(key) === "folder") return updateFolder(tree, nameOf(key), { folded });
  const name = nameOf(key);
  return { ...tree, machines: { ...tree.machines, [name]: { ...tree.machines[name], folded } } };
}

export function isFolded(tree, key) {
  if (kindOf(key) === "folder") return tree.folders[nameOf(key)]?.folded === true;
  return tree.machines[nameOf(key)]?.folded === true;
}

// ---- 主控 and 副控 ----

// What a space's names say it is: its own name or a tab's. 主控 wins over 副控.
export function roleOf(names) {
  const says = (word) => names.some((name) => name?.includes(word));
  return says("主控") ? "main" : says("副控") ? "sub" : null;
}

// A choice from the space's menu beats what its names say; "none" says neither.
export function spaceRole(tree, id, names) {
  const chosen = tree.roles?.[id];
  return chosen === "none" ? null : chosen ?? roleOf(names);
}

// Keeps a choice only while it differs from the names: choosing what they say
// hands the space back to them.
export function setRole(tree, id, role, names) {
  const roles = { ...(tree.roles ?? {}) };
  if (role === roleOf(names)) delete roles[id];
  else roles[id] = role ?? "none";
  return { ...tree, roles };
}

// One color per role, for every space; none is the theme's.
export function setRoleColor(tree, role, color) {
  const roleColors = { ...(tree.roleColors ?? {}) };
  if (color) roleColors[role] = color;
  else delete roleColors[role];
  return { ...tree, roleColors };
}

// An agent in a space with role `role`: its tab decides when any tab there says
// something, so a 主控 tab's neighbours stay ordinary; else it takes the space's.
export function agentRole(agent, role, tabs) {
  if (!role) return null;
  return roleOf([agent.tab_name]) ?? (roleOf(tabs) ? null : role);
}

// Each space's agents as { address, name }, for handing an address to another agent:
// the ones no terminal started come first (in the order given), then those another
// terminal started (`children`, a Set of addresses). A row shows the first.
export function addressesBySpace(list, children) {
  const out = {};
  for (const a of list) (out[a.space] ??= []).push(a);
  const entry = (a) => ({ address: a.address, name: a.tab_name || a.program?.name || a.title || "" });
  for (const [space, all] of Object.entries(out)) {
    out[space] = [...all.filter((a) => !children.has(a.address)), ...all.filter((a) => children.has(a.address))].map(entry);
  }
  return out;
}

// ---- emoji ----

// What someone typed, as a label: trimmed and short, null when empty.
export function cleanEmoji(text) {
  const s = String(text ?? "").trim();
  return s ? [...s].slice(0, 8).join("") : null;
}

export const emojiOf = (tree, id) => tree.emoji?.[id] ?? null;

// A space's emoji, or none. Kept by id: a space can be renamed, and one on a
// machine that's away keeps it.
export function setEmoji(tree, id, emoji) {
  const all = { ...(tree.emoji ?? {}) };
  if (emoji) all[id] = emoji;
  else delete all[id];
  return { ...tree, emoji: all };
}

// ---- drawing ----

// `known`: { spaces: [{ id, machine }], machines: [name] }, what exists now.
// Puts each in a list: this computer's spaces first, then machines, at the
// end of the root; a remote space at the end of its machine.
export function settle(tree, known) {
  const children = {};
  for (const [ref, list] of Object.entries(tree.children)) children[ref] = [...list];
  const placed = new Set(Object.values(children).flat());
  const place = (key, ref) => {
    if (placed.has(key)) return;
    placed.add(key);
    (children[ref] ??= []).push(key);
  };
  for (const id of Object.keys(tree.folders)) place(`folder:${id}`, ROOT);
  for (const space of known.spaces) if (!space.machine) place(`space:${space.id}`, ROOT);
  for (const name of known.machines) place(`machine:${name}`, ROOT);
  for (const space of known.spaces) if (space.machine) place(`space:${space.id}`, homeOf(space.machine));
  return { ...tree, children };
}

// null is all machines; the empty string is this computer.
export function workspaceKnown(known, workspace) {
  if (workspace === null) return known;
  return {
    spaces: known.spaces.filter((space) => (space.machine ?? "") === workspace),
    machines: known.machines.filter((machine) => machine === workspace),
  };
}

export function workspaceTarget(command, current, machines) {
  const tabs = [null, "", ...machines];
  if (command === "workspace-all") return null;
  if (command === "workspace-next" || command === "workspace-prev") {
    const at = Math.max(0, tabs.indexOf(current));
    return tabs[(at + (command === "workspace-next" ? 1 : -1) + tabs.length) % tabs.length];
  }
  const match = /^workspace-([1-9])$/.exec(command);
  return match && Number(match[1]) < tabs.length ? tabs[Number(match[1])] : undefined;
}

// The tab to show once the shown space changed from `before` to `active` (an agent
// clicked, a key): its machine's, unless every machine is shown. Only a change moves
// it, so picking a tab and then its space never bounces back.
export function followWorkspace(current, before, active) {
  if (!active || before === undefined || before === active.id || current === null) return current;
  return active.machine ?? "";
}

// The shown space closed: the one to show instead on the same tab. The next one below
// it in the sidebar (`order`, as it was before the close), else the one above, else the
// tab's first; null when the tab has none left.
export function spaceAfterClose(order, closed, spaces, workspace) {
  const here = new Set(spaces.filter((space) => (space.machine ?? "") === workspace).map((space) => space.id));
  const at = order.indexOf(closed);
  if (at >= 0) {
    for (let i = at + 1; i < order.length; i++) if (here.has(order[i])) return order[i];
    for (let i = at - 1; i >= 0; i--) if (here.has(order[i])) return order[i];
  }
  return spaces.find((space) => here.has(space.id))?.id ?? null;
}

export function workspaceSpace(spaces, workspace, last) {
  const candidates = spaces.filter((space) => (space.machine ?? "") === workspace);
  return candidates.find((space) => space.id === last)?.id ?? candidates[0]?.id ?? null;
}

// The draw list: one node per thing to show, parents before their children,
// with its depth and its parent ref. A folded
// node's children are left out. Keys for what no longer exists are skipped
// and stay in the store (a machine can come back).
// A filtered tab hides a folder whose spaces are all on other machines. Given `open`
// (the ids of every space that exists), a folder holding none of them, such as a new
// one, is on no machine yet and every tab shows it.
function hiddenFolder(tree, key, present, open) {
  const held = spacesUnder(tree, key);
  if (held.some((id) => present.has(`space:${id}`))) return false;
  return open ? held.some((id) => open.has(id)) : true;
}

export function rowsOf(tree, known, order = (keys) => keys, { hideEmptyFolders = false, open = null } = {}) {
  const full = settle(tree, known);
  const present = new Set([
    ...known.spaces.map((space) => `space:${space.id}`),
    ...known.machines.map((name) => `machine:${name}`),
  ]);
  const exists = (key) => (kindOf(key) === "folder" ? nameOf(key) in tree.folders : present.has(key));
  const visited = new Set();

  const walk = (ref, depth, out) => {
    const keys = full.children[ref] ?? [];
    // The pinned list keeps the order it was given: that's what pinning is for.
    for (const key of ref === PINNED ? keys : order(keys)) {
      if (!exists(key)) continue;
      if (hideEmptyFolders && kindOf(key) === "folder" && hiddenFolder(full, key, present, open)) continue;
      const node = { key, kind: kindOf(key), depth, parent: ref };
      out.push(node);
      if (!isContainer(key) || visited.has(key)) continue;
      visited.add(key);
      node.folded = isFolded(full, key);
      const inside = [];
      walk(key, depth + 1, inside);
      node.empty = inside.length === 0;
      if (!node.folded) out.push(...inside);
    }
  };

  const nodes = [];
  walk(PINNED, 0, nodes);
  walk(ROOT, 0, nodes);
  return nodes;
}

// Working or waiting on you counts most, then finished, then merely open. The steps
// are far apart: one running agent lifts a folder over any number of finished ones.
export const agentScore = (list) => list.reduce((sum, { status: s }) => sum + (s === "working" || s === "blocked" ? 10000 : s === "done" ? 100 : 1), 0);

// Sorts siblings by what they hold, highest first; ties keep their order, so a
// sort never changes the tree. `value` scores a space by id, `combine` (a, b)
// folds what a folder or machine holds into one score.
export function ranked(tree, value, combine) {
  const score = (key, seen) => {
    if (kindOf(key) === "space") return value(nameOf(key));
    if (seen.has(key)) return 0;
    seen.add(key);
    return (tree.children[key] ?? []).reduce((total, child) => combine(total, score(child, seen)), 0);
  };
  return (keys) => keys
    .map((key, at) => ({ key, at, score: score(key, new Set()) }))
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .map((row) => row.key);
}

// ---- colors ----

export function isHex(text) {
  return typeof text === "string" && HEX_COLOR.test(text);
}

// ---- machine colors & busy marks ----

export const MACHINE_PALETTE = ["ansi6", "ansi3", "ansi4", "ansi5", "ansi2", "ansi1"];
export const MARK_COLORS = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};

const BUSY_MARK_ORDER = ["blocked", "done", "working", "idle"];
const ROLE_RANK = { main: 0, sub: 1 };
const byRole = (a, b) => (ROLE_RANK[a.role] ?? 2) - (ROLE_RANK[b.role] ?? 2);

export function resolveMarkColor(color, theme, fallback = null) {
  if (!color) return fallback;
  if (color.startsWith("#")) return color;
  return MARK_COLORS[color] ?? theme?.[color] ?? fallback;
}

// "studio/t9s" -> "studio"; local addresses ("t2j") -> "".
export function machineOfAddress(address) {
  if (typeof address !== "string" || !address) return "";
  const slash = address.indexOf("/");
  return slash < 0 ? "" : address.slice(0, slash);
}

function bareAddress(address) {
  if (typeof address !== "string" || !address) return "";
  const slash = address.indexOf("/");
  return slash < 0 ? address : address.slice(slash + 1);
}

// Assigns default colors to newly seen remote machines in sorted name order
// without overwriting user choices (including explicit `null` for no color).
// `""` is this computer and defaults to `null` (use theme colors).
export function assignMachineColors(saved, machines = [], palette = MACHINE_PALETTE) {
  const valid = saved && typeof saved === "object" && !Array.isArray(saved);
  const next = valid ? { ...saved } : {};
  let changed = !valid;
  if (!Object.prototype.hasOwnProperty.call(next, "")) {
    next[""] = null;
    changed = true;
  }
  const remote = [...new Set(machines)].filter((m) => typeof m === "string" && m.length > 0).sort();
  for (const name of remote) {
    if (Object.prototype.hasOwnProperty.call(next, name)) continue;
    const uses = (c) => Object.values(next).filter((v) => v === c).length;
    next[name] = palette.reduce((best, c) => (uses(c) < uses(best) ? c : best), palette[0]);
    changed = true;
  }
  return { colors: next, changed };
}

export function setMachineColor(saved, machine, color) {
  const next = saved && typeof saved === "object" && !Array.isArray(saved) ? { ...saved } : {};
  next[machine ?? ""] = color ?? null;
  return next;
}

function normalizeBusyStatus(status) {
  if (status === "error" || status === "blocked") return "blocked";
  if (status === "done" || status === "working" || status === "idle") return status;
  return "idle";
}

function agentDisplayName(agent, term, tab) {
  if (term?.name) return term.name;
  const tabName = agent.tab_name;
  if (tabName && (tab ? tab.named : !/^\d+$/.test(tabName))) return tabName;
  return agent.program?.name || agent.title || bareAddress(agent.address);
}

function subAgentDisplayName(term) {
  return term.name || term.template || term.program?.name || term.title || bareAddress(term.address);
}

// Per-space agent marks for the 執行與待觀看 section: includes pane agents and
// live sub-agents from `terminals()` across all machines (keeping sub-agent `done`
// as `done`), ordered blocked -> done -> working -> idle and Lead -> Second -> other.
export function spaceAgentsBySpace({ spaces = [], agents = [], terminals = [], panes = [], roles = {} } = {}) {
  const termByAddr = new Map(terminals.map((k) => [k.address, k]));
  const hasParent = new Set(terminals.filter((k) => k.parent).map((k) => k.address));
  const tabToSpace = new Map();
  const tabById = new Map();
  const tabNamesBySpace = {};
  const spaceIds = new Set();
  for (const s of spaces) {
    spaceIds.add(s.id);
    const tabs = s.tabs ?? [];
    tabNamesBySpace[s.id] = tabs.map((tab) => tab.name);
    for (const tab of tabs) {
      tabToSpace.set(tab.id, s.id);
      tabById.set(tab.id, tab);
    }
  }
  const childrenByParent = new Map();
  for (const k of terminals) {
    if (!k.parent || k.state !== "live") continue;
    const list = childrenByParent.get(k.parent);
    if (list) list.push(k);
    else childrenByParent.set(k.parent, [k]);
  }
  const listed = new Set(agents.map((a) => a.address));
  const out = {};
  const rootsBySpace = {};
  const rootSpaceByAddr = new Map();
  const addRoot = (space, address) => {
    if (!space || !address) return;
    (rootsBySpace[space] ??= new Set()).add(address);
    if (!rootSpaceByAddr.has(address)) rootSpaceByAddr.set(address, space);
  };
  const pushMark = (space, item) => {
    (out[space] ??= []).push(item);
  };
  for (const a of agents) {
    const tab = tabById.get(a.tab);
    const role = hasParent.has(a.address) ? null : agentRole(a, roles[a.space], tabNamesBySpace[a.space] ?? []);
    pushMark(a.space, {
      address: a.address,
      machine: machineOfAddress(a.address),
      name: agentDisplayName(a, termByAddr.get(a.address), tab),
      status: normalizeBusyStatus(a.status),
      role,
    });
    addRoot(a.space, a.address);
  }
  for (const p of panes) {
    if (!p.terminal) continue;
    addRoot(tabToSpace.get(p.tab), p.terminal);
  }
  for (const k of terminals) {
    if (k.state !== "live") continue;
    const rawSpace = k.labels?.["herdr.space"];
    if (!rawSpace) continue;
    const machine = machineOfAddress(k.address);
    const sid = machine ? `${machine}/${rawSpace}` : rawSpace;
    if (!spaceIds.has(sid)) continue;
    if (!listed.has(k.address) && k.status) {
      listed.add(k.address);
      pushMark(sid, {
        address: k.address,
        machine,
        name: subAgentDisplayName(k),
        status: normalizeBusyStatus(k.status),
        role: null,
      });
    }
    addRoot(sid, k.address);
  }
  for (const [space, roots] of Object.entries(rootsBySpace)) {
    const seen = new Set();
    const walk = (address) => {
      if (seen.has(address)) return;
      seen.add(address);
      for (const k of childrenByParent.get(address) ?? []) {
        const owner = rootSpaceByAddr.get(k.address);
        if (owner && owner !== space) continue;
        if (!listed.has(k.address) && k.status) {
          listed.add(k.address);
          pushMark(space, {
            address: k.address,
            machine: machineOfAddress(k.address),
            name: subAgentDisplayName(k),
            status: normalizeBusyStatus(k.status),
            role: null,
          });
        }
        walk(k.address);
      }
    };
    for (const address of roots) walk(address);
  }
  for (const [space, items] of Object.entries(out)) {
    out[space] = BUSY_MARK_ORDER.flatMap((status) => items.filter((item) => item.status === status).sort(byRole));
  }
  return out;
}

export function capMarks(items, maxMarks = 4) {
  const list = items ?? [];
  const shown = list.slice(0, maxMarks);
  return { shown, more: Math.max(0, list.length - shown.length) };
}
