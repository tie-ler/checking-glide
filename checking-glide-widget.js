// Checking Glide — Scriptable widget (Rev 5)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")

const FALLBACK = {
  as_of: "2026-09-02",
  as_of_time: "6:10 PM",
  available_spend: 0.36,
  daily_income: 181.04,
  daily_fixed: 102.02,
  daily_path: 24.39,
  nominal_spend: 54.63,
  disc_mtd: 54.27,
  status: "Spend",
  control: 5048.50,
  control_avg: 2928.44,
  floor: 10000,
  spark_week: [0, 89.69, 0, 102.35, 40.33, 13.24, 41.03],
  grok_url: GROK_URL,
}

async function loadData() {
  try {
    const req = new Request(JSON_URL)
    req.timeoutInterval = 8
    const d = await req.loadJSON()
    return { ...FALLBACK, ...d }
  } catch (e) {
    return FALLBACK
  }
}

function money(n, digits = 0) {
  const sign = n < 0 ? "\u2212" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function signedMoney(n) {
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

function clockNow() {
  const d = new Date()
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, "0")
  const ap = h >= 12 ? "PM" : "AM"
  h = h % 12
  if (h === 0) h = 12
  return h + ":" + m + " " + ap
}

function stamp(data) {
  const raw = String(data.as_of || "")
  const t = String(data.as_of_time || "")
  if (/\d{1,2}:\d{2}/.test(raw)) return raw
  const day = raw.replace(/\s+.*/, "") || new Date().toISOString().slice(0, 10)
  return day + "  " + (t || clockNow())
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

function sparkImage(data) {
  const width = 140
  const height = 64
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.opaque = true
  dc.respectScreenScale = false
  dc.setFillColor(BG)
  dc.fillRect(new Rect(0, 0, width, height))

  let daily = Array.isArray(data.spark_week) && data.spark_week.length
    ? data.spark_week.map(Number)
    : [Number(data.disc_mtd) || 0]
  while (daily.length < 7) daily.unshift(0)
  if (daily.length > 7) daily = daily.slice(-7)

  const base = Number(data.nominal_spend) || 55
  const maxY = Math.max(base, ...daily, 1) * 1.12
  const padL = 4, padR = 4, padT = 12, padB = 11
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = 7
  const slot = plotW / n
  const bw = slot * 0.58

  function Y(v) { return padT + plotH * (1 - Math.max(0, v) / maxY) }

  dc.setTextColor(new Color("#8E8E93"))
  dc.setFont(Font.boldSystemFont(7))
  dc.drawText("7D USED vs BASE", new Point(padL, 0))

  dc.setStrokeColor(new Color("#34C759", 0.8))
  dc.setLineWidth(1)
  const basePath = new Path()
  basePath.move(new Point(padL, Y(base)))
  basePath.addLine(new Point(width - padR, Y(base)))
  dc.addPath(basePath)
  dc.strokePath()

  const days = ["T", "F", "S", "S", "M", "T", "W"]
  const floorY = padT + plotH
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, daily[i])
    const x = padL + slot * i + (slot - bw) / 2
    const top = Y(v)
    dc.setFillColor(v > base + 0.5 ? new Color("#FF453A") : new Color("#34C759"))
    dc.fillRect(new Rect(x, top, bw, Math.max(1.5, floorY - top)))
    dc.setTextColor(new Color("#8E8E93"))
    dc.setFont(Font.boldSystemFont(7))
    dc.drawText(days[i], new Point(x + bw / 2 - 2, height - 9))
  }
  return dc.getImage()
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(12, 16, 10, 16)
  w.url = data.grok_url || GROK_URL

  const avail = Number(data.available_spend)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const muted = new Color("#8E8E93")
  const ink = Color.white()
  const when = stamp(data)
  const controlShow = Number(data.control_avg != null ? data.control_avg : data.control)
  const floorShow = Number(data.floor != null ? data.floor : 10000)

  if (family === "small") {
    label(w, "AVAILABLE SPEND", accent, 10)
    w.addSpacer(4)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    w.addSpacer()
    label(w, "AS OF  " + when, new Color("#636366"), 9)
    return w
  }

  label(w, "AVAILABLE SPEND", accent, 10)
  w.addSpacer(4)

  const row = w.addStack()
  row.layoutHorizontally()
  row.bottomAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "    USED  " + money(data.disc_mtd))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted
  sub.lineLimit = 1

  row.addSpacer()

  const im = row.addImage(sparkImage(data))
  im.imageSize = new Size(140, 64)
  im.resizable = false
  im.containerRelativeShape = false

  w.addSpacer(10)

  const meta = w.addStack()
  meta.layoutHorizontally()
  function pill(k, v) {
    const s = meta.addStack()
    s.layoutVertically()
    const l = s.addText(k)
    l.font = Font.boldSystemFont(9)
    l.textColor = muted
    const val = s.addText(v)
    val.font = Font.mediumSystemFont(12)
    val.textColor = ink
    meta.addSpacer(12)
  }
  pill("INCOME", money(data.daily_income) + " / D")
  pill("FIXED", money(data.daily_fixed) + " / D")
  pill("PATH", money(data.daily_path) + " / D")
  pill("CONTROL", money(controlShow))
  pill("TARGET", money(floorShow))

  w.addSpacer(6)
  label(w, "AS OF  " + when, new Color("#636366"), 9)
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
