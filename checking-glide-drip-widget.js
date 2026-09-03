// Checking Glide — Drip widget (Rev 18)
const JSON_URL = "https://raw.githubusercontent.com/tie-ler/checking-glide/main/spend.json"
const GROK_URL = "https://grok.com"
const BG = new Color("#0B0B0F")
const INK = Color.white()
const MUTED = new Color("#8E8E93")
const RED = new Color("#FF453A")
const GREEN = new Color("#34C759")
const COL = 58

const FALLBACK = {
  as_of: "2026-09-03",
  as_of_time: "7:31 AM",
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
  return "$" + Math.abs(x).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

function cell(row, text, color, bold, size) {
  const s = row.addStack()
  s.size = new Size(COL, 16)
  s.layoutHorizontally()
  s.addSpacer()
  const t = s.addText(text)
  t.font = bold ? Font.boldSystemFont(size) : Font.mediumSystemFont(size)
  t.textColor = color
  t.rightAlignText()
  t.lineLimit = 1
}

function line(parent, label, plan, actual, drip) {
  const r = parent.addStack()
  r.layoutHorizontally()
  r.centerAlignContent()
  const name = r.addText(label)
  name.font = Font.boldSystemFont(11)
  name.textColor = INK
  name.lineLimit = 1
  r.addSpacer()
  cell(r, money(plan), MUTED, false, 11)
  cell(r, money(actual), INK, false, 11)
  const hot = drip > 0.004
  cell(r, (hot ? "+" : "") + money(drip), hot ? RED : GREEN, true, 11)
}

async function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(12, 16, 12, 14)
  w.url = data.grok_url || GROK_URL

  const rows = [
    ["GAS", n(data.daily_gas), n(data.gas_90d_rate), n(data.gas_overrun_drip)],
    ["GROCERY", n(data.daily_grocery), n(data.grocery_90d_rate), n(data.grocery_overrun_drip)],
    ["PHARMACY", n(data.pharmacy_365_rate != null ? data.pharmacy_365_rate : data.f_pharmacy), n(data.pharmacy_90d_rate), n(data.pharmacy_overrun_drip)],
  ]
  const dripSum = rows.reduce((s, r) => s + r[3], 0)

  const title = w.addText("DRIP    90 vs 365")
  title.font = Font.boldSystemFont(10)
  title.textColor = MUTED
  w.addSpacer(2)
  const big = w.addText((dripSum > 0 ? "+" : "") + money(dripSum, 2) + "  / D")
  big.font = Font.boldSystemFont(24)
  big.textColor = dripSum > 0.004 ? RED : GREEN

  w.addSpacer(8)
  const head = w.addStack()
  head.layoutHorizontally()
  head.centerAlignContent()
  const spacer = head.addText(" ")
  spacer.font = Font.boldSystemFont(9)
  head.addSpacer()
  cell(head, "365", MUTED, true, 9)
  cell(head, "90", MUTED, true, 9)
  cell(head, "DRIP", MUTED, true, 9)

  rows.forEach((item) => {
    w.addSpacer(5)
    line(w, item[0], item[1], item[2], item[3])
  })

  w.addSpacer()
  const foot = w.addText("F  " + money(n(data.daily_fixed), 0) + " / D      USED  " + money(n(data.used_today), 0))
  foot.font = Font.mediumSystemFont(11)
  foot.textColor = MUTED
  return w
}

const data = await loadData()
const widget = await buildWidget(data)
if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
