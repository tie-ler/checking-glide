// Checking Glide — Drip widget (Rev 17)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/spend.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const INK = Color.white()
const MUTED = new Color("#8E8E93")
const RED = new Color("#FF453A")
const GREEN = new Color("#34C759")

const FALLBACK = {
  as_of: "2026-09-03",
  as_of_time: "7:26 AM",
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
  grok_url: GROK_URL,
}

async function loadData() {
  try {
    const req = new Request(JSON_URL)
    req.timeoutInterval = 8
    return { ...FALLBACK, ...(await req.loadJSON()) }
  } catch (e) {
    return FALLBACK
  }
}

function n(v) { return Number(v) || 0 }
function money(x, d = 2) {
  return "$" + Math.abs(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(10, 14, 8, 12)
  w.url = data.grok_url || GROK_URL

  const rows = [
    ["GAS", n(data.daily_gas), n(data.gas_90d_rate), n(data.gas_overrun_drip)],
    ["GROCERY", n(data.daily_grocery), n(data.grocery_90d_rate), n(data.grocery_overrun_drip)],
    ["PHARMACY", n(data.pharmacy_365_rate != null ? data.pharmacy_365_rate : data.f_pharmacy), n(data.pharmacy_90d_rate), n(data.pharmacy_overrun_drip)],
  ]
  const dripSum = rows.reduce((s, r) => s + r[3], 0)

  const title = w.addText("DRIP    90 vs 365")
  title.font = Font.boldSystemFont(9)
  title.textColor = MUTED
  w.addSpacer(2)
  const big = w.addText((dripSum > 0 ? "+" : "") + money(dripSum, 2) + "  / D")
  big.font = Font.boldSystemFont(22)
  big.textColor = dripSum > 0.004 ? RED : GREEN

  w.addSpacer(6)
  const head = w.addStack()
  head.layoutHorizontally()
  const h0 = head.addText(" ")
  h0.font = Font.boldSystemFont(8)
  head.addSpacer()
  ;["365", "90", "DRIP"].forEach((s, i) => {
    const t = head.addText(s)
    t.font = Font.boldSystemFont(8)
    t.textColor = MUTED
    if (i < 2) head.addSpacer(12)
  })

  rows.forEach((item) => {
    w.addSpacer(4)
    const r = w.addStack()
    r.layoutHorizontally()
    r.centerAlignContent()
    const name = r.addText(item[0])
    name.font = Font.boldSystemFont(10)
    name.textColor = INK
    r.addSpacer()
    const p = r.addText(money(item[1]))
    p.font = Font.mediumSystemFont(10)
    p.textColor = MUTED
    r.addSpacer(12)
    const a = r.addText(money(item[2]))
    a.font = Font.mediumSystemFont(10)
    a.textColor = INK
    r.addSpacer(12)
    const hot = item[3] > 0.004
    const d = r.addText((hot ? "+" : "") + money(item[3]))
    d.font = Font.boldSystemFont(11)
    d.textColor = hot ? RED : GREEN
  })

  w.addSpacer(6)
  const foot = w.addText("F  " + money(n(data.daily_fixed), 0) + " / D      USED  " + money(n(data.used_today), 0))
  foot.font = Font.mediumSystemFont(10)
  foot.textColor = MUTED
  w.addSpacer(3)
  const when = w.addText("AS OF  " + String(data.as_of || "") + "  " + String(data.as_of_time || ""))
  when.font = Font.boldSystemFont(8)
  when.textColor = new Color("#636366")
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
