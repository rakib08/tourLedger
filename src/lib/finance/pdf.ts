/*
 * TourLedger – Complete Tour Financial Report
 * Zero-dependency browser PDF 1.4 generator with smart keep-together pagination:
 * - Tables that fit within a single page never split across page boundaries.
 * - Multi-page tables (e.g., long expense registers) flow naturally with repeated headers.
 */

export type TourReport = {
  group: {
    id: string;
    name: string;
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    currency: string;
    createdAt: string;
    status: string;
  };
  generatedAt: string;
  standardContributionMinor: number;
  members: {
    id: string;
    name: string;
    role: string;
    active: boolean;
    joinedAt: string;
  }[];
  categories: { id: string; name: string }[];
  transactions: {
    id: string;
    type: string;
    contributionKind: string | null;
    memberId: string | null;
    memberName: string | null;
    categoryId: string | null;
    categoryName: string;
    title: string;
    description: string;
    amountMinor: number;
    occurredAt: string;
    recordedBy: string;
    reversalOf: string | null;
  }[];
  settlement: null | {
    finalizedAt: string;
    totalRefundMinor: number;
    allocations: { memberId: string; amountMinor: number }[];
  };
  reportRange: { from: string | null; to: string | null };
};

const PAGE_W = 595.28; // A4 Width in pt
const PAGE_H = 841.89; // A4 Height in pt
const MARGIN = 42;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOP_SAFE = 54;
const BOTTOM_SAFE = PAGE_H - 52;
const FULL_BODY_H = BOTTOM_SAFE - (TOP_SAFE + 14); // Usable height on continuation pages

const COLORS = {
  primary: "#0F2942",
  primarySoft: "#1E3A5F",
  teal: "#0D9488",
  tealBg: "#CCFBF1",
  tealText: "#0F766E",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  amberText: "#B45309",
  coral: "#E11D48",
  coralBg: "#FFE4E6",
  coralText: "#BE123C",
  white: "#FFFFFF",
  surface: "#F8FAFC",
  headerBg: "#F1F5F9",
  trackBg: "#E2E8F0",
  ink: "#1E293B",
  slate: "#475569",
  muted: "#64748B",
  line: "#E2E8F0",
  lineStrong: "#CBD5E1",
};

const CATEGORY_COLORS = [
  "#0D9488",
  "#2563EB",
  "#D97706",
  "#7C3AED",
  "#0891B2",
  "#4F46E5",
];

type PdfPage = { ops: string[]; y: number };

type TableCell =
  | string
  | { badge: string; bg: string; fg: string }
  | { progress: number | null; color: string; label: string }
  | { bar: number; color: string };

type TableOptions = {
  font?: number;
  rowHeight?: number;
  aligns?: ("left" | "right" | "center")[];
  footerRow?: { label: string; value: string; valueColor?: string };
  /** Extra height (in pt) of trailing notes/boxes that must stay attached to the end of this table */
  keepWithTrailing?: number;
  /** True when sectionHeader() was just drawn immediately above this table */
  hasPrecedingHeader?: boolean;
};

