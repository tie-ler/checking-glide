// Checking Glide — Scriptable widget (Rev 22)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/spend.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const CHART_W = 172
const CHART_H = 78
const CACHE_NAME = "checking-glide-main-cache.json"
// Only these spend.json fields are read or cached.
const FIELDS = [
  "as_of", "as_of_time", "available_spend", "available_today", "used_today",
  "spark_week", "nominal_spend", "status", "control_avg",
  "floor", "daily_income", "daily_fixed", "daily_path", "grok_url",
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
        "User-Agent": "checking-glide-widget",
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

function num(v) {
  if (v === null || v === undefined || v === "") return null
  const x = Number(v)
  return Number.isFinite(x) ? x : null
}

function usedToday(data) {
  if (num(data.used_today) !== null) return num(data.used_today)
  if (Array.isArray(data.spark_week) && data.spark_week.length)
    return num(data.spark_week[data.spark_week.length - 1])
  return null
}

function round(x, d) {
  const f = Math.pow(10, d)
  return Math.round(x * f) / f
}

function money(n, digits = 0) {
  n = num(n)
  if (n === null) return "\u2014"
  n = round(n, digits)
  const sign = n < 0 ? "\u2212" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function signedMoney(n) {
  n = num(n)
  if (n === null) return "\u2014"
  n = round(n, 0)
  const sign = n > 0 ? "+" : n < 0 ? "\u2212" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })
}

function statusColor(status, available) {
  const s = String(status || "").toLowerCase()
  if (s.includes("save") || available < 0) return new Color("#FF453A")
  if (s.includes("spend") || available > 0) return new Color("#34C759")
  return new Color("#FFD60A")
}

function stamp(data) {
  const raw = String(data.as_of || "")
  const t = String(data.as_of_time || "")
  if (/\d{1,2}:\d{2}/.test(raw)) return raw
  const day = raw.replace(/\s+.*/, "")
  if (!day) return "\u2014"
  return (day + "  " + t).trim()
}

function label(col, text, color, size) {
  const t = col.addText(text)
  t.font = Font.boldSystemFont(size || 10)
  t.textColor = color
  t.textOpacity = 0.9
  return t
}

function bigFont(size) {
  try { return new Font("Menlo-Bold", size) }
  catch (e) { return Font.boldSystemFont(size) }
}

function dashH(dc, x1, x2, y, color, dash, gap, width) {
  dc.setStrokeColor(color)
  dc.setLineWidth(width)
  let x = x1
  while (x < x2) {
    const p = new Path()
    p.move(new Point(x, y))
    p.addLine(new Point(Math.min(x + dash, x2), y))
    dc.addPath(p)
    dc.strokePath()
    x += dash + gap
  }
}

function dayLabels(data, n) {
  const letters = ["S", "M", "T", "W", "T", "F", "S"]
  const m = String(data.as_of || "").match(/(\d{4})-(\d{2})-(\d{2})/)
  const end = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date()
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i)
    out.push(letters[d.getDay()])
  }
  return out
}

