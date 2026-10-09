// Checking Glide — Drip widget (Rev 22)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/spend.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const INK = Color.white()
const MUTED = new Color("#8E8E93")
const RED = new Color("#FF453A")
const GREEN = new Color("#34C759")
const COL = 58
const CACHE_NAME = "checking-glide-drip-cache.json"
// Only these spend.json fields are read or cached.
const FIELDS = [
  "as_of", "as_of_time", "daily_fixed", "used_today", "daily_gas",
  "gas_90d_rate", "gas_overrun_drip", "daily_grocery", "grocery_90d_rate", "grocery_overrun_drip",
  "pharmacy_365_rate", "pharmacy_90d_rate", "pharmacy_overrun_drip", "grok_url",
]
const STALE_COLOR = new Color("#FFD60A")
const OFFLINE_COLOR = new Color("#FF9F0A")
const AUTH_COLOR = new Color("#FF453A")
const STALE_HOUR = 9
const API_URL = "https://api.github.com/repos/tie-ler/checking-glide/contents/spend.json"
const TOKEN_KEY = "checking_glide_token"

function validFeed(d) {
  return d != null && typeof d === "object" && !Array.isArray(d) &&
    /^\d{4}-\d{2}-\d{2}/.test(String(d.as_of || ""))
}

function pick(d) {
  const out = {}
  FIELDS.forEach((k) => { if (d[k] !== undefined) out[k] = d[k] })
  return out
}

function cachePath() {
  const fm = FileManager.local()
  return fm.joinPath(fm.documentsDirectory(), CACHE_NAME)
}

function readCache() {
  try {
    const fm = FileManager.local()
    const p = cachePath()
    if (!fm.fileExists(p)) return null
    const d = JSON.parse(fm.readString(p))
    return validFeed(d) ? pick(d) : null
  } catch (e) {
    return null
  }
}

function writeCache(d) {
  try {
    FileManager.local().writeString(cachePath(), JSON.stringify(d))
  } catch (e) {}
}

function getToken() {
  try {
    return Keychain.contains(TOKEN_KEY) ? Keychain.get(TOKEN_KEY) || null : null
  } catch (e) {
    return null
  }
}

function header(res, name) {
  const h = (res && res.headers) || {}
  const k = Object.keys(h).find((x) => x.toLowerCase() === name)
  return k ? String(h[k]) : null
}

function failReason(req, token) {
  const res = req.response
  const code = res?.statusCode || 0
  if (code === 200) return "BAD FEED"
  if (code === 429 || (code === 403 && header(res, "x-ratelimit-remaining") === "0")) return "RATE"
  if (token && (code === 401 || code === 403 || code === 404)) return "AUTH"
  if (!token && code === 404) return "NO TOKEN"
  return "OFFLINE"
}

async function loadData() {
  const token = getToken()
  const req = new Request(token ? API_URL : JSON_URL)
  try {
    req.timeoutInterval = 8
    if (token) {
      req.headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "checking-glide-drip-widget",
      }
    }
    const body = await req.loadString()
    const code = req.response?.statusCode
    if (code !== 200) throw new Error("HTTP " + code)
    const raw = JSON.parse(body)
    if (!validFeed(raw)) throw new Error("bad feed")
    const d = pick(raw)
    writeCache(d)
    return { ...d, _err: null }
  } catch (e) {
    const err = failReason(req, token)
    const c = readCache()
    return c ? { ...c, _err: err } : { _err: err, _nodata: true }
  }
}

function daysBehind(data) {
  const m = String(data.as_of || "").match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return 0
  const t = new Date()
  const a = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.max(0, Math.round((b - a) / 86400000))
}

function isStale(behind) {
  return behind >= 2 || (behind === 1 && new Date().getHours() >= STALE_HOUR)
}

function freshTag(data) {
  const parts = []
  if (data._nodata) {
    parts.push("NO DATA")
    if (data._err !== "OFFLINE") parts.push(data._err)
    return parts.join(" \u00B7 ")
  }
  if (data._err) parts.push(data._err)
  const behind = daysBehind(data)
  if (isStale(behind)) parts.push("STALE " + behind + "d")
  return parts.join(" \u00B7 ")
}

function tagColor(data) {
  if (data._nodata || data._err === "AUTH" || data._err === "NO TOKEN") return AUTH_COLOR
  return data._err ? OFFLINE_COLOR : STALE_COLOR
}

