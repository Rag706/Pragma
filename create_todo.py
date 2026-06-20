import openpyxl
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, GradientFill
)
from openpyxl.styles.differential import DifferentialStyle
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule, Rule, FormulaRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.series import DataPoint
from datetime import date, timedelta
import random

# ─── Color palette ───────────────────────────────────────────────
C_HEADER_BG   = "2C3E50"   # dark blue-grey
C_HEADER_FG   = "FFFFFF"
C_DONE_BG     = "D5E8D4"   # soft green
C_DONE_FG     = "6AA84F"
C_OVERDUE_BG  = "FFE6CC"   # soft orange
C_OVERDUE_FG  = "D79B00"
C_HIGH_BG     = "FFD7D7"   # soft red
C_HIGH_FG     = "CC0000"
C_IN_PROG_BG  = "DAE8FC"   # soft blue
C_IN_PROG_FG  = "2D7EC2"
C_ALT_ROW     = "F8F9FA"   # alternating row
C_BORDER      = "BDC3C7"
C_DASH_BG     = "ECF0F1"
C_ACCENT      = "2980B9"

def thin_border():
    s = Side(style="thin", color=C_BORDER)
    return Border(left=s, right=s, top=s, bottom=s)

def make_fill(hex_color):
    return PatternFill("solid", fgColor=hex_color)

wb = openpyxl.Workbook()

# ═══════════════════════════════════════════════════════════════════
#  SHEET 1 — タスク一覧 (Task List)
# ═══════════════════════════════════════════════════════════════════
ws = wb.active
ws.title = "タスク一覧"

# ── Column config: (header, width) ──────────────────────────────
columns = [
    ("No.",       5),
    ("タスク名",  30),
    ("カテゴリ",  14),
    ("優先度",    10),
    ("ステータス",13),
    ("開始日",    12),
    ("期限",      12),
    ("完了日",    12),
    ("担当者",    12),
    ("進捗%",     10),
    ("備考",      28),
]
for i, (_, w) in enumerate(columns, 1):
    ws.column_dimensions[get_column_letter(i)].width = w

ws.row_dimensions[1].height = 14   # spacer
ws.row_dimensions[2].height = 36   # title row
ws.row_dimensions[3].height = 14   # spacer
ws.row_dimensions[4].height = 22   # header row

# ── Title banner ────────────────────────────────────────────────
ws.merge_cells("A2:K2")
title_cell = ws["A2"]
title_cell.value = "📋  タスク管理表  |  Todo Management"
title_cell.font = Font(name="Yu Gothic", size=18, bold=True, color=C_HEADER_FG)
title_cell.fill = make_fill(C_HEADER_BG)
title_cell.alignment = Alignment(horizontal="center", vertical="center")

# ── Column headers (row 4) ────────────────────────────────────────
header_font  = Font(name="Yu Gothic", size=10, bold=True, color=C_HEADER_FG)
header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
header_fill  = make_fill(C_ACCENT)

for col, (label, _) in enumerate(columns, 1):
    c = ws.cell(row=4, column=col, value=label)
    c.font  = header_font
    c.fill  = header_fill
    c.alignment = header_align
    c.border = thin_border()

# ── Sample tasks ─────────────────────────────────────────────────
today = date.today()
tasks = [
    (1, "プロジェクト計画書の作成",   "企画",    "高",  "進行中",  today - timedelta(3),  today + timedelta(2),  None,          "田中",  60,  "ステークホルダー確認済み"),
    (2, "週次レポート提出",           "報告",    "高",  "未着手",  today,                  today,                 None,          "佐藤",  0,   "毎週金曜"),
    (3, "データ分析レビュー",          "分析",    "中",  "完了",    today - timedelta(7),  today - timedelta(2),  today - timedelta(1), "田中", 100, ""),
    (4, "クライアントミーティング準備","営業",    "高",  "未着手",  today + timedelta(1),  today + timedelta(3),  None,          "鈴木",  0,   "資料・議事録テンプレ準備"),
    (5, "システムテスト実施",          "開発",    "中",  "進行中",  today - timedelta(5),  today + timedelta(5),  None,          "佐藤",  40,  "UAT フェーズ"),
    (6, "請求書処理",                  "経理",    "低",  "未着手",  today,                  today + timedelta(7),  None,          "山田",  0,   ""),
    (7, "マニュアル更新",              "ドキュメント","低","完了",   today - timedelta(10), today - timedelta(3),  today - timedelta(4),"鈴木",100, "v2.1 公開済み"),
    (8, "バグ修正 #342",              "開発",    "高",  "進行中",  today - timedelta(2),  today - timedelta(1),  None,          "田中",  80,  "本番デプロイ待ち ← 期限超過"),
    (9, "研修資料準備",               "人事",    "中",  "未着手",  today + timedelta(3),  today + timedelta(10), None,          "山田",  0,   "新入社員向け"),
    (10,"四半期目標レビュー",          "企画",    "高",  "未着手",  today + timedelta(5),  today + timedelta(14), None,          "佐藤",  0,   ""),
]