const encoder = new TextEncoder();
const byteLen = (str: string) => encoder.encode(str).length;
const num = (v: number) => Number(v.toFixed(3)).toString();
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const sanitizeText = (value: unknown) =>
  String(value ?? "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "?");

const escapePdfLiteral = (cleanAscii: string) =>
  cleanAscii.replace(/[\\()]/g, "\\$&");

function formatMoney(minor: number, currency: string) {
  const code = (currency || "BDT").toUpperCase();
  const digits = code === "JPY" || code === "KRW" ? 0 : 2;
  const amount = (Number(minor || 0) / 10 ** digits).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${code} ${amount}`;
}

function formatDate(value: string | null | undefined, short = false) {
  if (!value) return "Not specified";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(
    "en-GB",
    short
      ? { day: "2-digit", month: "short" }
      : { day: "2-digit", month: "short", year: "numeric" },
  );
}

class TourLedgerPdf {
  pages: PdfPage[] = [];
  page!: PdfPage;
  private groupTitle: string;

  constructor(groupTitle: string) {
    this.groupTitle = groupTitle;
    this.newPage(true);
  }

  private newPage(isFirst = false) {
    this.page = { ops: [], y: isFirst ? MARGIN : TOP_SAFE + 14 };
    this.pages.push(this.page);

    if (!isFirst) {
      this.text("TOURLEDGER", MARGIN, 26, 7.5, COLORS.teal, true);
      this.text(
        this.groupTitle,
        PAGE_W - MARGIN,
        26,
        7.5,
        COLORS.muted,
        false,
        "right",
      );
      this.line(MARGIN, 40, PAGE_W - MARGIN, 40, COLORS.line, 0.6);
    }
  }

  private ensure(height: number) {
    if (this.page.y + height > BOTTOM_SAFE) {
      this.newPage(false);
    }
  }

  private color(fill: string, stroke = false) {
    const [r, g, b] = rgb(fill);
    this.page.ops.push(`${num(r)} ${num(g)} ${num(b)} ${stroke ? "RG" : "rg"}`);
  }

  rect(
    x: number,
    top: number,
    width: number,
    height: number,
    fill?: string,
    stroke?: string,
    lineWidth = 0.6,
  ) {
    if (fill) this.color(fill);
    if (stroke) {
      this.color(stroke, true);
      this.page.ops.push(`${num(lineWidth)} w`);
    }
    const op = `${num(x)} ${num(PAGE_H - top - height)} ${num(width)} ${num(height)} re`;
    this.page.ops.push(`${op} ${fill && stroke ? "B" : fill ? "f" : "S"}`);
  }

  roundedRect(
    x: number,
    top: number,
    width: number,
    height: number,
    radius: number,
    fill?: string,
    stroke?: string,
    lineWidth = 0.65,
  ) {
    const r = Math.min(radius, width / 2, height / 2);
    const y = PAGE_H - top - height;
    const k = 0.5522847498;
    if (fill) this.color(fill);
    if (stroke) {
      this.color(stroke, true);
      this.page.ops.push(`${num(lineWidth)} w`);
    }
    const path = [
      `${num(x + r)} ${num(y)} m`,
      `${num(x + width - r)} ${num(y)} l`,
      `${num(x + width - r + r * k)} ${num(y)} ${num(x + width)} ${num(y + r - r * k)} ${num(x + width)} ${num(y + r)} c`,
      `${num(x + width)} ${num(y + height - r)} l`,
      `${num(x + width)} ${num(y + height - r + r * k)} ${num(x + width - r + r * k)} ${num(y + height)} ${num(x + width - r)} ${num(y + height)} c`,
      `${num(x + r)} ${num(y + height)} l`,
      `${num(x + r - r * k)} ${num(y + height)} ${num(x)} ${num(y + height - r + r * k)} ${num(x)} ${num(y + height - r)} c`,
      `${num(x)} ${num(y + r)} l`,
      `${num(x)} ${num(y + r - r * k)} ${num(x + r - r * k)} ${num(y)} ${num(x + r)} ${num(y)} c`,
      "h",
    ].join("\n");
    this.page.ops.push(`${path} ${fill && stroke ? "B" : fill ? "f" : "S"}`);
  }

  line(
    x1: number,
    top1: number,
    x2: number,
    top2: number,
    color = COLORS.line,
    width = 0.55,
  ) {
    this.color(color, true);
    this.page.ops.push(
      `${num(width)} w ${num(x1)} ${num(PAGE_H - top1)} m ${num(x2)} ${num(PAGE_H - top2)} l S`,
    );
  }

  private estimateTextWidth(cleanText: string, size: number, bold: boolean) {
    let units = 0;
    for (let i = 0; i < cleanText.length; i++) {
      const ch = cleanText[i];
      if ("ilI.,:;!'| ".includes(ch)) units += 0.28;
      else if ("mwMW@#%&".includes(ch)) units += 0.82;
      else if (ch >= "A" && ch <= "Z") units += 0.66;
      else if (ch >= "0" && ch <= "9") units += 0.56;
      else units += 0.52;
    }
    return units * size * (bold ? 1.06 : 1.0);
  }

  text(
    value: string,
    x: number,
    top: number,
    size = 8.5,
    color = COLORS.ink,
    bold = false,
    align: "left" | "right" | "center" = "left",
  ) {
    const clean = sanitizeText(value);
    const width = this.estimateTextWidth(clean, size, bold);
    const drawX =
      align === "right" ? x - width : align === "center" ? x - width / 2 : x;
    const [r, g, b] = rgb(color);
    const escaped = escapePdfLiteral(clean);
    this.page.ops.push(
      `BT /${bold ? "F2" : "F1"} ${num(size)} Tf ${num(r)} ${num(g)} ${num(b)} rg 1 0 0 1 ${num(drawX)} ${num(PAGE_H - top - size * 0.85)} Tm (${escaped}) Tj ET`,
    );
  }

  badge(
    label: string,
    x: number,
    top: number,
    bgColor: string,
    textColor: string,
    align: "left" | "right" = "left",
  ) {
    const clean = sanitizeText(label);
    const fontSize = 6.6;
    const textW = this.estimateTextWidth(clean, fontSize, true);
    const padX = 8;
    const w = textW + padX * 2;
    const h = 15;
    const bx = align === "right" ? x - w : x;
    this.roundedRect(bx, top, w, h, 4.5, bgColor);
    this.text(clean, bx + w / 2, top + 4, fontSize, textColor, true, "center");
  }

  private drawInlineProgress(
    x: number,
    top: number,
    width: number,
    progress: number | null,
    fillColor: string,
    label: string,
  ) {
    const labelW = 30;
    const trackW = Math.max(24, width - labelW - 8);
    const trackH = 6.5;
    const trackTop = top + 3.5;

    this.roundedRect(x, trackTop, trackW, trackH, 3.25, COLORS.trackBg);

    if (progress !== null && progress > 0) {
      const clamped = Math.max(0, Math.min(1, progress));
      const fillW = Math.max(6.5, trackW * clamped);
      this.roundedRect(x, trackTop, fillW, trackH, 3.25, fillColor);
    }

    this.text(
      label,
      x + width,
      top + 2.5,
      7.4,
      progress === null ? COLORS.muted : COLORS.slate,
      progress !== null && progress >= 1,
      "right",
    );
  }

  private drawInlineBar(
    x: number,
    top: number,
    width: number,
    ratio: number,
    fillColor: string,
  ) {
    const trackH = 7;
    const trackTop = top + 3;
    this.roundedRect(x, trackTop, width, trackH, 3.5, COLORS.trackBg);
    if (ratio > 0) {
      const clamped = Math.max(0, Math.min(1, ratio));
      this.roundedRect(
        x,
        trackTop,
        Math.max(7, width * clamped),
        trackH,
        3.5,
        fillColor,
      );
    }
  }

  private wrap(value: string, maxWidthPt: number, size: number, bold = false) {
    const clean = sanitizeText(value);
    const words = clean.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (this.estimateTextWidth(candidate, size, bold) <= maxWidthPt) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (this.estimateTextWidth(word, size, bold) > maxWidthPt) {
          let chunk = "";
          for (const ch of word) {
            if (this.estimateTextWidth(chunk + ch, size, bold) > maxWidthPt) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  paragraph(
    value: string,
    opts: {
      x?: number;
      width?: number;
      size?: number;
      color?: string;
      lineGap?: number;
      after?: number;
    } = {},
  ) {
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? CONTENT_W;
    const size = opts.size ?? 7.8;
    const lineGap = opts.lineGap ?? 4;
    const lines = this.wrap(value, width, size, false);
    this.ensure(lines.length * (size + lineGap) + (opts.after ?? 14));
    lines.forEach((line, i) =>
      this.text(
        line,
        x,
        this.page.y + i * (size + lineGap),
        size,
        opts.color ?? COLORS.slate,
      ),
    );
    this.page.y += lines.length * (size + lineGap) + (opts.after ?? 14);
  }

  heroBanner(data: TourReport, memberCount: number) {
    const bannerH = 96;
    this.roundedRect(
      MARGIN,
      this.page.y,
      CONTENT_W,
      bannerH,
      10,
      COLORS.primary,
    );
    this.roundedRect(MARGIN, this.page.y, 5, bannerH, 2.5, COLORS.teal);

    const innerX = MARGIN + 18;
    const rightX = PAGE_W - MARGIN - 18;

    this.text("TOURLEDGER", innerX, this.page.y + 16, 8.5, "#5EEAD4", true);

    const statusBadge =
      data.group.status?.toLowerCase() === "completed" || data.settlement
        ? "FINAL REPORT"
        : "FINANCIAL REPORT";
    this.badge(
      statusBadge,
      rightX,
      this.page.y + 14,
      COLORS.primarySoft,
      "#5EEAD4",
      "right",
    );

    this.text(
      data.group.name,
      innerX,
      this.page.y + 36,
      16,
      COLORS.white,
      true,
    );

    const meta = [
      data.group.destination || "Destination not specified",
      `${formatDate(data.group.startDate, true)} - ${formatDate(data.group.endDate, true)}`,
      `${memberCount} ${memberCount === 1 ? "Member" : "Members"}`,
      `Currency: ${(data.group.currency || "BDT").toUpperCase()}`,
    ].join("   |   ");

    this.text(meta, innerX, this.page.y + 66, 7.8, "#CBD5E1", false);
    this.page.y += bannerH + 26;
  }

  /**
   * Renders a section heading, optionally ensuring enough vertical space
   * for the entire following block (`keepWithBlockHeight`) when that block
   * fits on a single page.
   */
  sectionHeader(title: string, subtitle?: string, keepWithBlockHeight = 0) {
    const headerTotalH = 43; // 10pt top pad + 33pt heading height
    const needed =
      keepWithBlockHeight > 0 &&
      headerTotalH + keepWithBlockHeight <= FULL_BODY_H
        ? headerTotalH + keepWithBlockHeight
        : headerTotalH + 60; // At minimum, keep heading with header + ~1-2 rows

    if (this.page.y + needed > BOTTOM_SAFE) {
      this.newPage(false);
    } else {
      this.page.y += 10;
    }

    this.roundedRect(MARGIN, this.page.y + 1, 3.5, 13, 1.75, COLORS.teal);
    this.text(
      title.toUpperCase(),
      MARGIN + 11,
      this.page.y + 2,
      9.2,
      COLORS.primary,
      true,
    );
    if (subtitle) {
      this.text(
        subtitle,
        PAGE_W - MARGIN,
        this.page.y + 2.5,
        7.5,
        COLORS.muted,
        false,
        "right",
      );
    }
    this.line(
      MARGIN,
      this.page.y + 21,
      PAGE_W - MARGIN,
      this.page.y + 21,
      COLORS.lineStrong,
      0.7,
    );
    this.page.y += 33;
  }

  kpiGrid(
    items: {
      label: string;
      value: string;
      sublabel?: string;
      accent: string;
      valueColor?: string;
    }[],
  ) {
    const gap = 14;
    const cols = 2;
    const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
    const cardH = 64;
    const rows = Math.ceil(items.length / cols);

    this.ensure(rows * (cardH + gap));

    items.forEach((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = MARGIN + col * (cardW + gap);
      const y = this.page.y + row * (cardH + gap);

      this.roundedRect(x, y, cardW, cardH, 8, COLORS.surface, COLORS.line, 0.7);
      this.roundedRect(x + 14, y, 30, 3, 1.5, item.accent);

      this.text(
        item.label.toUpperCase(),
        x + 14,
        y + 13,
        6.8,
        COLORS.muted,
        true,
      );
      this.text(
        item.value,
        x + 14,
        y + 28,
        14,
        item.valueColor ?? COLORS.primary,
        true,
      );
      if (item.sublabel) {
        this.text(item.sublabel, x + 14, y + 48, 7, COLORS.slate, false);
      }
    });

    this.page.y += rows * (cardH + gap) + 18;
  }

  distributionBar(spent: number, netPool: number) {
    const pool = Math.max(0, netPool);
    const ratio = pool > 0 ? Math.max(0, Math.min(1, spent / pool)) : 0;
    const barH = 14;

    this.ensure(62);
    this.roundedRect(MARGIN, this.page.y, CONTENT_W, barH, 7, COLORS.trackBg);

    if (ratio > 0) {
      this.roundedRect(
        MARGIN,
        this.page.y,
        Math.max(14, CONTENT_W * ratio),
        barH,
        7,
        ratio > 1 ? COLORS.coral : COLORS.teal,
      );
    }

    const spentPct = (ratio * 100).toFixed(1);
    const remPct = Math.max(0, (1 - ratio) * 100).toFixed(1);

    const legendY = this.page.y + barH + 12;
    const spentLabel = `Utilized / Spent (${spentPct}%)`;
    const remLabel = `Unspent Reserve (${remPct}%)`;

    this.roundedRect(
      MARGIN,
      legendY + 1,
      8,
      8,
      2.5,
      ratio > 1 ? COLORS.coral : COLORS.teal,
    );
    this.text(spentLabel, MARGIN + 13, legendY, 7.6, COLORS.ink, true);

    const remTextW = this.estimateTextWidth(remLabel, 7.6, false);
    this.roundedRect(
      PAGE_W - MARGIN - remTextW - 13,
      legendY + 1,
      8,
      8,
      2.5,
      COLORS.trackBg,
      COLORS.lineStrong,
    );
    this.text(
      remLabel,
      PAGE_W - MARGIN,
      legendY,
      7.6,
      COLORS.slate,
      false,
      "right",
    );

    this.page.y += barH + 40;
  }

  /**
   * Pre-measures exact table height (header + wrapped rows + footer) so we know
   * whether the table fits as an atomic block on one page or spans multiple pages.
   */
  measureTable(
    rows: TableCell[][],
    widths: number[],
    options: TableOptions = {},
  ) {
    const font = options.font ?? 7.8;
    const baseRowH = options.rowHeight ?? 30;
    const padX = 12;

    const preparedRows = rows.map((row) => {
      const wrappedCells = row.map((cell, i) => {
        if (typeof cell === "object") return [""];
        return this.wrap(cell, Math.max(18, widths[i] - padX * 2), font, false);
      });
      const lineCount = Math.max(1, ...wrappedCells.map((l) => l.length));
      const height = Math.max(baseRowH, lineCount * (font + 3.5) + 14);
      return { row, wrappedCells, height };
    });

    const headerHeight = 27;
    const rowsHeight = preparedRows.reduce((sum, r) => sum + r.height, 0);
    const footerHeight = options.footerRow ? 48 : 22;
    const totalHeight = headerHeight + rowsHeight + footerHeight;

    return { preparedRows, headerHeight, footerHeight, totalHeight };
  }

  /**
   * Renders a complete section (header + table + optional trailing callback)
   * atomically whenever it fits within a single page, or cleanly paginated
   * across multiple pages when the table is naturally longer than 1 page.
   */
  tableSection(
    title: string,
    subtitle: string | undefined,
    headers: string[],
    rows: TableCell[][],
    widths: number[],
    options: TableOptions = {},
    afterTable?: () => void,
  ) {
    const measured = this.measureTable(rows, widths, options);
    const trailingH = options.keepWithTrailing ?? 0;
    const atomicHeight = measured.totalHeight + trailingH;

    // 1. Keep section header + entire table (+ trailing block) together if it fits on 1 page
    this.sectionHeader(title, subtitle, atomicHeight);

    // 2. Render table with pre-measured rows
    this.renderMeasuredTable(headers, widths, measured, options);

    // 3. Render any attached trailing note or summary box
    if (afterTable) {
      afterTable();
    }
  }

  private renderMeasuredTable(
    headers: string[],
    widths: number[],
    measured: ReturnType<TourLedgerPdf["measureTable"]>,
    options: TableOptions,
  ) {
    const font = options.font ?? 7.8;
    const padX = 12;

    const drawHeader = () => {
      this.ensure(30);
      this.roundedRect(MARGIN, this.page.y, CONTENT_W, 25, 5, COLORS.headerBg);
      let x = MARGIN;
      headers.forEach((header, i) => {
        const align =
          options.aligns?.[i] ?? (i === headers.length - 1 ? "right" : "left");
        const tx =
          align === "right"
            ? x + widths[i] - padX
            : align === "center"
              ? x + widths[i] / 2
              : x + padX;
        this.text(
          header.toUpperCase(),
          tx,
          this.page.y + 8.5,
          6.8,
          COLORS.slate,
          true,
          align,
        );
        x += widths[i];
      });
      this.page.y += 27;
    };

    drawHeader();

    measured.preparedRows.forEach(({ row, wrappedCells, height }, rowIdx) => {
      // Multi-page table break: repeat column header at top of next page
      if (this.page.y + height > BOTTOM_SAFE) {
        this.newPage(false);
        drawHeader();
      }

      if (rowIdx % 2 === 1) {
        this.rect(MARGIN, this.page.y, CONTENT_W, height, COLORS.surface);
      }

      let x = MARGIN;
      row.forEach((cell, i) => {
        const align =
          options.aligns?.[i] ?? (i === headers.length - 1 ? "right" : "left");

        if (typeof cell === "object" && "badge" in cell) {
          const bx = align === "right" ? x + widths[i] - padX : x + padX;
          this.badge(
            cell.badge,
            bx,
            this.page.y + (height - 15) / 2,
            cell.bg,
            cell.fg,
            align === "right" ? "right" : "left",
          );
        } else if (typeof cell === "object" && "progress" in cell) {
          this.drawInlineProgress(
            x + padX,
            this.page.y + (height - 13) / 2,
            widths[i] - padX * 2,
            cell.progress,
            cell.color,
            cell.label,
          );
        } else if (typeof cell === "object" && "bar" in cell) {
          this.drawInlineBar(
            x + padX,
            this.page.y + (height - 13) / 2,
            widths[i] - padX * 2,
            cell.bar,
            cell.color,
          );
        } else if (typeof cell === "string") {
          const lines = wrappedCells[i];
          const textBlockH = lines.length * (font + 3.5) - 3.5;
          const startTop = this.page.y + (height - textBlockH) / 2;

          lines.forEach((line, lineIdx) => {
            const tx =
              align === "right"
                ? x + widths[i] - padX
                : align === "center"
                  ? x + widths[i] / 2
                  : x + padX;
            const isAmountCol = align === "right" && i === row.length - 1;
            this.text(
              line,
              tx,
              startTop + lineIdx * (font + 3.5),
              font,
              isAmountCol ? COLORS.primary : COLORS.ink,
              isAmountCol,
              align,
            );
          });
        }
        x += widths[i];
      });

      this.line(
        MARGIN,
        this.page.y + height,
        PAGE_W - MARGIN,
        this.page.y + height,
        COLORS.line,
        0.45,
      );
      this.page.y += height;
    });

    if (options.footerRow) {
      this.ensure(38);
      this.roundedRect(
        MARGIN,
        this.page.y + 6,
        CONTENT_W,
        28,
        5,
        COLORS.headerBg,
        COLORS.lineStrong,
        0.6,
      );
      this.text(
        options.footerRow.label,
        MARGIN + padX,
        this.page.y + 15.5,
        8.2,
        COLORS.primary,
        true,
      );
      this.text(
        options.footerRow.value,
        PAGE_W - MARGIN - padX,
        this.page.y + 15,
        9,
        options.footerRow.valueColor ?? COLORS.primary,
        true,
        "right",
      );
      this.page.y += 48;
    } else {
      this.page.y += 22;
    }
  }

  highlightBox(
    label: string,
    value: string,
    accentColor: string,
    note?: string,
  ) {
    const h = note ? 52 : 40;
    this.ensure(h + 20);
    this.roundedRect(
      MARGIN,
      this.page.y,
      CONTENT_W,
      h,
      8,
      COLORS.surface,
      accentColor,
      0.85,
    );
    this.roundedRect(MARGIN, this.page.y, 4.5, h, 2.25, accentColor);

    this.text(label, MARGIN + 16, this.page.y + 14, 9, COLORS.primary, true);
    this.text(
      value,
      PAGE_W - MARGIN - 16,
      this.page.y + 12.5,
      12,
      accentColor,
      true,
      "right",
    );
    if (note) {
      this.text(note, MARGIN + 16, this.page.y + 32, 7.2, COLORS.muted, false);
    }
    this.page.y += h + 22;
  }

  finish(): Blob {
    const objects: string[] = [];
    const add = (v: string) => {
      objects.push(v);
      return objects.length;
    };

    const catalogId = add("");
    const pagesId = add("");
    const fontRegular = add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    );
    const fontBold = add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    );
    const pageIds: number[] = [];
    const totalPages = this.pages.length;

    this.pages.forEach((page, index) => {
      const footerY = PAGE_H - 28;
      const [mr, mg, mb] = rgb(COLORS.muted);
      const [lr, lg, lb] = rgb(COLORS.line);
      const leftClean = sanitizeText(
        "TourLedger  |  Verified Financial Ledger",
      );
      const rightClean = sanitizeText(`Page ${index + 1} of ${totalPages}`);
      const rightW = this.estimateTextWidth(rightClean, 7.3, false);

      const footerOps = [
        `${num(lr)} ${num(lg)} ${num(lb)} RG 0.55 w ${MARGIN} ${num(PAGE_H - 38)} m ${num(PAGE_W - MARGIN)} ${num(PAGE_H - 38)} l S`,
        `BT /F1 7.3 Tf ${num(mr)} ${num(mg)} ${num(mb)} rg 1 0 0 1 ${MARGIN} ${num(PAGE_H - footerY - 6)} Tm (${escapePdfLiteral(leftClean)}) Tj ET`,
        `BT /F1 7.3 Tf ${num(mr)} ${num(mg)} ${num(mb)} rg 1 0 0 1 ${num(PAGE_W - MARGIN - rightW)} ${num(PAGE_H - footerY - 6)} Tm (${escapePdfLiteral(rightClean)}) Tj ET`,
      ];

      const stream = [...page.ops, ...footerOps].join("\n");
      const streamBytes = byteLen(stream);
      const contentId = add(
        `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
      );
      pageIds.push(
        add(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
        ),
      );
    });

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] =
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    const chunks: string[] = ["%PDF-1.4\n"];
    let currentByteOffset = byteLen(chunks[0]);
    const offsets: number[] = [0];

    objects.forEach((object, i) => {
      offsets.push(currentByteOffset);
      const entry = `${i + 1} 0 obj\n${object}\nendobj\n`;
      chunks.push(entry);
      currentByteOffset += byteLen(entry);
    });

    const xrefOffset = currentByteOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++) {
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    chunks.push(xref);

    return new Blob([encoder.encode(chunks.join(""))], {
      type: "application/pdf",
    });
  }
}