function stamp(data) {
  const raw = String(data.as_of || "")
  const t = String(data.as_of_time || "")
  if (/\d{1,2}:\d{2}/.test(raw)) return raw
  const day = raw.replace(/\s+.*/, "")
  if (!day) return "\u2014"
  return (day + "  " + t).trim()
}

function n(v) {
  if (v === null || v === undefined || v === "") return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}
function round(x, d) {
  const f = Math.pow(10, d)
  return Math.round(x * f) / f
}
function money(x, d = 2) {
  if (n(x) === null) return "\u2014"
  const r = round(n(x), d)
  return (r < 0 ? "\u2212" : "") + "$" + Math.abs(r).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

function cell(row, text, color, bold, size) {
  const s = row.addStack()
  s.size = new Size(COL, 16)
  s.layoutHorizontally()
  s.addSpacer()
  const t = s.addText(text)
  t.font = bold ? Font.boldSystemFont(size) : Font.mediumSystemFont(size)
  t.textColor = color
  t.rightAlignText()
  t.lineLimit = 1
}

function line(parent, label, plan, actual, drip) {
  const r = parent.addStack()
  r.layoutHorizontally()
  r.centerAlignContent()
  const name = r.addText(label)
  name.font = Font.boldSystemFont(11)
  name.textColor = INK
  name.lineLimit = 1
  r.addSpacer()
  cell(r, money(plan), MUTED, false, 11)
  cell(r, money(actual), INK, false, 11)
  const hot = drip !== null && round(drip, 2) > 0
  cell(r, (hot ? "+" : "") + money(drip), drip === null ? MUTED : hot ? RED : GREEN, true, 11)
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(12, 16, 12, 14)
  w.url = data.grok_url || GROK_URL

  const rows = [
    ["GAS", n(data.daily_gas), n(data.gas_90d_rate), n(data.gas_overrun_drip)],
    ["GROCERY", n(data.daily_grocery), n(data.grocery_90d_rate), n(data.grocery_overrun_drip)],
    ["PHARMACY", n(data.pharmacy_365_rate), n(data.pharmacy_90d_rate), n(data.pharmacy_overrun_drip)],
  ]
  const dripSum = rows.some((r) => r[3] === null) ? null : rows.reduce((s, r) => s + r[3], 0)
  const tag = freshTag(data)

  const top = w.addStack()
  top.layoutHorizontally()
  top.centerAlignContent()
  const title = top.addText("DRIP    90 vs 365")
  title.font = Font.boldSystemFont(10)
  title.textColor = MUTED
  title.lineLimit = 1
  top.addSpacer()
  const asOf = top.addText("AS OF  " + stamp(data))
  asOf.font = Font.mediumSystemFont(9)
  asOf.textColor = new Color("#636366")
  asOf.lineLimit = 1
  asOf.minimumScaleFactor = 0.6
  if (tag) {
    top.addSpacer(6)
    const tg = top.addText(tag)
    tg.font = Font.boldSystemFont(9)
    tg.textColor = tagColor(data)
    tg.lineLimit = 1
    tg.minimumScaleFactor = 0.6
  }
  w.addSpacer(2)
  const big = w.addText((dripSum !== null && round(dripSum, 2) > 0 ? "+" : "") + money(dripSum, 2) + "  / D")
  big.font = Font.boldSystemFont(24)
  big.textColor = dripSum === null ? MUTED : round(dripSum, 2) > 0 ? RED : GREEN

  w.addSpacer(8)
  const head = w.addStack()
  head.layoutHorizontally()
  head.centerAlignContent()
  const spacer = head.addText(" ")
  spacer.font = Font.boldSystemFont(9)
  head.addSpacer()
  cell(head, "365", MUTED, true, 9)
  cell(head, "90", MUTED, true, 9)
  cell(head, "DRIP", MUTED, true, 9)

  rows.forEach((item) => {
    w.addSpacer(5)
    line(w, item[0], item[1], item[2], item[3])
  })

  w.addSpacer()
  const foot = w.addText("F  " + money(data.daily_fixed, 0) + " / D      USED  " + money(data.used_today, 0))
  foot.font = Font.mediumSystemFont(11)
  foot.textColor = MUTED
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
