# ranchr

English ｜ [繁體中文](README.md)

A layout for the [herdr app](https://herdr.dev): the Spaces list on the left becomes a sidebar of folders and machines, and every pane header shows its terminal's address.

herdr is the herder, [tendr](https://github.com/ailazytech/tendr) tends the fire, tunr is the tuner; ranchr runs the whole ranch: folders are the pens, each machine is a pasture.

## Install

You need the herdr app (installed and opened once), Node.js 18 or later on the PATH, and git.

```bash
git clone https://github.com/ailazytech/herdr-ranchr
node herdr-ranchr/install.mjs --switch
```

- Installs into `~/.config/herdr-app`: `layouts/ranchr.json`, `mods/herdr-folders/`, `mods/pane-address/`
- `--switch` checks the mods and switches to `ranchr`; `Ctrl+Shift+L` switches back
- An existing `ranchr.json` is left alone (you may have changed it); `--force` installs the new one and keeps the old as a backup
- To update: `git pull`, then run `node install.mjs` again (the mods update; the layout follows the rule above)

### With herdr-quota, tendr and tunr (all optional)

- **herdr-quota** shows what's left of your Claude, Codex, Grok and Antigravity plans in the bottom bar. With its `quota-status` installed, ranchr's status bar uses it; without, the app's own status bar. Installed it later? Run `node install.mjs --force`.
- **tendr**: the right panel has a place for the tendr board. Without tendr the installer leaves it out; once tendr is installed, run `node tendr/app/install.mjs --layout ranchr`.
- **tunr**: herdr-quota's status bar gets a button that opens and closes the small tunr player.

### Coming from herdr-quota's `quota-folders`

ranchr was moved out of it. Just install as above:

- The first install starts `ranchr` from your `quota-folders`, so your layout changes come along.
- Folders, pins, lead marks and machine tabs live in the app's shared state; nothing to move.
- Once you're happy, delete `~/.config/herdr-app/layouts/quota-folders.json`.

## The sidebar

- **Folders:** nested as deep as you like; one folder can hold spaces from several machines; a folded folder shows how many it holds and their state
- **Machine tabs:** under the Spaces header, tabs for all, this computer and each machine. One shows only that machine and goes to the space you last had there; each tab shows its machine's most urgent mark. Going to another machine's space (from the Agents list, say) moves the tab with you
- **Icons:** a space shows its agent's icon, a folder a plain folder; either can be an emoji instead
- **Pinning:** click the pin on a hovered row, or drag a row into Pinned
- **Running and to look at (執行與待觀看):** under Pinned, every space with an agent working, waiting on you, or done and not looked at yet, folded folders included, with the folders it sits in as small dim text before its name. A click goes straight to a done agent if there is one. Pinned and this list stay put; only the folder tree scrolls
- **Addresses:** with the pointer on a space's row, its first agent's address (`t16`) follows the name, shown only (a click there is a click on the row); to copy, use the right-click menu, which lists every agent's address at the top
- **Status:** one mark per agent on the right, as in the Agents list
- **Sorting:** a menu on the Spaces header: as arranged, by folder date, or by busy agents. Only the drawing changes; back to "as arranged" restores it
- **Lead and second (主控, 副控):** a space whose name or tab contains 主控 or 副控 is marked, or mark it from its right-click menu. Marked spaces get an outlined icon and a colored name while the rest step back a little, and a lead has its own spinner
- **Narrow sidebar:** each space is its letter or emoji with the most urgent mark on a corner; the machine tabs shrink to one letter that cycles

## Pane header addresses

Every pane header shows its terminal's address after the name (`t16`), for agents and plain shells alike; a click copies it, handy for another agent (`hc read t16`).

## Language

The interface follows the system language by default (Traditional Chinese for Chinese locales, English otherwise). Use the sort menu in the Spaces header to choose System, 中文, or English, or use the `language-auto`, `language-zh`, and `language-en` commands. The setting is shared with compatible mods and takes effect immediately; existing names stay unchanged.

## Commands and keys

`herdr-app do herdr-folders.<command>`, or `herdr-folders.<command>` in `keys.json`:

- `menu` opens the shown space's menu; `emoji` changes its emoji
- `role-main`, `role-sub`, `role-none` mark the shown space as lead, second, or neither
- `sort` opens the sort menu; `sort-manual`, `sort-date`, `sort-agents` switch directly
- `workspace-all`, `workspace-1` (this computer), `workspace-2` (the first remote one) … `workspace-9`, `workspace-next`, `workspace-prev` switch machine tabs

Add keys to `keys.json`'s `global` yourself, for example by tab position:

```json
"ctrl-alt-1": "herdr-folders.workspace-all",
"ctrl-alt-2": "herdr-folders.workspace-1",
"ctrl-alt-3": "herdr-folders.workspace-2"
```

Once `keys.json` is edited, new default keys from app updates are no longer added to it automatically. `ctrl-shift` combinations can switch some input methods (Chinese IMEs among them), so they're best avoided.

## Watch out

- Folders change only the sidebar. `space.next` and the number keys still follow the app's own order
- The sidebar is a copy of the shipped Spaces list and won't follow its updates on its own
- Folders are kept in this computer's app state, not synced between machines
- The shipped Agents list on the right isn't filtered by the machine tabs

## Remove

`Ctrl+Shift+L` to another layout, then delete `~/.config/herdr-app/layouts/ranchr.json` and `herdr-folders/`, `pane-address/` in `~/.config/herdr-app/mods/`.

## For agents

[RECIPE.md](RECIPE.md) is a rebuild guide written the herdr way.

## License

[MIT](LICENSE). `mods/herdr-folders` is adapted from [chrisggraham/herdr-folders](https://github.com/chrisggraham/herdr-folders) (MIT) and Herdr's shipped Spaces (Apache 2.0); see its [NOTICE](mods/herdr-folders/NOTICE). `mods/pane-address` is adapted from Herdr's shipped pane header (Apache 2.0); see its [NOTICE](mods/pane-address/NOTICE). It started as part of [herdr-quota](https://github.com/ailazytech/herdr-quota).
