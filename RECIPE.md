# ranchr

Herdr's default window with two changes: the Spaces list on the left is a sidebar of folders and machines, and every pane header shows its terminal's address.

## What you see

- **Layout:** a clone of Herdr's `main` layout. Left sidebar (brand, the folder sidebar and the shipped agents list, footer); work column with the tab bar, the active tab's panes as cards, an optional right panel (a stack of Files, Changes and tendr), and the status bar at the bottom.
- **Sidebar header:** "Spaces", a sort menu (原始 / 資料夾日期 / 啟用 agent), a new-folder button and `+` (a new space, on the selected machine).
- **Machine tabs** (once a second machine is known): 全部, 這台, then each machine from `hc machine ls` (temporary ones left out). The selected tab has the `selected` background; a machine that isn't connected is `dim`; each tab ends with its machine's most urgent agent mark. In the narrow sidebar: one 24 px chip with the current tab's first letter, a click goes to the next.
- **Pinned**, then **執行與待觀看** (every space with an agent working, blocked or done, in tree order, its folders as an 11 px `dim` path before its name, wrapping to two lines when needed), fixed above the folder tree (at most 55 % of the height, scrolling on their own past that); only the tree scrolls.
- **Tree rows:** folders (icon, emoji or colored tile; folded ones show a count and the marks inside), remote machine headers, spaces (avatar: emoji, else the agent's icon, else the letter on its color; name; the repo, branch and ahead/behind only where unusual; one mark per agent: spinner, `!`, dot). Spaces marked 主控 or 副控 get an outlined avatar and a colored name; the rest fade to 0.72 opacity. A 主控's spinner is `lead-spinner.svg`.
- **Pane header:** the shipped one with the terminal's address after the name, small, monospace and outlined; a click copies it and shows 已複製 for 1.5 s.

## How it behaves

- A machine tab filters the tree, Pinned and 執行與待觀看 to that machine's spaces, hides folders with none of them and other machines' headers, and selects the space last shown on that machine. 全部 shows everything exactly as without tabs. When the shown space changes to another machine's (from the Agents list, a key), the tab follows; it never moves on its own.
- Clicking a row in 執行與待觀看 focuses the pane of the agent there that finished last (`pane.focus {pane}`), else selects the space.
- Sorting changes only the drawing; the stored tree keeps its order.
- Mod commands (`herdr-app do herdr-folders.<command>`, or `herdr-folders.<command>` in keys.json): `menu`, `emoji`, `role-main`, `role-sub`, `role-none`, `sort`, `sort-manual`, `sort-date`, `sort-agents`, `workspace-all`, `workspace-next`, `workspace-prev`, `workspace-1` … `workspace-9` (1 is this computer, 2 on the remote machines in tab order).
- State lives in shared state: the tree under `herdr-folders`, the sort under `herdr-folders.sort`, the selected machine under `herdr-folders.workspace` (`null` all, `""` this computer), each machine's last space under `herdr-folders.workspace-last-space`.

## Built from

- **Layout `ranchr`:** `row#root` → `column#sidebar` [`block#brand` workspace-chrome, `column#sidebar-lists` [`block#spaces` herdr-folders, `block#agents` agents], `block#sidebar-footer` workspace-chrome `{footer: true}`] and `column#work` [`block#tabs` tabs, `row#work-body` [`block#main` content `{tab: "active"}` with pane header mod `pane-address`, `column#panel` [`stack#panel-body` [files, changes, `block#tendr` tendr-board]]], `block#status` quota-status (from herdr-quota) or the shipped workspace-status].
- **Mod `herdr-folders`** (this repo): the folder tree in `tree.js` (no Herdr calls; `npm test` covers it), rows, dragging and overlays in `folders.js`, and `main.js`, a copy of the shipped `spaces`. It uses `spaces`, `agents`, `terminals`, `machines`, `panes`, `run`, `exec`, `hc`, `theme`, `shared`, `setShared`, `watchFolder`, `window`, `layout`, `props`, `nextCommand`, `openOverlay`, `closeOverlay`.
- **Mod `pane-address`** (this repo): a copy of the shipped `pane` header (0.1.15) with the address (`props().pane` → `panes()` → `terminal`); copies with `cx.write_to_clipboard`.
- **Shipped mods:** workspace-chrome, agents, tabs, files, changes, workspace-status. **Optional:** `quota-status` from [ailazytech/herdr-quota](https://github.com/ailazytech/herdr-quota), `tendr-board` from [ailazytech/tendr](https://github.com/ailazytech/tendr).

## Watch out

- In `keys.json` a mod's command is `<mod>.<command>`; `<mod>:<command>` is refused as an unknown action.
- Copy a new mod's `mod.json` first: with the app open, a `main.js` that arrives first docks a default block into the shown layout.
- `herdr-app check` can pass while a render fails on a missing name: after installing, look at `herdr-app shot`.
- `overlay.close` without an id closes the top overlay, whoever opened it.
- `.line_height(12)` is 12 times the font size; write `"12px"`.
