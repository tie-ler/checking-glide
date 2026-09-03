// Checking Glide — Drip widget (Rev 17)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/glide.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const INK = Color.white()
const MUTED = new Color("#8E8E93")
const RED = new Color("#FF453A")
const GREEN = new Color("#34C759")

const FALLBACK = {
  as_of: "2026-09-03",
  as_of_time: "7:20 AM",
  daily_fixed: 116.03,
  used_today: 5.56,
  daily_gas: 4.94,
  gas_90d_rate: 8.51,
  gas_overrun_drip: 3.57,
  daily_grocery: 5.97,
  grocery_90d_rate: 7.96,
  grocery_overrun_drip: 1.99,
  pharmacy_365_rate: 0.89,
  pharmacy_90d_rate: 0.59,
  pharmacy_overrun_drip: 0,
  f_rent: 48.14,
  f_moneyline: 30.11,
  f_upgrade: 9.91,
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

function n(v) { return Number(v) || 0 }

function money(x, digits = 2) {
  return "$" + Math.abs(x).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function stamp(data) {
  const day = String(data.as_of || "").replace(/\s+.*/, "")
  const t = String(data.as_of_time || "")
  return (day || "") + (t ? "  " + t : "")
}

function addHeader(col, text, color, size) {
  const t = col.addText(text)
  t.font = Font.boldSystemFont(size || 10)
  t.textColor = color
  return t
}

function row(stack, label, plan, actual, drip) {
  const r = stack.addStack()
  r.layoutHorizontally()
  r.centerAlignContent()

  const name = r.addText(label)
  name.font = Font.boldSystemFont(11)
  name.textColor = INK
  name.lineLimit = 1

  r.addSpacer()

  const p = r.addText(money(plan))
  p.font = Font.mediumSystemFont(11)
  p.textColor = MUTED
  p.rightAlignText()

  r.addSpacer(10)

  const a = r.addText(money(actual))
  a.font = Font.mediumSystemFont(11)
  a.textColor = INK
  a.rightAlignText()

  r.addSpacer(10)

  const hot = drip > 0.004
  const d = r.addText((hot ? "+" : "") + money(drip))
  d.font = Font.boldSystemFont(12)
  d.textColor = hot ? RED : GREEN
  d.rightAlignText()
}

function colHead(stack) {
  const r = stack.addStack()
  r.layoutHorizontally()
  const l = r.addText(" ")
  l.font = Font.boldSystemFont(9)
  l.textColor = MUTED
  r.addSpacer()
  function h(s) {
    const t = r.addText(s)
    t.font = Font.boldSystemFont(9)
    t.textColor = MUTED
    r.addSpacer(10)
    return t
  }
  h("365")
  h("90")
  const d = r.addText("DRIP")
  d.font = Font.boldSystemFont(9)
  d.textColor = MUTED
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(12, 16, 10, 14)
  w.url = data.grok_url || GROK_URL

  const gasP = n(data.daily_gas != null ? data.daily_gas : data.f_gas)
  const gasA = n(data.gas_90d_rate)
  const gasD = n(data.gas_overrun_drip)
  const groP = n(data.daily_grocery != null ? data.daily_grocery : data.f_grocery)
  const groA = n(data.grocery_90d_rate)
  const groD = n(data.grocery_overrun_drip)
  const phP = n(data.pharmacy_365_rate != null ? data.pharmacy_365_rate : data.f_pharmacy)
  const phA = n(data.pharmacy_90d_rate)
  const phD = n(data.pharmacy_overrun_drip)
  const dripSum = gasD + groD + phD

  addHeader(w, "DRIP   90 vs 365", MUTED, 10)
  w.addSpacer(2)
  const big = w.addText((dripSum > 0 ? "+" : "") + money(dripSum, 2) + "  / D")
  big.font = Font.boldSystemFont(26)
  big.textColor = dripSum > 0.004 ? RED : GREEN

  w.addSpacer(8)
  colHead(w)
  w.addSpacer(4)
  row(w, "GAS", gasP, gasA, gasD)
  w.addSpacer(5)
  row(w, "GROCERY", groP, groA, groD)
  w.addSpacer(5)
  row(w, "PHARMACY", phP, phA, phD)

  w.addSpacer(8)
  const foot = w.addText("F  " + money(n(data.daily_fixed), 0) + " / D     USED  " + money(n(data.used_today), 0))
  foot.font = Font.mediumSystemFont(11)
  foot.textColor = MUTED

  w.addSpacer(6)
  const when = w.addText("AS OF  " + stamp(data))
  when.font = Font.boldSystemFont(9)
  when.textColor = new Color("#636366")
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
