// Kept independent of Herdr so translations can also be tested with Node.
export const messages = {
  "zh-TW": {
    "spaces": "Spaces",
    "all": "全部",
    "computer": "這台",
    "pinned": "釘選",
    "running": "執行與待觀看",
    "loading": "載入中…",
    "newSpace": "在這裡新增 space",
    "rebuilt": "已重建 ·",
    "rebuiltHelp": "這台機器已重建或更換，點擊以連接新機器。",
    "connecting": "連線中…",
    "connect": "連線",
    "connectError": "無法連線。",
    "detached": "分離 HEAD",
    "sortTitle": "排序 spaces",
    "manual": "原始",
    "date": "資料夾日期",
    "agents": "啟用 agent",
    "language": "語言 Language",
    "auto": "跟系統",
    "chinese": "中文",
    "english": "English",
    "newFolder": "新資料夾",
    "copyAddress": "複製位址",
    "copyAddressHelp": "點一下複製位址",
    "copied": "已複製",
    "lead": "主控",
    "second": "副控",
    "noRole": "不標記",
    "roleColor": "{role}的顏色（全部共用，× 是預設）",
    "emojiMenu": "表情符號…",
    "rename": "重新命名",
    "herdrMenu": "Herdr 選單…",
    "close": "關閉",
    "newFolderHere": "在這裡新增資料夾",
    "unpin": "取消釘選",
    "pin": "釘到最上面",
    "editFolderMenu": "編輯資料夾…",
    "deleteFolder": "刪除資料夾",
    "emojiPlaceholder": "Win + . 可以開表情符號面板",
    "emojiTitle": "{name}的表情符號",
    "thisSpace": "這個 space",
    "emoji": "表情符號",
    "default": "預設",
    "cancel": "取消",
    "save": "儲存",
    "folderEmojiPlaceholder": "留空就用圖示和顏色",
    "editFolder": "編輯資料夾",
    "name": "名稱",
    "icon": "圖示",
    "color": "顏色",
    "needsYou": "需要你",
    "asleep": "休眠",
    "unreachable": "無法連線",
    "disconnected": "已中斷連線",
    "connectingState": "連線中",
    "unknown": "未知",
    "machineColorTitle": "{name}的顏色",
    "noColor": "不上色"
  },
  "en": {
    "spaces": "Spaces",
    "all": "All",
    "computer": "This computer",
    "pinned": "Pinned",
    "running": "Running & unseen",
    "loading": "Loading…",
    "newSpace": "New space there",
    "rebuilt": "rebuilt ·",
    "rebuiltHelp": "This machine was rebuilt or replaced. Click to connect to the new one.",
    "connecting": "Connecting…",
    "connect": "Connect",
    "connectError": "Couldn't connect.",
    "detached": "detached HEAD",
    "sortTitle": "Sort spaces",
    "manual": "As arranged",
    "date": "Folder date",
    "agents": "Busy agents",
    "language": "語言 Language",
    "auto": "System",
    "chinese": "中文",
    "english": "English",
    "newFolder": "New folder",
    "copyAddress": "Copy address",
    "copyAddressHelp": "Click to copy address",
    "copied": "Copied",
    "lead": "Lead",
    "second": "Second",
    "noRole": "No role",
    "roleColor": "{role} color (shared by all; × is default)",
    "emojiMenu": "Emoji…",
    "rename": "Rename",
    "herdrMenu": "Herdr menu…",
    "close": "Close",
    "newFolderHere": "New folder here",
    "unpin": "Unpin",
    "pin": "Pin to top",
    "editFolderMenu": "Edit folder…",
    "deleteFolder": "Delete folder",
    "emojiPlaceholder": "Win + . opens the emoji panel",
    "emojiTitle": "Emoji for {name}",
    "thisSpace": "this space",
    "emoji": "Emoji",
    "default": "Default",
    "cancel": "Cancel",
    "save": "Save",
    "folderEmojiPlaceholder": "Leave blank to use icon and color",
    "editFolder": "Edit folder",
    "name": "Name",
    "icon": "Icon",
    "color": "Color",
    "needsYou": "Needs you",
    "asleep": "Asleep",
    "unreachable": "Unreachable",
    "disconnected": "Disconnected",
    "connectingState": "Connecting",
    "unknown": "Unknown",
    "machineColorTitle": "Color for {name}",
    "noColor": "No color"
  }
};

export function t(key, vars = {}, language = "en") {
  const text = messages[language]?.[key] ?? messages.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match);
}

export function language(shared) {
  const selected = shared("ui.language") ?? "auto";
  return selected === "auto" ? (shared("ui.system-language") ?? "en") : selected;
}

export async function initLanguage(shared, setShared, exec) {
  if (shared("ui.system-language") != null) return;
  let detected = "en";
  try {
    const result = await exec("node", ["-p", "Intl.DateTimeFormat().resolvedOptions().locale"]);
    if (result.code === 0 && /^zh/i.test(result.stdout.trim())) detected = "zh-TW";
  } catch {}
  if (shared("ui.system-language") == null) setShared("ui.system-language", detected);
}