function sparkImage(data, accent) {
  const width = CHART_W * 2
  const height = CHART_H * 2
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.opaque = true
  dc.respectScreenScale = false
  dc.setFillColor(BG)
  dc.fillRect(new Rect(0, 0, width, height))

  let daily = Array.isArray(data.spark_week) && data.spark_week.length
    ? data.spark_week.map((v) => num(v) || 0)
    : [usedToday(data) || 0]
  while (daily.length < 7) daily.unshift(0)
  if (daily.length > 7) daily = daily.slice(-7)

  const base = num(data.nominal_spend)
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length
  const maxY = Math.max(base || 0, avg, ...daily, 1) * 1.15
  const padL = 4, padR = 34, padT = 18, padB = 20
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = 7
  const slot = plotW / n
  const bw = slot * 0.55

  function Y(v) { return padT + plotH * (1 - Math.max(0, v) / maxY) }

  dc.setTextColor(new Color("#8E8E93"))
  dc.setFont(Font.boldSystemFont(13))
  dc.drawText("7D USED vs BASE", new Point(padL, 1))

  if (base !== null) dashH(dc, padL, width - padR, Y(base), new Color("#8E8E93", 0.7), 5, 5, 2)
  dashH(dc, padL, width - padR, Y(avg), accent, 4, 6, 2)

  const labelX = width - padR + 2
  dc.setTextColor(accent)
  dc.setFont(Font.boldSystemFont(11))
  dc.drawText("AVG", new Point(labelX, Y(avg) - 6))
  if (base !== null && Math.abs(base - avg) >= 8) {
    dc.setTextColor(new Color("#8E8E93"))
    dc.setFont(Font.boldSystemFont(11))
    dc.drawText("BASE", new Point(labelX, Y(base) - 6))
  }

  const days = dayLabels(data, n)
  const floorY = padT + plotH
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, daily[i])
    const x = padL + slot * i + (slot - bw) / 2
    const top = Y(v)
    dc.setFillColor(base === null ? new Color("#8E8E93") : v > base + 0.5 ? new Color("#FF453A") : new Color("#34C759"))
    dc.fillRect(new Rect(x, top, bw, Math.max(3, floorY - top)))
    dc.setTextColor(new Color("#8E8E93"))
    dc.setFont(Font.boldSystemFont(12))
    dc.drawText(days[i], new Point(x + bw / 2 - 4, height - 16))
  }
  return dc.getImage()
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(12, 16, 10, 14)
  w.url = data.grok_url || GROK_URL

  const avail = num(data.available_spend)
  const today = num(data.available_today)
  const tag = freshTag(data)
  const tagCol = tagColor(data)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const muted = new Color("#8E8E93")
  const ink = Color.white()
  const when = stamp(data)
  const controlShow = num(data.control_avg)
  const floorShow = num(data.floor)
  const used = usedToday(data)

  if (family === "small") {
    label(w, "AVAILABLE (RUNNING)", accent, 10)
    w.addSpacer(4)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    if (today !== null) {
      w.addSpacer(2)
      const td = label(w, "TODAY " + signedMoney(today), round(today, 0) < 0 ? new Color("#FF453A") : new Color("#34C759"), 11)
      td.lineLimit = 1
    }
    w.addSpacer()
    if (tag) {
      const tg = label(w, tag, tagCol, 9)
      tg.lineLimit = 1
      tg.minimumScaleFactor = 0.7
    }
    const ao = label(w, "AS OF  " + when, new Color("#636366"), 9)
    ao.lineLimit = 1
    ao.minimumScaleFactor = 0.7
    return w
  }

  const row = w.addStack()
  row.layoutHorizontally()
  row.topAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  left.size = new Size(0, CHART_H)
  const head = left.addText("AVAILABLE (RUNNING)")
  head.font = Font.boldSystemFont(10)
  head.textColor = accent
  left.addSpacer(today !== null ? 2 : 4)
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  if (today !== null) {
    const td = left.addText("TODAY " + signedMoney(today))
    td.font = Font.boldSystemFont(10)
    td.textColor = round(today, 0) < 0 ? new Color("#FF453A") : new Color("#34C759")
    td.lineLimit = 1
  }
  left.addSpacer()
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "   USED  " + money(used))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted
  sub.lineLimit = 1

  if (!data._nodata) {
    row.addSpacer(8)

    const im = row.addImage(sparkImage(data, accent))
    im.imageSize = new Size(CHART_W, CHART_H)
    im.resizable = true
    try { im.applyFittingContentMode() } catch (e) {}
  }

  w.addSpacer(12)

  const meta = w.addStack()
  meta.layoutHorizontally()
  meta.centerAlignContent()
  function perDay(v) { return num(v) === null ? "\u2014" : money(v) + " / D" }
  const pills = [
    ["INCOME", perDay(data.daily_income)],
    ["FIXED", perDay(data.daily_fixed)],
    ["RESERVE", perDay(data.daily_path)],
    ["CASH 30D", money(controlShow)],
    ["TARGET", money(floorShow)],
  ]
  pills.forEach((pair, i) => {
    const s = meta.addStack()
    s.layoutVertically()
    const l = s.addText(pair[0])
    l.font = Font.boldSystemFont(9)
    l.textColor = muted
    const val = s.addText(pair[1])
    val.font = Font.mediumSystemFont(12)
    val.textColor = ink
    if (i < pills.length - 1) meta.addSpacer()
  })

  w.addSpacer(8)
  const foot = w.addStack()
  foot.layoutHorizontally()
  foot.centerAlignContent()
  label(foot, "AS OF  " + when, new Color("#636366"), 9)
  if (tag) {
    foot.addSpacer()
    const tg = label(foot, tag, tagCol, 9)
    tg.lineLimit = 1
  }
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
