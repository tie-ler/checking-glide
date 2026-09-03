// Checking Glide — Scriptable widget (Rev 12)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const CHART_W = 172
const CHART_H = 78

const FALLBACK = {
  as_of: "2026-09-02",
  as_of_time: "9:52 PM",
  available_spend: 12.51,
  daily_income: 176.07,
  daily_fixed: 95.32,
  daily_path: 27.21,
  nominal_spend: 53.54,
  used_today: 41.03,
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

function usedToday(data) {
  if (data.used_today != null) return Number(data.used_today)
  if (Array.isArray(data.spark_week) && data.spark_week.length)
    return Number(data.spark_week[data.spark_week.length - 1]) || 0
  return Number(data.disc_mtd) || 0
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
    ? data.spark_week.map(Number)
    : [usedToday(data)]
  while (daily.length < 7) daily.unshift(0)
  if (daily.length > 7) daily = daily.slice(-7)

  const base = Number(data.nominal_spend) || 55
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length
  const maxY = Math.max(base, avg, ...daily, 1) * 1.15
  const padL = 4, padR = 26, padT = 18, padB = 20
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = 7
  const slot = plotW / n
  const bw = slot * 0.55

  function Y(v) { return padT + plotH * (1 - Math.max(0, v) / maxY) }

  dc.setTextColor(new Color("#8E8E93"))
  dc.setFont(Font.boldSystemFont(13))
  dc.drawText("7D USED vs BASE", new Point(padL, 1))

  dashH(dc, padL, width - padR, Y(base), new Color("#8E8E93", 0.7), 5, 5, 2)
  dashH(dc, padL, width - padR, Y(avg), accent, 4, 6, 2)

  dc.setTextColor(accent)
  dc.setFont(Font.boldSystemFont(11))
  dc.drawText("AVG", new Point(width - padR + 2, Y(avg) - 6))

  const days = ["T", "F", "S", "S", "M", "T", "W"]
  const floorY = padT + plotH
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, daily[i])
    const x = padL + slot * i + (slot - bw) / 2
    const top = Y(v)
    dc.setFillColor(v > base + 0.5 ? new Color("#FF453A") : new Color("#34C759"))
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

  const avail = Number(data.available_spend)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const muted = new Color("#8E8E93")
  const ink = Color.white()
  const when = stamp(data)
  const controlShow = Number(data.control_avg != null ? data.control_avg : data.control)
  const floorShow = Number(data.floor != null ? data.floor : 10000)
  const used = usedToday(data)

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

  const row = w.addStack()
  row.layoutHorizontally()
  row.topAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const head = left.addText("AVAILABLE SPEND")
  head.font = Font.boldSystemFont(10)
  head.textColor = accent
  left.addSpacer(4)
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  left.addSpacer()
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "   USED  " + money(used))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted
  sub.lineLimit = 1

  row.addSpacer(8)

  const im = row.addImage(sparkImage(data, accent))
  im.imageSize = new Size(CHART_W, CHART_H)
  im.resizable = true
  try { im.applyFittingContentMode() } catch (e) {}

  w.addSpacer(12)

  const meta = w.addStack()
  meta.layoutHorizontally()
  meta.centerAlignContent()
  const pills = [
    ["INCOME", money(data.daily_income) + " / D"],
    ["FIXED", money(data.daily_fixed) + " / D"],
    ["RESERVE", money(data.daily_path) + " / D"],
    ["CASH", money(controlShow)],
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
  label(w, "AS OF  " + when, new Color("#636366"), 9)
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