DATA_START = 5
for r, (no, name, cat, pri, status, start, due, done, owner, pct, note) in enumerate(tasks, DATA_START):
    row_data = [no, name, cat, pri, status, start, due, done, owner, pct/100, note]
    for col, val in enumerate(row_data, 1):
        c = ws.cell(row=r, column=col, value=val)
        c.font      = Font(name="Yu Gothic", size=10)
        c.alignment = Alignment(horizontal="center" if col in (1,4,5,10) else "left",
                                vertical="center")
        c.border = thin_border()
        if col in (6, 7, 8) and val:
            c.number_format = "YYYY/MM/DD"
        if col == 10:
            c.number_format = "0%"
    ws.row_dimensions[r].height = 20

# ── Data validation — dropdowns ──────────────────────────────────
last_row = DATA_START + len(tasks) - 1

dv_status = DataValidation(
    type="list",
    formula1='"未着手,進行中,完了,保留"',
    showDropDown=False,
    showErrorMessage=True,
    errorTitle="入力エラー",
    error="リストから選択してください"
)
dv_status.sqref = f"E{DATA_START}:E100"

dv_pri = DataValidation(
    type="list",
    formula1='"高,中,低"',
    showDropDown=False,
    showErrorMessage=True,
    errorTitle="入力エラー",
    error="高 / 中 / 低 から選択してください"
)
dv_pri.sqref = f"D{DATA_START}:D100"

dv_pct = DataValidation(
    type="decimal",
    operator="between",
    formula1="0",
    formula2="1",
    showErrorMessage=True,
    errorTitle="入力エラー",
    error="0〜100% を小数で入力（例: 0.5 = 50%）"
)
dv_pct.sqref = f"J{DATA_START}:J100"

ws.add_data_validation(dv_status)
ws.add_data_validation(dv_pri)
ws.add_data_validation(dv_pct)

# ── Conditional formatting ────────────────────────────────────────
# Completed rows → green
done_fill = make_fill(C_DONE_BG)
done_font = Font(name="Yu Gothic", size=10, color=C_DONE_FG, strikethrough=True)
ws.conditional_formatting.add(
    f"A{DATA_START}:K100",
    FormulaRule(formula=[f'$E{DATA_START}="完了"'], fill=done_fill, font=done_font)
)

# In-progress rows → blue
prog_fill = make_fill(C_IN_PROG_BG)
prog_font = Font(name="Yu Gothic", size=10, color=C_IN_PROG_FG)
ws.conditional_formatting.add(
    f"A{DATA_START}:K100",
    FormulaRule(formula=[f'$E{DATA_START}="進行中"'], fill=prog_fill, font=prog_font)
)

# Overdue (due < today AND not done) → orange
over_fill = make_fill(C_OVERDUE_BG)
over_font = Font(name="Yu Gothic", size=10, color=C_OVERDUE_FG, bold=True)
ws.conditional_formatting.add(
    f"A{DATA_START}:K100",
    FormulaRule(
        formula=[f'AND($G{DATA_START}<TODAY(),$E{DATA_START}<>"完了",$G{DATA_START}<>"")'],
        fill=over_fill, font=over_font
    )
)

# High priority (未着手 / 進行中) → red tint on priority cell
high_fill = make_fill(C_HIGH_BG)
high_font = Font(name="Yu Gothic", size=10, color=C_HIGH_FG, bold=True)
ws.conditional_formatting.add(
    f"D{DATA_START}:D100",
    FormulaRule(formula=[f'$D{DATA_START}="高"'], fill=high_fill, font=high_font)
)

