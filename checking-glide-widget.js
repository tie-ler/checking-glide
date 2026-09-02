// Checking Glide — Scriptable widget (Rev 2 UI)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"

const FALLBACK = {
  as_of: "2026-09-02 17:27",
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

function label(col, text, color, size, alignRight) {
  const t = col.addText(text)
  t.font = Font.boldSystemFont(size || 10)
  t.textColor = color
  t.textOpacity = 0.85
  if (alignRight) t.rightAlignText()
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
  const maxY = Math.max(base, ...cum, 1) * 1.15
  const padL = 4, padR = 4, padT = 16, padB = 4
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const n = Math.max(cum.length, 2)

  function X(i) { return padL + (i / (n - 1)) * plotW }
  function Y(v) { return padT + plotH - (v / maxY) * plotH }

  dc.setStrokeColor(new Color("#34C759", 0.55))
  dc.setLineWidth(1)
  const basePath = new Path()
  basePath.move(new Point(padL, Y(base)))
  basePath.addLine(new Point(width - padR, Y(base)))
  dc.addPath(basePath)
  dc.strokePath()

  dc.setFillColor(new Color("#FF453A", 0.22))
  for (let i = 0; i < daily.length; i++) {
    const x0 = X(i)
    const x1 = X(Math.min(i + 1, n - 1))
    const bw = Math.max(6, (x1 - x0) * 0.55)
    const h = (daily[i] / maxY) * plotH
    dc.fillRect(new Rect(x0 - bw / 2, Y(daily[i]), bw, h))
  }

  dc.setStrokeColor(new Color("#EDE9DE"))
  dc.setLineWidth(2)
  const line = new Path()
  line.move(new Point(X(0), Y(cum[0])))
  for (let i = 1; i < cum.length; i++) line.addLine(new Point(X(i), Y(cum[i])))
  dc.addPath(line)
  dc.strokePath()

  dc.setTextColor(new Color("#8E8E93"))
  dc.setFont(Font.boldSystemFont(8))
  dc.drawText("USED vs BASE", new Point(padL, 1))

  return dc.getImage()
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = new Color("#0B0B0F")
  w.setPadding(12, 14, 10, 14)
  w.url = data.grok_url || GROK_URL

  const avail = Number(data.available_spend)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const verb = avail < 0 ? "SAVE TODAY" : avail === 0 ? "FLAT" : "SPEND TODAY"
  const muted = new Color("#8E8E93")
  const ink = Color.white()

  if (family === "small") {
    label(w, "AVAILABLE SPEND", muted, 10)
    w.addSpacer(4)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    label(w, verb, muted, 10)
    w.addSpacer()
    label(w, data.as_of || "", new Color("#636366"), 9)
    return w
  }

  label(w, "AVAILABLE SPEND", muted, 10)
  w.addSpacer(4)

  const row = w.addStack()
  row.layoutHorizontally()
  row.topAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  const verbT = left.addText(verb)
  verbT.font = Font.boldSystemFont(11)
  verbT.textColor = muted
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "    USED  " + money(data.disc_mtd))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted

  row.addSpacer(10)

  const right = row.addStack()
  right.layoutVertically()
  const img = sparkImage(data, 280, 120)
  const im = right.addImage(img)
  im.imageSize = new Size(140, 60)
  im.resizable = true

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
  pill("CONTROL", money(data.control))
  pill("FLOOR", money(data.floor))

  w.addSpacer(6)
  label(w, "AS OF  " + (data.as_of || ""), new Color("#636366"), 9)
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
