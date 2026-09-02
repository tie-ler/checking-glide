// Checking Glide — Scriptable widget (Rev 2 UI)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"

const FALLBACK = {
  as_of: "2026-09-02",
  as_of_time: "5:33 PM",
  available_spend: 0.36,
  daily_income: 181.04,
  daily_fixed: 102.02,
  daily_path: 24.39,
  nominal_spend: 54.63,
  disc_mtd: 54.27,
  status: "Spend",
  control: 5048.50,
  floor: 8000,
  spark_used: [3.24, 51.03],
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
  return t
}

function bigFont(size) {
  try { return new Font("Menlo-Bold", size) }
  catch (e) { return Font.boldSystemFont(size) }
}

function sparkImage(data, width, height) {
  const dc = new DrawContext()
  dc.size = new Size(width, height)
  dc.opaque = false
  dc.respectScreenScale = true

  const daily = Array.isArray(data.spark_used) && data.spark_used.length
    ? data.spark_used.map(Number)
    : [Number(data.disc_mtd) || 0]
  const cum = []
  let run = 0
  for (const v of daily) { run += v; cum.push(run) }
  const base = Number(data.nominal_spend) || 55
  const maxY = Math.max(base, ...cum, 1) * 1.12
  const padL = 8, padR = 6, padT = 18, padB = 6
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = Math.max(cum.length, 2)

  function X(i) { return padL + (i / (n - 1)) * plotW }
  function Y(v) { return padT + plotH - (v / maxY) * plotH }

  dc.setStrokeColor(new Color("#34C759", 0.5))
  dc.setLineWidth(1.5)
  const basePath = new Path()
  basePath.move(new Point(padL, Y(base)))
  basePath.addLine(new Point(width - padR, Y(base)))
  dc.addPath(basePath)
  dc.strokePath()

  dc.setFillColor(new Color("#FF453A", 0.28))
  for (let i = 0; i < daily.length; i++) {
    const x0 = X(i)
    const x1 = X(Math.min(i + 1, n - 1))
    const bw = Math.max(8, (x1 - x0) * 0.5)
    const h = (daily[i] / maxY) * plotH
    dc.fillRect(new Rect(x0 - bw / 2, Y(daily[i]), bw, h))
  }

  dc.setStrokeColor(new Color("#EDE9DE"))
  dc.setLineWidth(2.5)
  const line = new Path()
  line.move(new Point(X(0), Y(cum[0])))
  for (let i = 1; i < cum.length; i++) line.addLine(new Point(X(i), Y(cum[i])))
  dc.addPath(line)
  dc.strokePath()

  dc.setTextColor(new Color("#8E8E93"))
  dc.setFont(Font.boldSystemFont(9))
  dc.drawText("USED vs BASE", new Point(padL, 2))

  return dc.getImage()
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = new Color("#0B0B0F")
  w.setPadding(10, 14, 8, 0)
  w.url = data.grok_url || GROK_URL

  const avail = Number(data.available_spend)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const muted = new Color("#8E8E93")
  const ink = Color.white()
  const when = stamp(data)

  if (family === "small") {
    w.setPadding(12, 14, 10, 14)
    label(w, "AVAILABLE SPEND", accent, 10)
    w.addSpacer(4)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    w.addSpacer()
    label(w, "AS OF  " + when, new Color("#636366"), 9)
    return w
  }

  const top = w.addStack()
  top.layoutHorizontally()
  top.topAlignContent()

  const left = top.addStack()
  left.layoutVertically()
  left.size = new Size(160, 0)
  const head = left.addText("AVAILABLE SPEND")
  head.font = Font.boldSystemFont(11)
  head.textColor = accent
  left.addSpacer(4)
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(34)
  delta.textColor = accent
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "    USED  " + money(data.disc_mtd))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted
  left.addSpacer(6)
  const asof = left.addText("AS OF  " + when)
  asof.font = Font.boldSystemFont(9)
  asof.textColor = new Color("#636366")

  const img = sparkImage(data, 420, 200)
  const im = top.addImage(img)
  im.imageSize = new Size(210, 100)
  im.resizable = true
  im.rightAlignImage()

  w.addSpacer(8)

  const meta = w.addStack()
  meta.layoutHorizontally()
  meta.setPadding(0, 0, 0, 14)
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
  pill("CONTROL", money(data.control))
  pill("FLOOR", money(data.floor))

  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
