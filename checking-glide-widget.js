// Checking Glide — Scriptable widget
// Hero = dollars you may spend (or must save) TODAY.
// Support = daily income.

const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"

const FALLBACK = {
  as_of: "2026-09-02",
  available_spend: 10.36,
  daily_income: 181.04,
  daily_fixed: 102.02,
  daily_path: 24.39,
  nominal_spend: 54.63,
  disc_mtd: 44.27,
  status: "Spend",
  control: 5048.50,
  floor: 8000,
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

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = new Color("#0B0B0F")
  w.setPadding(14, 16, 14, 16)
  w.url = data.grok_url || GROK_URL

  const avail = Number(data.available_spend)
  const family = config.widgetFamily || "medium"
  const accent = statusColor(data.status, avail)
  const verb = avail < 0 ? "SAVE TODAY" : avail === 0 ? "FLAT" : "SPEND TODAY"
  const muted = new Color("#8E8E93")

  if (family === "small") {
    label(w, verb, accent, 11)
    w.addSpacer(6)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    label(w, "INCOME  " + money(data.daily_income) + " / DAY", muted, 11)
    w.addSpacer()
    label(w, money(data.control) + "   FLOOR  " + money(data.floor), muted, 10)
    return w
  }

  label(w, verb, accent, 11)
  w.addSpacer(8)

  const row = w.addStack()
  row.layoutHorizontally()
  row.topAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  const sub = left.addText("BASE  " + money(data.nominal_spend) + "    USED  " + money(data.disc_mtd))
  sub.font = Font.mediumSystemFont(11)
  sub.textColor = muted

  row.addSpacer()

  const right = row.addStack()
  right.layoutVertically()
  label(right, "INCOME", muted, 10, true)
  const inc = right.addText(money(data.daily_income) + " / DAY")
  inc.font = Font.boldSystemFont(15)
  inc.textColor = Color.white()
  inc.rightAlignText()
  label(right, "IF NO SPEND", muted, 10, true)

  w.addSpacer(12)

  const meta = w.addStack()
  meta.layoutHorizontally()
  function pill(k, v) {
    const s = meta.addStack()
    s.layoutVertically()
    const l = s.addText(k)
    l.font = Font.boldSystemFont(10)
    l.textColor = muted
    const val = s.addText(v)
    val.font = Font.mediumSystemFont(13)
    val.textColor = Color.white()
    meta.addSpacer(16)
  }
  pill("FIXED", money(data.daily_fixed) + " / D")
  pill("PATH", money(data.daily_path) + " / D")
  pill("CONTROL", money(data.control))
  pill("FLOOR", money(data.floor))

  w.addSpacer()
  label(w, "AS OF  " + (data.as_of || "") + "    TAP FOR BREAKDOWN", new Color("#636366"), 10)
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