# Progress % data bar
ws.conditional_formatting.add(
    f"J{DATA_START}:J100",
    DataBarRule(start_type="num", start_value=0,
                end_type="num", end_value=1,
                color="638EC6")
)

# ── Freeze panes & auto-filter ────────────────────────────────────
ws.freeze_panes = "A5"
ws.auto_filter.ref = f"A4:K{last_row}"

# ── Legend block (below data) ─────────────────────────────────────
legend_row = last_row + 2
ws.merge_cells(f"A{legend_row}:K{legend_row}")
leg_title = ws.cell(row=legend_row, column=1, value="■ 凡例  (Color Legend)")
leg_title.font = Font(name="Yu Gothic", size=10, bold=True, color=C_HEADER_FG)
leg_title.fill = make_fill(C_HEADER_BG)
leg_title.alignment = Alignment(horizontal="left", vertical="center", indent=1)

legends = [
    (C_DONE_BG,   C_DONE_FG,   "完了  Done"),
    (C_IN_PROG_BG,C_IN_PROG_FG,"進行中  In Progress"),
    (C_OVERDUE_BG,C_OVERDUE_FG,"期限超過  Overdue"),
    (C_HIGH_BG,   C_HIGH_FG,   "優先度：高  High Priority"),
]
lr = legend_row + 1
for bg, fg, label in legends:
    ws.merge_cells(f"A{lr}:B{lr}")
    c = ws.cell(row=lr, column=1, value=label)
    c.fill = make_fill(bg)
    c.font = Font(name="Yu Gothic", size=9, bold=True, color=fg)
    c.alignment = Alignment(horizontal="center", vertical="center")
    c.border = thin_border()
    lr += 1

# ═══════════════════════════════════════════════════════════════════
#  SHEET 2 — ダッシュボード (Dashboard)
# ═══════════════════════════════════════════════════════════════════
wd = wb.create_sheet("ダッシュボード")
wd.sheet_view.showGridLines = False

for col, width in [(1,3),(2,20),(3,18),(4,18),(5,18),(6,18),(7,3)]:
    wd.column_dimensions[get_column_letter(col)].width = width

# Title
wd.merge_cells("B2:F2")
tc = wd["B2"]
tc.value = "📊  タスク ダッシュボード"
tc.font  = Font(name="Yu Gothic", size=16, bold=True, color=C_HEADER_FG)
tc.fill  = make_fill(C_HEADER_BG)
tc.alignment = Alignment(horizontal="center", vertical="center")
wd.row_dimensions[2].height = 36

# ── KPI cards ────────────────────────────────────────────────────
kpis = [
    ("総タスク数",  "=COUNTA(タスク一覧!B5:B100)",    C_ACCENT,   "B4:C5"),
    ("未着手",      '=COUNTIF(タスク一覧!E5:E100,"未着手")', "7F8C8D", "D4:E5"),
    ("進行中",      '=COUNTIF(タスク一覧!E5:E100,"進行中")', C_IN_PROG_FG, "B7:C8"),
    ("完了",        '=COUNTIF(タスク一覧!E5:E100,"完了")',   C_DONE_FG,  "D7:E8"),
    ("期限超過",    '=COUNTIFS(タスク一覧!G5:G100,"<"&TODAY(),タスク一覧!E5:E100,"<>完了",タスク一覧!G5:G100,"<>"")',
                    C_HIGH_FG, "B10:C11"),
    ("完了率",      '=IFERROR(COUNTIF(タスク一覧!E5:E100,"完了")/COUNTA(タスク一覧!B5:B100),0)',
                    C_DONE_FG, "D10:E11"),
]

for label, formula, color, merge_range in kpis:
    wd.merge_cells(merge_range)
    start_cell = merge_range.split(":")[0]
    r = int(''.join(filter(str.isdigit, start_cell)))
    col_letter = ''.join(filter(str.isalpha, start_cell))

    # label row (one row above)
    label_cell_addr = f"{col_letter}{r-1}"
    # Actually place label in first row of merge, value in merged
    val_cell = wd[start_cell]
    val_cell.value = formula
    if "完了率" in label:
        val_cell.number_format = "0%"
        val_cell.font = Font(name="Yu Gothic", size=22, bold=True, color=color)
    else:
        val_cell.font = Font(name="Yu Gothic", size=28, bold=True, color=color)
    val_cell.alignment = Alignment(horizontal="center", vertical="center")
    val_cell.fill = make_fill("FAFAFA")
    val_cell.border = thin_border()

    # Row heights
    for rn in range(r, r+2):
        wd.row_dimensions[rn].height = 30

