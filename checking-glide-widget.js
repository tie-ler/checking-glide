// Checking Glide — Scriptable widget
// Hero = dollars you may spend (or must save) TODAY.
// Support = daily income = how much available rises tomorrow if you spend $0 disc.
// Home Screen → + → Scriptable → this script.

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

function addHeader(col, title, color) {
  const t = col.addText(title)
  t.font = Font.boldSystemFont(11)
  t.textColor = color
  t.textOpacity = 0.9
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

  if (family === "small") {
    addHeader(w, verb, accent)
    w.addSpacer(6)
    const big = w.addText(signedMoney(avail))
    big.font = bigFont(28)
    big.textColor = accent
    const sub = w.addText("income " + money(data.daily_income) + "/d")
    sub.font = Font.systemFont(12)
    sub.textColor = Color.gray()
    w.addSpacer()
    const foot = w.addText(money(data.control) + "  floor $8k")
    foot.font = Font.systemFont(11)
    foot.textColor = Color.gray()
    return w
  }

  addHeader(w, verb, accent)
  w.addSpacer(8)

  const row = w.addStack()
  row.layoutHorizontally()
  row.centerAlignContent()

  const left = row.addStack()
  left.layoutVertically()
  const delta = left.addText(signedMoney(avail))
  delta.font = bigFont(32)
  delta.textColor = accent
  const pct = left.addText("nominal " + money(data.nominal_spend) + "  \u2212  disc " + money(data.disc_mtd))
  pct.font = Font.systemFont(12)
  pct.textColor = Color.gray()

  row.addSpacer()

  const right = row.addStack()
  right.layoutVertically()
  const incL = right.addText("DAILY INCOME")
  incL.font = Font.systemFont(10)
  incL.textColor = Color.gray()
  incL.rightAlignText()
  const inc = right.addText(money(data.daily_income) + "/d")
  inc.font = Font.boldSystemFont(16)
  inc.textColor = Color.white()
  inc.rightAlignText()
  const hint = right.addText("hero + this if $0 disc")
  hint.font = Font.systemFont(10)
  hint.textColor = Color.gray()
  hint.rightAlignText()

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
  pill("FIXED", money(data.daily_fixed) + "/d")
  pill("PATH", money(data.daily_path) + "/d")
  pill("CONTROL", money(data.control))
  pill("FLOOR", money(data.floor))

  w.addSpacer()
  const asof = w.addText("as of " + (data.as_of || "") + "  \u00b7  tap \u2192 Grok")
  asof.font = Font.systemFont(10)
  asof.textColor = new Color("#636366")
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
