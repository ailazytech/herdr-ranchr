#!/usr/bin/env node
// 把 ranchr 裝進 herdr App：node install.mjs [--switch] [--force]
// - mods/herdr-folders、mods/pane-address 每次都更新（mod.json 先到，App 開著時才不會塞一塊預設區塊進版面）
// - layouts/ranchr.json 已經有的話不蓋掉（可能改過），--force 才覆蓋，舊的留成 .bak-<時間>
//   第一次裝、而且之前裝過 herdr-quota 的 quota-folders：從它開始，你調過的版面跟著過來
// - 沒裝 herdr-quota 的狀態列（mods/quota-status）就用 App 內建的 workspace-status；
//   沒裝 tendr 的看板（mods/tendr-board）就把 tendr 區塊拿掉，裝了 tendr 後用它的 `node app/install.mjs --layout ranchr` 加回來
// - --switch：herdr-app check 後切到 ranchr（App 要開著）
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const appHome = process.env.HERDR_APP_HOME || path.join(os.homedir(), '.config', 'herdr-app')
const args = process.argv.slice(2)
const LAYOUT = 'ranchr'
const MODS = ['herdr-folders', 'pane-address']

if (Number(process.versions.node.split('.')[0]) < 18) {
  console.error('需要 Node.js 18 以上')
  process.exit(1)
}
if (!fs.existsSync(appHome)) {
  console.error('找不到 herdr App 的資料夾：' + appHome + '（先裝好並開過一次 herdr App）')
  process.exit(1)
}

// mod：整個資料夾複製過去，覆蓋同名檔案但不刪別的。mod.json 要先到
const modTargets = MODS.map((mod) => {
  const source = path.join(here, 'mods', mod)
  const target = path.join(appHome, 'mods', mod)
  fs.mkdirSync(target, { recursive: true })
  const names = fs.readdirSync(source).sort((a, b) => (b === 'mod.json') - (a === 'mod.json'))
  for (const name of names) fs.copyFileSync(path.join(source, name), path.join(target, name))
  console.log('已安裝 mod：' + target)
  return target
})

const find = (node, id) => {
  if (node?.id === id) return node
  for (const child of node?.children ?? []) {
    const found = find(child, id)
    if (found) return found
  }
  return null
}
const has = (mod) => fs.existsSync(path.join(appHome, 'mods', mod))

const layoutTarget = path.join(appHome, 'layouts', LAYOUT + '.json')
const earlier = path.join(appHome, 'layouts', 'quota-folders.json')
if (fs.existsSync(layoutTarget) && !args.includes('--force')) {
  console.log('已經有 ' + layoutTarget + '，不覆蓋（要用新版就加 --force，舊的會留備份）')
} else {
  if (fs.existsSync(layoutTarget)) {
    const backup = layoutTarget + '.bak-' + new Date().toISOString().replace(/[:.]/g, '-')
    fs.copyFileSync(layoutTarget, backup)
    console.log('舊的 layout 備份在 ' + backup)
  }
  const fromEarlier = !fs.existsSync(layoutTarget) && fs.existsSync(earlier)
  const layout = JSON.parse(fs.readFileSync(fromEarlier ? earlier : path.join(here, 'layouts', LAYOUT + '.json'), 'utf8'))
  if (fromEarlier) console.log('從你之前的 quota-folders 版面開始：' + earlier)
  const spaces = find(layout, 'spaces')
  if (spaces?.content) spaces.content.mod = 'herdr-folders'
  const status = find(layout, 'status')
  if (status?.content?.mod === 'quota-status' && !has('quota-status')) {
    status.content.mod = 'workspace-status'
    console.log('沒裝 herdr-quota 的額度狀態列，狀態列先用內建的 workspace-status')
  }
  if (!has('tendr-board')) {
    const stack = find(layout, 'panel-body')
    if (stack) stack.children = stack.children.filter((c) => c.id !== 'tendr')
    console.log('沒裝 tendr 的看板，layout 裡的 tendr 區塊先拿掉（裝 tendr 後用它的 app/install.mjs --layout ' + LAYOUT + ' 加回來）')
  }
  fs.mkdirSync(path.dirname(layoutTarget), { recursive: true })
  fs.writeFileSync(layoutTarget, JSON.stringify(layout, null, 2) + '\n')
  console.log('已安裝 layout：' + layoutTarget)
}

if (args.includes('--switch')) {
  const run = (cmdArgs) => execFileSync('herdr-app', cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  try {
    for (const target of modTargets) console.log(run(['check', target]))
    console.log(run(['do', 'layout.switch', JSON.stringify({ name: LAYOUT })]))
    console.log('已切到 ' + LAYOUT + '（Ctrl+Shift+L 可以切回原本的 layout）')
  } catch (err) {
    console.error('切換失敗（herdr App 要開著、herdr-app 要在 PATH 上）：' + String(err.stderr || err.message).trim())
    process.exit(1)
  }
}
