import {Marked} from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';

/**
 * Markdown 渲染：支持 GFM 表格、代码块、任务列表、KaTeX 数学公式。
 * Mermaid 图表在渲染阶段仅占位，由 renderMermaidBlocks 在 DOM 挂载后绘制。
 */

const MERMAID_LANG = 'mermaid';

/** 渲染公式，失败时回退为原始文本，避免整篇文档渲染中断 */
function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
      trust: false,
    });
  } catch {
    return `<code class="math-error">${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(value: string): string {
  return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

/**
 * 保护公式不被 Markdown 解析破坏：
 * 支持 $$...$$、\[...\]（块级）与 $...$、\(...\)（行内）四种写法。
 * 先把公式抽出为占位符，Markdown 解析完成后再回填渲染结果。
 */
interface MathSlot {
  token: string;
  html: string;
}

function extractMath(source: string): { text: string; slots: MathSlot[] } {
  const slots: MathSlot[] = [];
  const codeSlots: string[] = [];
  let text = source;

  // 先摘出代码块与行内代码，避免其中的 $、\( 等被误判为公式
  const stashCode = (code: string) => {
    codeSlots.push(code);
    return `@@MDCODE${codeSlots.length - 1}@@`;
  };
  text = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, stashCode);
  text = text.replace(/`[^`\n]+`/g, stashCode);

  const stash = (html: string) => {
    const token = `@@MDMATH${slots.length}@@`;
    slots.push({token, html});
    return token;
  };

  // 块级公式：$$...$$ 与 \[...\]，输出独立段落
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) => {
    return `\n\n${stash(renderMath(tex.trim(), true))}\n\n`;
  });
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_match, tex: string) => {
    return `\n\n${stash(renderMath(tex.trim(), true))}\n\n`;
  });

  // 行内公式：\(...\)，不允许跨空行，避免误吞大段正文
  text = text.replace(/\\\(((?:(?!\n[ \t]*\n)[\s\S])+?)\\\)/g, (_match, tex: string) => {
    return stash(renderMath(tex.trim(), false));
  });

  // 行内公式：$...$，要求 $ 前后不是空白，且不跨行，降低对普通 $ 符号的误判
  text = text.replace(/(^|[^\\$])\$(?!\s)([^\n$]+?)(?<!\s)\$(?!\$)/g,
      (_match, prefix: string, tex: string) => `${prefix}${stash(renderMath(tex, false))}`);

  // 代码片段还原，交回 marked 正常解析
  text = text.replace(/@@MDCODE(\d+)@@/g, (_match, index: string) => codeSlots[Number(index)]);

  return {text, slots};
}

function restoreMath(html: string, slots: MathSlot[]): string {
  let result = html;
  // 倒序回填，避免 token 前缀互相干扰
  for (let i = slots.length - 1; i >= 0; i--) {
    result = result.split(slots[i].token).join(slots[i].html);
  }
  return result;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
});

marked.use({
  renderer: {
    // Mermaid 代码块输出占位容器，供后续绘制
    code({text, lang}) {
      const language = (lang || '').trim().toLowerCase();
      if (language === MERMAID_LANG) {
        return `<div class="mermaid-block" data-mermaid="${encodeURIComponent(text)}"></div>`;
      }
      return false;
    },
  },
});

/**
 * 将 Markdown 源码渲染为可安全插入 DOM 的 HTML 字符串。
 */
export function renderMarkdown(source: string): string {
  if (!source.trim()) {
    return '';
  }

  const {text, slots} = extractMath(source);
  const raw = marked.parse(text, {async: false}) as string;
  const withMath = restoreMath(raw, slots);

  return DOMPurify.sanitize(withMath, {
    ADD_TAGS: ['math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt'],
    ADD_ATTR: ['data-mermaid', 'aria-hidden', 'encoding'],
    // KaTeX 需要保留 style 与 class 才能正确排版
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  });
}

/**
 * 在已插入 DOM 的预览容器内绘制 Mermaid 图表。
 * 图表源码经过转义后写入，避免破坏页面结构。
 */
export async function renderMermaidBlocks(container: HTMLElement): Promise<number> {
  const blocks = Array.from(
      container.querySelectorAll<HTMLElement>('.mermaid-block:not([data-rendered])')
  );
  if (blocks.length === 0) {
    return 0;
  }

  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'neutral',
    fontFamily: 'Inter, "Microsoft YaHei", sans-serif',
  });

  let rendered = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const code = decodeURIComponent(block.dataset.mermaid || '');
    block.dataset.rendered = 'true';
    if (!code.trim()) {
      continue;
    }
    try {
      const {svg} = await mermaid.render(`mermaid-svg-${Date.now()}-${i}`, code);
      block.innerHTML = svg;
      block.classList.add('mermaid-ready');
      rendered++;
    } catch (error) {
      console.warn('Mermaid 渲染失败', error);
      block.classList.add('mermaid-failed');
      block.textContent = `Mermaid 图表渲染失败：${(error as Error)?.message || '语法错误'}`;
    }
  }

  return rendered;
}

/** 历史记录中残留的 mermaid 临时节点清理 */
export function cleanupMermaidArtifacts(): void {
  document.querySelectorAll('body > #dmermaid-svg, body > div[id^="dmermaid"]').forEach(node => node.remove());
}