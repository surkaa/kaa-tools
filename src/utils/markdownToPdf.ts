import html2canvas from 'html2canvas';
import {jsPDF} from 'jspdf';

/**
 * 将 HTML 元素导出为 A4 PDF。
 * 采用「截图 + 切片分页」策略：先整体渲染为一张高分辨率画布，
 * 再按 A4 比例切成多页，避免内容被截断在页边。
 */

export interface PdfExportOptions {
  /** 页面尺寸，目前支持 A4 与 Letter */
  pageSize?: 'a4' | 'letter';
  /** 纸张方向 */
  orientation?: 'portrait' | 'landscape';
  /** 页边距，单位 mm */
  margin?: number;
  /** 画布放大倍数，越大越清晰、耗时越长 */
  scale?: number;
  /** 文档标题，用于 PDF 元数据与文件名 */
  title?: string;
  /** 导出底色，需与元素纸面一致（暗色主题导出深色纸面），默认白色 */
  backgroundColor?: string;
  /** 进度回调，0 - 1 */
  onProgress?: (progress: number) => void;
}

const PAGE_SIZES: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: {width: 210, height: 297},
  letter: {width: 215.9, height: 279.4},
};

/** 单页最大像素高度，避免超出 canvas 上限导致空白页 */
const MAX_CANVAS_PIXELS = 16000;

/** 将 CSS 颜色（#rgb / #rrggbb / rgb() / rgba()）解析成 RGB 三元组，失败返回 null */
function parseCssColor(value: string): [number, number, number] | null {
  const input = value.trim();
  if (!input) {
    return null;
  }

  const hex = input.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const raw = hex[1];
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ];
    }
    if (raw.length >= 6) {
      return [
        parseInt(raw.slice(0, 2), 16),
        parseInt(raw.slice(2, 4), 16),
        parseInt(raw.slice(4, 6), 16),
      ];
    }
    return null;
  }

  const rgb = input.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) {
    return [
      Math.round(Number(rgb[1])),
      Math.round(Number(rgb[2])),
      Math.round(Number(rgb[3])),
    ];
  }

  return null;
}

export async function exportElementToPdf(
    element: HTMLElement,
    options: PdfExportOptions = {},
): Promise<void> {
  const {
    pageSize = 'a4',
    orientation = 'portrait',
    margin = 14,
    scale = 2,
    title = 'document',
    backgroundColor = '#ffffff',
    onProgress,
  } = options;

  const pageColor = parseCssColor(backgroundColor);

  const size = PAGE_SIZES[pageSize] ?? PAGE_SIZES.a4;
  const pageWidth = orientation === 'landscape' ? size.height : size.width;
  const pageHeight = orientation === 'landscape' ? size.width : size.height;

  onProgress?.(0.05);

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    // 忽略页面上的交互控件（按钮、输入框等）
    ignoreElements: node => node instanceof HTMLElement
        && (node.dataset.pdfIgnore === 'true' || node.classList.contains('pdf-ignore')),
  });

  onProgress?.(0.55);

  const contentWidthMm = pageWidth - margin * 2;
  const contentHeightMm = pageHeight - margin * 2;

  // 画布像素 -> PDF 毫米的换算比例
  const pxPerMm = canvas.width / contentWidthMm;
  const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);

  if (pageHeightPx <= 0) {
    throw new Error('页面尺寸计算失败，请调整纸张设置后重试');
  }

  const pdf = new jsPDF({
    unit: 'mm',
    format: [pageWidth, pageHeight],
    orientation,
    compress: true,
  });

  pdf.setProperties({title});

  const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));
  const sliceCanvas = document.createElement('canvas');
  const sliceCtx = sliceCanvas.getContext('2d');

  if (!sliceCtx) {
    throw new Error('无法创建画布上下文，浏览器可能不支持该操作');
  }

  for (let page = 0; page < totalPages; page++) {
    const sliceTop = page * pageHeightPx;
    const sliceHeight = Math.min(pageHeightPx, canvas.height - sliceTop);
    if (sliceHeight <= 0) {
      break;
    }

    // 超长文档分块绘制，规避部分浏览器单次 canvas 高度限制
    const chunks = Math.ceil(sliceHeight / MAX_CANVAS_PIXELS);
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;

    for (let chunk = 0; chunk < chunks; chunk++) {
      const offset = chunk * MAX_CANVAS_PIXELS;
      const partHeight = Math.min(MAX_CANVAS_PIXELS, sliceHeight - offset);

      sliceCtx.fillStyle = backgroundColor;
      sliceCtx.fillRect(0, offset, sliceCanvas.width, partHeight);
      sliceCtx.drawImage(
          canvas,
          0, sliceTop + offset, canvas.width, partHeight,
          0, offset, sliceCanvas.width, partHeight,
      );
    }

    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
    const sliceHeightMm = sliceHeight / pxPerMm;

    if (page > 0) {
      pdf.addPage([pageWidth, pageHeight], orientation);
    }
    // 页边距也铺成纸张底色，暗色主题下不会出现白边
    if (pageColor) {
      pdf.setFillColor(pageColor[0], pageColor[1], pageColor[2]);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }
    pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidthMm, sliceHeightMm, undefined, 'FAST');

    onProgress?.(0.55 + 0.4 * ((page + 1) / totalPages));
  }

  const safeName = title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
  pdf.save(`${safeName}.pdf`);
  onProgress?.(1);
}