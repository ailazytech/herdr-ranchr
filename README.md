# ranchr

[English](README.en.md) ｜ 繁體中文

給 [herdr App](https://herdr.dev) 的 layout：左側的 Spaces 換成可以分資料夾、分機器的側欄，pane 標題列顯示終端機位址。

herdr 是牧人，[tendr](https://github.com/ailazytech/tendr) 顧爐火，tunr 是調頻器；ranchr 是經營整座牧場的人：資料夾是圍欄，每台機器是一片牧場。

## 安裝

需要：herdr App（裝好並開過一次）、Node.js 18 以上（在 PATH 上）、git。

```bash
git clone https://github.com/ailazytech/ranchr
node ranchr/install.mjs --switch
```

- 裝進 `~/.config/herdr-app`：`layouts/ranchr.json`、`mods/herdr-folders/`、`mods/pane-address/`
- `--switch` 會檢查 mod 並切到 `ranchr`；`Ctrl+Shift+L` 可以切回原本的 layout
- 已經有 `ranchr.json` 的話不會蓋掉（你可能改過），要用新版加 `--force`，舊的會留備份
- 更新：`git pull` 後再跑一次 `node install.mjs`（mod 會更新，layout 照上一條）

### 搭配 herdr-quota、tendr、tunr（都選用）

- **herdr-quota**：底部狀態列顯示 Claude、Codex、Grok、Antigravity 的額度。有裝它的 `quota-status`，ranchr 的狀態列就用它；沒裝就用 App 內建的狀態列。之後才裝的話，跑一次 `node install.mjs --force`。
- **tendr**：右側面板有 tendr 看板的位置。沒裝 tendr 時安裝腳本會先拿掉，裝了之後跑 `node tendr/app/install.mjs --layout ranchr`。
- **tunr**：裝了 herdr-quota 的狀態列，就會多一顆開關 tunr 小播放器的按鈕。

### 之前用 herdr-quota 的 `quota-folders`

ranchr 就是從那裡搬出來的。直接跑上面的安裝：

- 第一次裝時，`ranchr` 會從你的 `quota-folders` 開始，你調過的版面會跟過來。
- 資料夾、釘選、主控標記、機器分頁都存在 App 的共享狀態裡，不用搬。
- 確定沒問題後，可以刪掉 `~/.config/herdr-app/layouts/quota-folders.json`。

## 側欄

- **資料夾**：可以多層，不同機器的 space 也能放在同一個資料夾；收起來時顯示數量和裡面的狀態
- **機器分頁**：Spaces 標題下面有「全部」、「這台」和每台機器的分頁。點了只看那台，主畫面跳到那台上次看的 space；分頁上有那台最緊急的狀態。從 Agents 清單等地方切到別台的 space 時，分頁會跟過去
- **圖示**：space 預設顯示 agent 的圖案，資料夾預設一般圖示，都可以換成 emoji
- **釘選**：滑過列時點圖釘，或把列拖進 Pinned 區
- **執行與待觀看**：釘選區下面列出有 agent 在跑、在等你，或已經 done 還沒看的 space，收起來的資料夾裡的也算；名稱前面用淺色小字標它在哪個資料夾。點下去時，有 done 的 agent 就直接跳到它。這兩區固定在上面，只有資料夾樹會捲動
- **位址**：滑鼠移到 space 那一列時，名稱後面顯示它第一個 agent 的終端機位址（例如 `t16`），點一下複製；右鍵選單最上面列出所有 agent 的位址
- **狀態**：右邊每個 agent 一個標記，跟 Agents 清單一樣
- **排序**：Spaces 標題列的下拉選單，有原始、資料夾日期、啟用 agent；只影響顯示，切回原始就還原
- **主控與副控**：分頁或 space 名稱含「主控」「副控」會自動標記，也可以在 space 上按右鍵標。標記後圖示有外框、名稱換色，其他 space 略淡；主控的轉圈樣式跟別人不同
- **窄側欄**：每個 space 顯示字母或 emoji，角落是最緊急的狀態；機器分頁縮成一個字，點了切下一台

## pane 標題列的位址

每個 pane 標題列在名稱後面顯示它的終端機位址（例如 `t16`），agent 和一般 shell 都有；點一下複製，方便貼給別的 agent（`hc read t16`）。

## 語言

介面預設跟隨系統語言（中文使用繁體中文，其他使用英文）。在 Spaces 標題列的排序選單選擇「跟系統」、「中文」或「English」；也可以用 `language-auto`、`language-zh`、`language-en` 指令切換。設定與支援相同語言選項的 mod 共用，立即生效；既有名稱不會改變。

## 指令與快捷鍵

`herdr-app do herdr-folders.<指令>`，或在 `keys.json` 綁 `herdr-folders.<指令>`：

- `menu`：開目前 space 的選單；`emoji`：換 emoji
- `role-main`、`role-sub`、`role-none`：把目前的 space 標成主控、副控、不標記
- `sort`：開排序選單；`sort-manual`、`sort-date`、`sort-agents`：直接切換
- `workspace-all`、`workspace-1`（這台）、`workspace-2`（第一台遠端）…`workspace-9`、`workspace-next`、`workspace-prev`：切機器分頁

快捷鍵要自己加進 `keys.json` 的 `global`，例如照分頁位置：

```json
"ctrl-alt-1": "herdr-folders.workspace-all",
"ctrl-alt-2": "herdr-folders.workspace-1",
"ctrl-alt-3": "herdr-folders.workspace-2"
```

注意：改過 `keys.json` 之後，App 以後新增的預設快捷鍵就不會再自動加進來。`ctrl-shift` 開頭的組合在中文輸入法下容易切到輸入模式，比較不建議。

## 注意

- 資料夾只影響側欄的顯示。`space.next` 和數字快捷鍵還是照 App 原本的順序
- 側欄是內建 Spaces 的複本，官方更新 Spaces 時不會自動跟上
- 資料夾存在這台電腦的 App 共享狀態裡，不會跟著機器同步
- 右側官方的 Agents 清單不會跟著機器分頁篩選

## 移除

`Ctrl+Shift+L` 切回別的 layout，再刪掉 `~/.config/herdr-app/layouts/ranchr.json`，以及 `~/.config/herdr-app/mods/` 裡的 `herdr-folders/`、`pane-address/`。

## 給 agent

[RECIPE.md](RECIPE.md) 是照 herdr 慣例寫的重建說明。

## 授權

[MIT](LICENSE)。`mods/herdr-folders` 改寫自 [chrisggraham/herdr-folders](https://github.com/chrisggraham/herdr-folders)（MIT）與 Herdr 內建的 Spaces（Apache 2.0），見該資料夾的 [NOTICE](mods/herdr-folders/NOTICE)。`mods/pane-address` 改寫自 Herdr 內建的 pane 標題列（Apache 2.0），見 [NOTICE](mods/pane-address/NOTICE)。最早是 [herdr-quota](https://github.com/ailazytech/herdr-quota) 的一部分。