export function buildCompleteTourPdf(data: TourReport): Blob {
  const pdf = new TourLedgerPdf(data.group.name);
  const tx = data.transactions;
  const members = data.members;
  const currency = data.group.currency || "BDT";

  const contributions = tx
    .filter((t) => t.type === "contribution")
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const expenses = tx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const refunds = tx
    .filter((t) => t.type === "refund")
    .reduce((sum, t) => sum + t.amountMinor, 0);

  const netPool = contributions - refunds;
  const remainingCash = netPool - expenses;

  const activeMembers = members.filter((m) => m.active);
  const standardContributions = tx
    .filter(
      (t) => t.type === "contribution" && t.contributionKind === "standard",
    )
    .reduce((sum, t) => sum + t.amountMinor, 0);
  const standardTarget = data.standardContributionMinor * activeMembers.length;
  const outstanding = Math.max(0, standardTarget - standardContributions);

  const categoryTotals = new Map<string, number>();
  tx.filter((t) => t.type === "expense").forEach((t) =>
    categoryTotals.set(
      t.categoryName || "Uncategorized",
      (categoryTotals.get(t.categoryName || "Uncategorized") || 0) +
        t.amountMinor,
    ),
  );
  const sortedCategories = [...categoryTotals.entries()].sort(
    (a, b) => b[1] - a[1],
  );

  const generatedAt = formatDate(data.generatedAt);
  const reportFrom = data.reportRange.from || data.group.createdAt;
  const reportTo = data.reportRange.to || data.generatedAt;

  // ── 1. Hero Header & Executive KPI Cards ─────────────────────────────────
  pdf.heroBanner(data, members.length);

  pdf.kpiGrid([
    {
      label: "Total Contributions",
      value: formatMoney(contributions, currency),
      sublabel:
        refunds > 0
          ? `Net pool after ${formatMoney(refunds, currency)} refunds`
          : `From ${activeMembers.length} active members`,
      accent: COLORS.teal,
      valueColor: COLORS.tealText,
    },
    {
      label: "Total Expenses",
      value: formatMoney(expenses, currency),
      sublabel: `Across ${sortedCategories.length} expense ${sortedCategories.length === 1 ? "category" : "categories"}`,
      accent: COLORS.primary,
      valueColor: COLORS.primary,
    },
    {
      label: "Remaining Cash Balance",
      value: formatMoney(remainingCash, currency),
      sublabel:
        remainingCash < 0 ? "Deficit / overspent" : "Available group balance",
      accent: remainingCash < 0 ? COLORS.coral : COLORS.amber,
      valueColor: remainingCash < 0 ? COLORS.coralText : COLORS.primary,
    },
    {
      label: "Posted Transactions",
      value: String(tx.length),
      sublabel: `Period: ${formatDate(reportFrom, true)} - ${formatDate(reportTo, true)}`,
      accent: COLORS.slate,
      valueColor: COLORS.primary,
    },
  ]);

  // ── 2. Fund Utilization ──────────────────────────────────────────────────
  pdf.sectionHeader("Fund Utilization", undefined, 62);
  pdf.distributionBar(expenses, netPool);

  // ── 3. Expense Breakdown by Category ─────────────────────────────────────
  if (sortedCategories.length > 0) {
    const categoryRows: TableCell[][] = sortedCategories.map(
      ([name, amount], idx) => {
        const ratio = expenses > 0 ? amount / expenses : 0;
        const share = `${(ratio * 100).toFixed(1)}%`;
        const barColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
        return [
          name,
          { bar: ratio, color: barColor },
          share,
          formatMoney(amount, currency),
        ];
      },
    );

    pdf.tableSection(
      "Expense Breakdown by Category",
      `Generated ${generatedAt}`,
      ["Category", "Distribution", "Share", "Amount"],
      categoryRows,
      [145, CONTENT_W - 145 - 65 - 120, 65, 120],
      {
        rowHeight: 30,
        aligns: ["left", "left", "right", "right"],
        footerRow: {
          label: "Total Categorized Expenses",
          value: formatMoney(expenses, currency),
        },
      },
    );
  } else {
    pdf.sectionHeader(
      "Expense Breakdown by Category",
      `Generated ${generatedAt}`,
      30,
    );
    pdf.paragraph("No posted expenses recorded for this reporting period.");
  }

  // ── 4. Member Contribution Statement with Progress Bars ──────────────────
  const contributionRows: TableCell[][] = members.map((member) => {
    const own = tx.filter(
      (t) => t.type === "contribution" && t.memberId === member.id,
    );
    const contributed = own.reduce((sum, t) => sum + t.amountMinor, 0);
    const standard = own
      .filter((t) => t.contributionKind === "standard")
      .reduce((sum, t) => sum + t.amountMinor, 0);
    const due =
      data.standardContributionMinor > 0 && member.active
        ? Math.max(0, data.standardContributionMinor - standard)
        : 0;

    let badgeObj: { badge: string; bg: string; fg: string };
    let progressCell: { progress: number | null; color: string; label: string };

    if (!member.active) {
      badgeObj = { badge: "INACTIVE", bg: COLORS.headerBg, fg: COLORS.muted };
      progressCell = { progress: null, color: COLORS.muted, label: "--" };
    } else if (data.standardContributionMinor <= 0) {
      badgeObj = { badge: "NO TARGET", bg: COLORS.headerBg, fg: COLORS.slate };
      progressCell = { progress: null, color: COLORS.slate, label: "--" };
    } else {
      const ratio = Math.min(1, standard / data.standardContributionMinor);
      const pctText = `${Math.round(ratio * 100)}%`;

      if (due === 0) {
        badgeObj = { badge: "PAID", bg: COLORS.tealBg, fg: COLORS.tealText };
        progressCell = { progress: 1, color: COLORS.teal, label: pctText };
      } else if (standard > 0) {
        badgeObj = {
          badge: "PARTIAL",
          bg: COLORS.amberBg,
          fg: COLORS.amberText,
        };
        progressCell = { progress: ratio, color: COLORS.amber, label: pctText };
      } else {
        badgeObj = {
          badge: "UNPAID",
          bg: COLORS.coralBg,
          fg: COLORS.coralText,
        };
        progressCell = { progress: 0, color: COLORS.coral, label: "0%" };
      }
    }

    return [
      member.role ? `${member.name} (${member.role})` : member.name,
      progressCell,
      formatMoney(contributed, currency),
      badgeObj,
    ];
  });

  pdf.tableSection(
    "Member Contribution Statement",
    data.standardContributionMinor > 0
      ? `Target: ${formatMoney(data.standardContributionMinor, currency)} / member`
      : "No fixed contribution target",
    ["Member", "Target Progress", "Contributed", "Status"],
    contributionRows,
    [CONTENT_W - 140 - 115 - 80, 140, 115, 80],
    {
      rowHeight: 32,
      aligns: ["left", "left", "right", "right"],
      keepWithTrailing: data.standardContributionMinor > 0 ? 30 : 0,
      footerRow: {
        label: "Total Contributions Received",
        value: formatMoney(contributions, currency),
        valueColor: COLORS.tealText,
      },
    },
    () => {
      if (data.standardContributionMinor > 0) {
        pdf.paragraph(
          `Outstanding standard contributions across active members: ${formatMoney(outstanding, currency)}.`,
          { size: 7.6, color: COLORS.slate, after: 18 },
        );
      }
    },
  );

  // ── 5. Chronological Expense Register (Supports multi-page flow) ─────────
  const expenseItems = tx
    .filter((t) => t.type === "expense")
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  if (expenseItems.length > 0) {
    const expenseRows = expenseItems.map((t) => [
      formatDate(t.occurredAt, true),
      t.description ? `${t.title} - ${t.description}` : t.title,
      t.categoryName || "Uncategorized",
      formatMoney(t.amountMinor, currency),
    ]);

    pdf.tableSection(
      "Complete Expense Register",
      `${expenseItems.length} ${expenseItems.length === 1 ? "entry" : "entries"}`,
      ["Date", "Description", "Category", "Amount"],
      expenseRows,
      [62, CONTENT_W - 62 - 102 - 110, 102, 110],
      {
        font: 7.5,
        rowHeight: 28,
        aligns: ["left", "left", "left", "right"],
        footerRow: {
          label: `Total Expenses (${expenseItems.length} entries)`,
          value: formatMoney(expenses, currency),
        },
      },
    );
  } else {
    pdf.sectionHeader("Complete Expense Register", undefined, 30);
    pdf.paragraph("No expense transactions recorded.");
  }

  // ── 6. Individual Member Statements ──────────────────────────────────────
  const memberRows = members.map((member) => {
    const own = tx.filter((t) => t.memberId === member.id);
    const paid = own
      .filter((t) => t.type === "contribution")
      .reduce((sum, t) => sum + t.amountMinor, 0);
    const refunded = own
      .filter((t) => t.type === "refund")
      .reduce((sum, t) => sum + t.amountMinor, 0);
    const allocated = data.settlement?.allocations.find(
      (a) => a.memberId === member.id,
    )?.amountMinor;

    return [
      member.name,
      formatMoney(paid - refunded, currency),
      "Not configured",
      allocated === undefined ? "Pending" : formatMoney(allocated, currency),
    ];
  });

  pdf.tableSection(
    "Individual Member Statements",
    undefined,
    ["Member", "Net Paid", "Expense Share", "Settlement Refund"],
    memberRows,
    [CONTENT_W - 105 - 105 - 110, 105, 105, 110],
    {
      rowHeight: 28,
      aligns: ["left", "right", "right", "right"],
      keepWithTrailing: 36,
    },
    () => {
      pdf.paragraph(
        "Note: Individual expense shares and net balances are displayed only when group expense-sharing rules are configured.",
        { size: 7.2, color: COLORS.muted, after: 20 },
      );
    },
  );

  // ── 7. Final Financial Reconciliation & Highlight Summary ────────────────
  const settlementLabel = data.settlement
    ? `Finalized on ${formatDate(data.settlement.finalizedAt)}`
    : "Not finalized";

  const reconciliationRows: [string, string][] = [
    ["Total Contributions Received", formatMoney(contributions, currency)],
    ...(refunds > 0
      ? ([
          ["Less: Member Refunds Issued", `-${formatMoney(refunds, currency)}`],
        ] as [string, string][])
      : []),
    ["Net Available Group Pool", formatMoney(netPool, currency)],
    ["Total Posted Expenses", formatMoney(expenses, currency)],
    [
      "Outstanding Standard Contributions",
      data.standardContributionMinor > 0
        ? formatMoney(outstanding, currency)
        : "Not configured",
    ],
    ["Settlement Status", settlementLabel],
  ];

  pdf.tableSection(
    "Final Financial Reconciliation",
    undefined,
    ["Reconciliation Line Item", "Amount / Status"],
    reconciliationRows,
    [CONTENT_W - 185, 185],
    {
      rowHeight: 28,
      aligns: ["left", "right"],
      keepWithTrailing: 74, // Keep reconciliation table attached to the final cash box
    },
    () => {
      pdf.highlightBox(
        "Final Remaining Group Cash",
        formatMoney(remainingCash, currency),
        remainingCash < 0 ? COLORS.coral : COLORS.teal,
        data.settlement
          ? `Settlement snapshot: ${formatMoney(data.settlement.totalRefundMinor, currency)} total refund allocated across members.`
          : "Includes valid posted financial records only. Pending, rejected, and voided entries are excluded.",
      );
    },
  );

  return pdf.finish();
}
