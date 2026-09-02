// Checking Glide — Scriptable widget
// Medium = main. Small = status + Δ only.
// Home Screen → + → Scriptable → this script.

const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"
const CLIMB = 4651.50

const FALLBACK = {
  as_of: "2026-09-02",
  control: 5348.50,
  target: 5386.94,
  delta_usd: -38.44,
  delta_pct: -0.8,
  status: "Behind",
  eoy_gap: 4651.50,
  need_per_day: 38.44,
  chase_buffer: 1140.47,
  cards: 539.72,
}

async function loadData() {
  if (!JSON_URL || JSON_URL.includes("PASTE_")) return FALLBACK
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
  const sign = n < 0 ? "-" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function signedMoney(n) {
  const sign = n > 0 ? "+" : n < 0 ? "−" : ""
  return sign + "$" + Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })
}

function statusColor(status) {
  const s = String(status || "").toLowerCase()
  if (s.includes("ahead")) return new Color("#34C759")
  if (s.includes("behind")) return new Color("#FF453A")
  return new Color("#FFD60A")
}

function addHeader(col, title, color) {
  const t = col.addText(title)
  t.font = Font.boldSystemFont(11)
  t.textColor = color
  t.textOpacity = 0.9
}

function bigFont(size) {
  try {
    return new Font("Menlo-Bold", size)
  } catch (e) {
    return Font.boldSystemFont(size)
  }
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = new Color("#0B0B0F")
  w.setPadding(14, 16, 14, 16)
  w.url = data.grok_url || GROK_URL

  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status)
  const ahead = (data.delta_usd || 0) >= 0

  if (family === "small") {
    addHeader(w, "CHECKING GLIDE", accent)
    w.addSpacer(6)
    const big = w.addText(signedMoney(data.delta_usd))
    big.font = bigFont(28)
    big.textColor = accent
    const sub = w.addText(data.status + "  " + (data.delta_pct >= 0 ? "+" : "") + Number(data.delta_pct).toFixed(1) + "%")
    sub.font = Font.systemFont(12)
    sub.textColor = Color.gray()
    w.addSpacer()
    const foot = w.addText(money(data.control) + " → $10k")
    foot.font = Font.systemFont(11)
    foot.textColor = Color.gray()
    return w
  }

  addHeader(w, "EOY $10K  ·  X MONEY", accent)
  w.addSpacer(8)

  const row = w.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const delta = left.addText(signedMoney(data.delta_usd))
  delta.font = bigFont(32)
  delta.textColor = accent
  const pct = left.addText(
    (ahead ? "ahead" : "behind") + "  " +
    (data.delta_pct >= 0 ? "+" : "") +
    Number(data.delta_pct).toFixed(1) + "% of climb"
  )
  pct.font = Font.systemFont(12)
  pct.textColor = Color.gray()

  row.addSpacer()

  const right = row.addStack()
  right.layoutVertically()
  right.centerAlignContent()
  const st = right.addText(String(data.status).toUpperCase())
  st.font = Font.boldSystemFont(13)
  st.textColor = accent
  st.rightAlignText()
  const need = right.addText(money(data.need_per_day) + "/day")
  need.font = Font.systemFont(12)
  need.textColor = Color.gray()
  need.rightAlignText()

  w.addSpacer(12)

  const meta = w.addStack()
  meta.layoutHorizontally()
  function pill(label, value) {
    const s = meta.addStack()
    s.layoutVertically()
    const l = s.addText(label)
    l.font = Font.systemFont(10)
    l.textColor = Color.gray()
    const v = s.addText(value)
    v.font = Font.mediumSystemFont(13)
    v.textColor = Color.white()
    meta.addSpacer(14)
  }
  pill("CONTROL", money(data.control))
  pill("TARGET", money(data.target))
  pill("EOY GAP", money(data.eoy_gap))
  if (data.chase_buffer != null) pill("CHASE", money(data.chase_buffer))

  w.addSpacer()
  const asof = w.addText("as of " + (data.as_of || "") + "  ·  tap → Grok")
  asof.font = Font.systemFont(10)
  asof.textColor = new Color("#636366")
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  await widget.presentMedium()
}
Script.complete()