# Add KPI labels above each card
kpi_labels = [
    ("B3", "総タスク数"),
    ("D3", "未着手"),
    ("B6", "進行中"),
    ("D6", "完了"),
    ("B9", "期限超過"),
    ("D9", "完了率"),
]
for addr, lbl in kpi_labels:
    c = wd[addr]
    c.value = lbl
    c.font  = Font(name="Yu Gothic", size=9, bold=True, color="7F8C8D")
    c.alignment = Alignment(horizontal="center", vertical="bottom")
    wd.row_dimensions[int(addr[1:])].height = 16

# ── Priority breakdown table ──────────────────────────────────────
wd["B13"] = "優先度別集計"
wd["B13"].font  = Font(name="Yu Gothic", size=11, bold=True, color=C_HEADER_FG)
wd["B13"].fill  = make_fill(C_HEADER_BG)
wd["B13"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
wd.merge_cells("B13:E13")
wd.row_dimensions[13].height = 22

priority_data = [
    ("優先度", "未着手", "進行中", "完了"),
    ("高",
     '=COUNTIFS(タスク一覧!D5:D100,"高",タスク一覧!E5:E100,"未着手")',
     '=COUNTIFS(タスク一覧!D5:D100,"高",タスク一覧!E5:E100,"進行中")',
     '=COUNTIFS(タスク一覧!D5:D100,"高",タスク一覧!E5:E100,"完了")'),
    ("中",
     '=COUNTIFS(タスク一覧!D5:D100,"中",タスク一覧!E5:E100,"未着手")',
     '=COUNTIFS(タスク一覧!D5:D100,"中",タスク一覧!E5:E100,"進行中")',
     '=COUNTIFS(タスク一覧!D5:D100,"中",タスク一覧!E5:E100,"完了")'),
    ("低",
     '=COUNTIFS(タスク一覧!D5:D100,"低",タスク一覧!E5:E100,"未着手")',
     '=COUNTIFS(タスク一覧!D5:D100,"低",タスク一覧!E5:E100,"進行中")',
     '=COUNTIFS(タスク一覧!D5:D100,"低",タスク一覧!E5:E100,"完了")'),
]

row_colors = {0: C_HEADER_BG, 1: C_HIGH_BG, 2: C_IN_PROG_BG, 3: C_DONE_BG}
row_fcolors = {0: "FFFFFF", 1: C_HIGH_FG, 2: C_IN_PROG_FG, 3: C_DONE_FG}

for ri, row_vals in enumerate(priority_data):
    for ci, val in enumerate(row_vals):
        cell = wd.cell(row=14+ri, column=2+ci, value=val)
        cell.font   = Font(name="Yu Gothic", size=10,
                          bold=(ri==0),
                          color=row_fcolors.get(ri, "333333"))
        cell.fill   = make_fill(row_colors.get(ri, "FFFFFF"))
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border()
    wd.row_dimensions[14+ri].height = 20

# ── Category breakdown table ──────────────────────────────────────
wd["B19"] = "カテゴリ別集計"
wd["B19"].font  = Font(name="Yu Gothic", size=11, bold=True, color=C_HEADER_FG)
wd["B19"].fill  = make_fill(C_HEADER_BG)
wd["B19"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
wd.merge_cells("B19:E19")
wd.row_dimensions[19].height = 22

categories = ["企画", "報告", "分析", "営業", "開発", "経理", "ドキュメント", "人事"]
cat_headers = ["カテゴリ", "件数", "完了", "未完了"]
for ci, h in enumerate(cat_headers):
    cell = wd.cell(row=20, column=2+ci, value=h)
    cell.font  = Font(name="Yu Gothic", size=10, bold=True, color="FFFFFF")
    cell.fill  = make_fill(C_ACCENT)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = thin_border()
wd.row_dimensions[20].height = 20

for ri, cat in enumerate(categories):
    row = 21 + ri
    row_vals = [
        cat,
        f'=COUNTIF(タスク一覧!C5:C100,"{cat}")',
        f'=COUNTIFS(タスク一覧!C5:C100,"{cat}",タスク一覧!E5:E100,"完了")',
        f'=COUNTIFS(タスク一覧!C5:C100,"{cat}",タスク一覧!E5:E100,"<>完了")',
    ]
    for ci, val in enumerate(row_vals):
        cell = wd.cell(row=row, column=2+ci, value=val)
        cell.font  = Font(name="Yu Gothic", size=10)
        fill_color = C_ALT_ROW if ri % 2 == 0 else "FFFFFF"
        cell.fill  = make_fill(fill_color)
        cell.alignment = Alignment(horizontal="center" if ci > 0 else "left",
                                   vertical="center",
                                   indent=1 if ci == 0 else 0)
        cell.border = thin_border()
    wd.row_dimensions[row].height = 20

# ═══════════════════════════════════════════════════════════════════
#  SHEET 3 — 入力フォーム (Quick Input Form)
# ═══════════════════════════════════════════════════════════════════
wf = wb.create_sheet("入力フォーム")
wf.sheet_view.showGridLines = False

for col, w in [(1,3),(2,22),(3,28),(4,3)]:
    wf.column_dimensions[get_column_letter(col)].width = w

wf.merge_cells("B2:C2")
fc = wf["B2"]
fc.value = "✏️  新規タスク入力"
fc.font  = Font(name="Yu Gothic", size=16, bold=True, color=C_HEADER_FG)
fc.fill  = make_fill(C_HEADER_BG)
fc.alignment = Alignment(horizontal="center", vertical="center")
wf.row_dimensions[2].height = 36

form_fields = [
    ("タスク名 *",   "", None, None),
    ("カテゴリ",     "", "list", '"企画,報告,分析,営業,開発,経理,ドキュメント,人事,その他"'),
    ("優先度",       "中", "list", '"高,中,低"'),
    ("ステータス",   "未着手", "list", '"未着手,進行中,完了,保留"'),
    ("開始日",       "", "date", None),
    ("期限 *",       "", "date", None),
    ("担当者",       "", None, None),
    ("備考",         "", None, None),
]

for ri, (label, default, val_type, val_formula) in enumerate(form_fields):
    row = 4 + ri * 2
    wf.row_dimensions[row].height = 16
    wf.row_dimensions[row+1].height = 26

    label_cell = wf.cell(row=row, column=2, value=label)
    label_cell.font = Font(name="Yu Gothic", size=9, bold=True, color="7F8C8D")
    label_cell.alignment = Alignment(vertical="bottom")

    input_cell = wf.cell(row=row+1, column=2, value=default)
    wf.merge_cells(f"B{row+1}:C{row+1}")
    input_cell.font = Font(name="Yu Gothic", size=11)
    input_cell.fill = make_fill("FFFFFF")
    input_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
    input_cell.border = Border(
        bottom=Side(style="medium", color=C_ACCENT)
    )

    if val_type == "list":
        dv = DataValidation(type="list", formula1=val_formula, showDropDown=False)
        dv.sqref = f"B{row+1}:C{row+1}"
        wf.add_data_validation(dv)
    elif val_type == "date":
        input_cell.number_format = "YYYY/MM/DD"

# Instructions
inst_row = 4 + len(form_fields) * 2 + 1
wf.merge_cells(f"B{inst_row}:C{inst_row}")
inst = wf.cell(row=inst_row, column=2,
               value="※ 入力後、「タスク一覧」シートの最終行にデータをコピーしてください。")
inst.font = Font(name="Yu Gothic", size=8, italic=True, color="999999")
inst.alignment = Alignment(horizontal="left", vertical="center")
wf.row_dimensions[inst_row].height = 18

# ═══════════════════════════════════════════════════════════════════
#  Final touches — tab colors
# ═══════════════════════════════════════════════════════════════════
ws.sheet_properties.tabColor = C_ACCENT
wd.sheet_properties.tabColor = "27AE60"
wf.sheet_properties.tabColor = "E67E22"

wb.active = ws

out_path = "c:/git/010_claude_work/014_todo_application/todo_management.xlsx"
wb.save(out_path)
print(f"Saved: {out_path}")
