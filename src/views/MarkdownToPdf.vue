<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {ElMessage} from 'element-plus';
import NProgress from 'nprogress';
import 'katex/dist/katex.min.css';
import {cleanupMermaidArtifacts, renderMarkdown, renderMermaidBlocks} from '../utils/markdownRender';
import {exportElementToPdf} from '../utils/markdownToPdf';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_EXTENSIONS = ['.md', '.markdown', '.txt'];

const SAMPLE_MARKDOWN = `# Markdown 转 PDF 示例

将 Markdown 内容一键导出为专业的 **A4 PDF** 文档，支持 *斜体*、\`行内代码\` 与 [超链接](https://example.com)。

## 1. 列表与任务

- 有序、无序列表
- 任务清单：
  - [x] 上传或粘贴 Markdown
  - [x] 检查实时预览
  - [ ] 下载 PDF 并分享

## 2. 表格

| 功能 | 说明 | 状态 |
| --- | --- | --- |
| 标题层级 | 保留 H1 - H6 | 已完成 |
| 代码块 | 等宽字体与浅色底 | 已完成 |
| 数学公式 | KaTeX 渲染 | 已完成 |

## 3. 代码块

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## 4. 数学公式

行内公式：质能方程 $E = mc^2$，勾股定理 $a^2 + b^2 = c^2$。

独立公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$

## 5. Mermaid 图表

\`\`\`mermaid
graph TD
    A[粘贴 Markdown] --> B{预览检查}
    B -->|通过| C[导出 A4 PDF]
    B -->|调整| A
\`\`\`

## 6. 引用

> 使用 Markdown 转 PDF 工具，可以把标题、表格、代码块、数学公式和 Mermaid 图表导出为 A4 PDF。
`;

const markdown = ref('');
const fileName = ref('markdown');
const previewRef = ref<HTMLElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isExporting = ref(false);
const exportProgress = ref(0);
const renderError = ref('');
const mermaidCount = ref(0);
/** 上次编辑内容是否有缓存（用于按钮禁用态与初始探测） */
const hasCache = ref(false);

/** 字号设置单独持久化，页面加载时读取 */
const FONT_SIZE_KEY = 'kaa-tools.markdown-to-pdf.font-size';
const DEFAULT_FONT_SIZE = 13;
const FONT_SIZE_RANGE = {min: 10, max: 18};

function readFontSize(): number {
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    if (!raw) return DEFAULT_FONT_SIZE;
    const size = Number(raw);
    if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE;
    return Math.min(FONT_SIZE_RANGE.max, Math.max(FONT_SIZE_RANGE.min, Math.round(size)));
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

// 仅保留可调项：正文字号（纸张、方向、页边距、清晰度、文件名均使用固定默认值）
const settings = ref({
  fontSize: DEFAULT_FONT_SIZE,
});

watch(() => settings.value.fontSize, (size) => {
  try {
    localStorage.setItem(FONT_SIZE_KEY, String(size));
  } catch {
    // 存储不可用时忽略，字号在当前会话内仍然生效
  }
});

const charCount = computed(() => markdown.value.length);
const byteSize = computed(() => new Blob([markdown.value]).size);
const lineCount = computed(() => (markdown.value ? markdown.value.split(/\r\n|\r|\n/).length : 0));
const renderedHtml = computed(() => renderMarkdown(markdown.value));
const sizeLabel = computed(() => formatBytes(byteSize.value));
const isOversize = computed(() => byteSize.value > MAX_FILE_SIZE);

const sampleLines = SAMPLE_MARKDOWN.split('\n').length;

/** 本地缓存：只保存一份 Markdown 内容，由「保存缓存」按钮主动写入 */
const CACHE_KEY = 'kaa-tools.markdown-to-pdf.content';

interface CachedDraft {
  markdown: string;
  fileName: string;
}

function readCache(): CachedDraft | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedDraft>;
    if (typeof parsed?.markdown !== 'string' || !parsed.markdown.trim()) return null;
    return {
      markdown: parsed.markdown,
      fileName: typeof parsed.fileName === 'string' && parsed.fileName ? parsed.fileName : 'markdown',
    };
  } catch {
    return null;
  }
}

/** 主动保存当前 Markdown 到 localStorage */
function saveCache() {
  if (!markdown.value.trim()) {
    ElMessage.warning('当前没有可保存的内容');
    return;
  }
  try {
    const draft: CachedDraft = {markdown: markdown.value, fileName: fileName.value};
    localStorage.setItem(CACHE_KEY, JSON.stringify(draft));
    hasCache.value = true;
    ElMessage.success('已保存到本地缓存');
  } catch {
    // 隐私模式或超出配额时给出提示，不影响主流程
    ElMessage.error('保存失败，浏览器存储不可用或已满');
  }
}

/** 读取缓存并覆盖当前编辑内容 */
function loadCache() {
  const draft = readCache();
  if (!draft) {
    hasCache.value = false;
    ElMessage.warning('没有可读取的缓存内容');
    return;
  }
  markdown.value = draft.markdown;
  fileName.value = draft.fileName;
  renderError.value = '';
  ElMessage.success('已加载缓存内容');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 预览渲染后绘制 Mermaid 图表 */
async function refreshPreview() {
  await nextTick();
  const container = previewRef.value;
  if (!container) return;
  try {
    mermaidCount.value = await renderMermaidBlocks(container);
    renderError.value = '';
  } catch (error) {
    renderError.value = (error as Error)?.message || '预览渲染失败';
  } finally {
    cleanupMermaidArtifacts();
  }
}

watch(renderedHtml, () => {
  refreshPreview();
}, {immediate: true});

onMounted(() => {
  // 读取持久化的字号，页面加载即生效
  settings.value.fontSize = readFontSize();
  refreshPreview();
  // 探测是否已有缓存，用于「加载缓存」的可用状态
  hasCache.value = readCache() !== null;
});

onBeforeUnmount(() => {
  cleanupMermaidArtifacts();
});

function loadSample() {
  markdown.value = SAMPLE_MARKDOWN;
  fileName.value = 'markdown-sample';
  ElMessage.success('已加载示例内容');
}

function clearAll() {
  markdown.value = '';
  fileName.value = 'markdown';
  renderError.value = '';
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some(ext => name.endsWith(ext));
}

async function readFile(file: File) {
  if (!isAcceptedFile(file)) {
    ElMessage.error('仅支持 .md、.markdown、.txt 文件');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error(`文件过大（${formatBytes(file.size)}），最大支持 2 MB`);
    return;
  }

  try {
    const text = await file.text();
    markdown.value = text;
    fileName.value = file.name.replace(/\.(md|markdown|txt)$/i, '') || 'markdown';
    ElMessage.success(`已载入 ${file.name}`);
  } catch {
    ElMessage.error('文件读取失败，请重试');
  }
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    readFile(file);
  }
  target.value = '';
}

function onDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    readFile(file);
  }
}

function onDragOver() {
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function copyMarkdown() {
  if (!markdown.value) {
    ElMessage.warning('没有可复制的内容');
    return;
  }
  navigator.clipboard.writeText(markdown.value)
      .then(() => ElMessage.success('Markdown 内容已复制'))
      .catch(() => ElMessage.error('复制失败，请手动选择文本'));
}

async function downloadPdf() {
  const element = previewRef.value;
  if (!element || !markdown.value.trim()) {
    ElMessage.warning('请先输入 Markdown 内容');
    return;
  }
  if (isOversize.value) {
    ElMessage.error('内容超过 2 MB 上限，请拆分文档后再导出');
    return;
  }

  isExporting.value = true;
  exportProgress.value = 0;
  NProgress.start();

  try {
    await exportElementToPdf(element, {
      title: fileName.value || 'markdown',
      onProgress: (progress) => {
        exportProgress.value = progress;
        NProgress.set(progress);
      },
    });
    ElMessage.success('PDF 已生成，请查看浏览器下载');
  } catch (error) {
    console.error('PDF 导出失败', error);
    ElMessage.error('PDF 生成失败，请稍后重试或减少文档长度');
  } finally {
    isExporting.value = false;
    exportProgress.value = 0;
    NProgress.done();
  }
}
</script>

<template>
  <div id="markdown-to-pdf" class="tool-page">
    <!-- 顶部两栏：左为标题区（按文字宽度自适应），右为上传面板（占满剩余空间） -->
    <div class="top-row">
      <header class="tool-header">
        <span class="tool-eyebrow">Document export</span>
        <h1 class="tool-title">Markdown 转 PDF</h1>
        <p class="tool-description">
          将 Markdown 内容一键导出为专业 A4 PDF 文档，支持标题层级、表格、代码块、KaTeX 数学公式与 Mermaid 图表。
          全部处理在浏览器本地完成，内容不会上传到任何服务器。
        </p>
      </header>

      <section class="upload-panel surface-card">
      <div class="upload-row">
        <div
            class="dropzone"
            :class="{ 'is-dragging': isDragging }"
            role="button"
            tabindex="0"
            @click="fileInputRef?.click()"
            @keydown.enter.prevent="fileInputRef?.click()"
            @keydown.space.prevent="fileInputRef?.click()"
            @dragover.prevent="onDragOver"
            @dragenter.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
        >
          <div class="dropzone-icon" aria-hidden="true">
            <i></i><i></i><i></i>
          </div>
          <div class="dropzone-copy">
            <strong>上传 Markdown 文件</strong>
            <p>将 .md、.markdown 或 .txt 文件拖到此处，或点击选择文件</p>
            <small>支持 .md、.markdown、.txt 文件，最大 2 MB</small>
            <div class="dropzone-meta">
              <span>当前文本：{{ charCount }} 个字符</span>
              <span>{{ lineCount }} 行 · {{ sizeLabel }}</span>
            </div>
          </div>
        </div>

        <!-- 与上传区并排，不嵌套：避免拖拽/键盘事件误触发上传 -->
        <div class="upload-controls">
          <label class="font-field">
            <span>正文字号：{{ settings.fontSize }} px</span>
            <input v-model.number="settings.fontSize" type="range" min="10" max="18" step="1"/>
          </label>
          <button
              type="button"
              class="download-button"
              :disabled="isExporting || !markdown.trim()"
              @click="downloadPdf"
          >
            {{ isExporting ? '生成中…' : '下载 PDF' }}
            <i aria-hidden="true">↓</i>
          </button>
        </div>
      </div>
      <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          @change="onFileChange"
      />
      </section>
    </div>

    <main class="workspace">
      <section class="editor-panel surface-card">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-number">01</span>
            <div>
              <h2>编辑 Markdown 内容</h2>
              <p>{{ lineCount }} 行 · {{ sampleLines }} 行示例内容</p>
            </div>
          </div>
          <div class="panel-actions">
            <button type="button" @click="loadSample">加载示例</button>
            <button type="button" @click="copyMarkdown">复制</button>
            <button type="button" @click="clearAll">清空</button>
            <button type="button" @click="saveCache">保存缓存</button>
            <button type="button" :disabled="!hasCache" @click="loadCache">加载缓存</button>
          </div>
        </div>

        <textarea
            v-model="markdown"
            spellcheck="false"
            placeholder="# 在这里输入 Markdown&#10;&#10;支持标题、表格、代码块、$公式$ 与 mermaid 图表。"
        ></textarea>

        <div class="editor-footer">
          <span :class="{ 'text-danger': isOversize }">
            {{ sizeLabel }} / 2 MB
          </span>
          <span v-if="renderError" class="text-danger">{{ renderError }}</span>
        </div>
      </section>

      <section class="preview-panel surface-card">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-number">02</span>
            <div>
              <h2>实时预览</h2>
              <p>
                连续滚动预览，实际分页以下载后的 PDF 为准
                <template v-if="mermaidCount > 0"> · {{ mermaidCount }} 个图表</template>
              </p>
            </div>
          </div>
          <span class="format-chip">A4 · 纵向</span>
        </div>

        <div class="paper-scroll">
          <article
              v-if="markdown.trim()"
              ref="previewRef"
              class="markdown-body"
              :style="{ fontSize: settings.fontSize + 'px' }"
              v-html="renderedHtml"
          ></article>
          <div v-else class="preview-empty">
            <div class="empty-icon" aria-hidden="true"><i></i><i></i><i></i></div>
            <p>Markdown 预览结果将显示在这里</p>
            <button type="button" class="ghost-button" @click="loadSample">加载示例内容</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
#markdown-to-pdf {
  width: 100%;
  /* 固定为滚动容器高度，使 workspace 占据顶栏之外的剩余空间；
     内容过高时由内部编辑区/预览区各自滚动，而不是整页滚动 */
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部两栏：标题区按文字宽度自适应，上传面板占满剩余空间 */
.top-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  margin-bottom: 18px;
}

.tool-header {
  margin: 0;
}

.tool-description {
  max-width: 420px;
}

.upload-panel {
  width: 100%;
  margin: 0;
  padding: 16px;
}

/* 上传区与右侧控件并排，二者互为兄弟节点，事件互不干扰 */
.upload-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
}

.dropzone {
  display: grid;
  /* 图标 | 上传说明 */
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  padding: 20px 22px;
  border: 1.5px dashed var(--line-strong);
  border-radius: 20px;
  background: #fafcfb;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

  &:hover,
  &:focus-visible {
    border-color: rgba(17, 168, 121, 0.45);
    background: var(--accent-soft);
  }

  &.is-dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
    transform: scale(1.005);
  }
}

.dropzone-icon {
  width: 46px;
  height: 54px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid rgba(17, 168, 121, 0.2);
  border-radius: 12px;
  background: var(--accent-soft);

  i {
    height: 2px;
    border-radius: 99px;
    background: #54be9b;

    &:last-child {
      width: 62%;
    }
  }
}

.dropzone-copy {
  min-width: 0;

  strong {
    display: block;
    margin-bottom: 5px;
    color: var(--ink);
    font-size: 0.95rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0 0 5px;
    color: var(--muted);
    font-size: 0.76rem;
  }

  small {
    color: #93a19c;
    font-size: 0.68rem;
  }
}

.dropzone-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 8px;
  color: #93a19c;
  font-size: 0.68rem;
}

.file-input {
  display: none;
}

.workspace {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 0 0 18px;
  /* 占据顶栏之后的剩余高度 */
  flex: 1 1 auto;
  min-height: 0;
}

.editor-panel,
.preview-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(18px, 2.6vw, 26px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  flex: 1 1 auto;

  h2 {
    margin: 0 0 3px;
    color: var(--ink);
    /* 标题不换行，避免右侧按钮组被挤到第二行 */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.68rem;
  }
}

.panel-number {
  width: 30px;
  height: 30px;
  display: grid;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 9px;
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.64rem;
}

.panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
  /* 按钮组保持完整宽度，不被标题挤压换行 */
  flex: 0 0 auto;

  button {
    min-height: 32px;
    padding: 0 9px;
    font-size: 0.66rem;
    white-space: nowrap;
  }
}

button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: #334943;
  background: #f6faf8;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 650;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;

  &:hover:not(:disabled) {
    border-color: rgba(17, 168, 121, 0.34);
    background: #fff;
    transform: translateY(-1px);
  }

  &:disabled {
    color: #a6b2ae;
    cursor: not-allowed;
  }
}

.format-chip {
  padding: 6px 9px;
  border-radius: 8px;
  color: #7e8d88;
  background: var(--surface-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 700;
  white-space: nowrap;
}

textarea {
  width: 100%;
  min-height: 320px;
  flex: 1 1 auto;
  padding: 18px;
  resize: vertical;
  border: 1px solid var(--line);
  border-radius: 15px;
  outline: none;
  color: #263d37;
  background: #f7faf9;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.7;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: #a8b3af;
  }

  &:focus {
    border-color: var(--accent);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(17, 168, 121, 0.1);
  }
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  color: var(--muted);
  font-size: 0.68rem;
}

.text-danger {
  color: #cf4b47;
  font-weight: 600;
}

.paper-scroll {
  /* 高度由父级剩余空间决定，不再固定，避免出现双重滚动 */
  min-height: 320px;
  flex: 1 1 auto;
  padding: 8px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: #eef3f1;
}

/* PDF 导出区域：白底、可读排版，导出与预览共用同一套样式 */
.markdown-body {
  min-height: 100%;
  padding: clamp(26px, 4vw, 44px);
  border-radius: 10px;
  color: #1d2a27;
  background: #ffffff;
  box-shadow: 0 8px 26px rgba(24, 54, 47, 0.08);
  line-height: 1.75;
  overflow-wrap: break-word;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 1.5em 0 0.6em;
    color: #11201d;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.3;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h1) {
    padding-bottom: 0.35em;
    border-bottom: 2px solid #e2ece8;
    font-size: 1.9em;
  }

  :deep(h2) {
    padding-bottom: 0.3em;
    border-bottom: 1px solid #e7efec;
    font-size: 1.5em;
  }

  :deep(h3) { font-size: 1.24em; }
  :deep(h4) { font-size: 1.08em; }
  :deep(h5) { font-size: 0.98em; }

  :deep(h6) {
    color: #5d6b67;
    font-size: 0.92em;
  }

  :deep(p) {
    margin: 0 0 1em;
  }

  :deep(a) {
    color: #0d8a63;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :deep(strong) { font-weight: 700; }
  :deep(em) { font-style: italic; }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 1em;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.3em 0;
  }

  :deep(li > ul),
  :deep(li > ol) {
    margin: 0.3em 0;
  }

  :deep(input[type='checkbox']) {
    margin-right: 6px;
    accent-color: var(--accent);
  }

  :deep(blockquote) {
    margin: 0 0 1em;
    padding: 0.6em 1.1em;
    border-left: 4px solid #4bc39b;
    border-radius: 0 8px 8px 0;
    color: #47574f;
    background: #f4faf7;

    p:last-child {
      margin-bottom: 0;
    }
  }

  :deep(code) {
    padding: 0.15em 0.4em;
    border-radius: 5px;
    color: #b4325a;
    background: #f2f6f4;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.88em;
  }

  :deep(pre) {
    margin: 0 0 1.2em;
    padding: 14px 16px;
    overflow-x: auto;
    border: 1px solid #e3ece9;
    border-radius: 10px;
    background: #f7faf9;
    line-height: 1.6;

    code {
      padding: 0;
      color: #263d37;
      background: transparent;
      font-size: 0.84em;
    }
  }

  :deep(table) {
    width: 100%;
    margin: 0 0 1.2em;
    border-collapse: collapse;
    font-size: 0.92em;
    table-layout: fixed;
  }

  :deep(th),
  :deep(td) {
    padding: 8px 11px;
    border: 1px solid #dfe9e5;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }

  :deep(th) {
    color: #17332b;
    background: #eef7f3;
    font-weight: 700;
  }

  :deep(tr:nth-child(even) td) {
    background: #fbfdfc;
  }

  :deep(hr) {
    height: 1px;
    margin: 1.8em 0;
    border: 0;
    background: #e2ece8;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }

  :deep(.katex-display) {
    margin: 1.2em 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  :deep(.math-error) {
    color: #c0392b;
    background: #fdf0ee;
  }

  :deep(.mermaid-block) {
    display: flex;
    justify-content: center;
    margin: 0 0 1.2em;
    padding: 14px;
    border: 1px solid #e3ece9;
    border-radius: 10px;
    background: #fbfdfc;
    overflow-x: auto;

    svg {
      max-width: 100%;
      height: auto;
    }
  }

  :deep(.mermaid-failed) {
    color: #b03a2e;
    background: #fdf0ee;
    font-size: 0.82em;
  }
}

.preview-empty {
  min-height: 320px;
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px dashed var(--line-strong);
  border-radius: 12px;
  color: var(--muted);
  background: #fafcfb;

  p {
    margin: 0;
    font-size: 0.74rem;
  }
}

.empty-icon {
  width: 46px;
  height: 54px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 1px solid rgba(17, 168, 121, 0.18);
  border-radius: 12px;
  background: var(--accent-soft);

  i {
    height: 2px;
    border-radius: 99px;
    background: #54be9b;

    &:last-child {
      width: 60%;
    }
  }
}

.ghost-button {
  margin-top: 4px;
}

/* 与「上传 Markdown 文件」同排：字号调节 + 下载按钮 */
.upload-controls {
  display: grid;
  gap: 8px;
  width: 240px;
  flex: 0 0 auto;
}

.font-field {
  display: grid;
  gap: 4px;
  width: 100%;

  > span {
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 620;
    white-space: nowrap;
  }

  input[type='range'] {
    width: 100%;
    height: 20px;
    accent-color: var(--accent);
    cursor: pointer;
  }
}

.download-button {
  min-width: 156px;
  min-height: 46px;
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
  box-shadow: 0 10px 26px rgba(17, 168, 121, 0.22);
  font-size: 0.82rem;

  &:hover:not(:disabled) {
    border-color: var(--accent-strong);
    background: var(--accent-strong);
  }

  &:disabled {
    border-color: #c9d5d1;
    color: #fff;
    background: #c9d5d1;
    box-shadow: none;
    cursor: not-allowed;
  }

  i {
    margin-left: 9px;
    font-style: normal;
    font-weight: 700;
  }
}

/* 顶部两栏需要足够宽度，低于此值改为上下堆叠 */
@media (max-width: 1360px) {
  .top-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .tool-description {
    max-width: 680px;
  }
}

@media (max-width: 1040px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  textarea {
    min-height: 340px;
  }

  .preview-empty,
  .paper-scroll {
    min-height: 420px;
  }
}

@media (max-width: 720px) {
  .upload-row {
    grid-template-columns: 1fr;
  }

  .dropzone {
    grid-template-columns: auto 1fr;
    gap: 14px;
    padding: 16px;
  }

  .upload-controls {
    width: 100%;
  }

  .download-button {
    width: 100%;
  }

  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-actions {
    justify-content: flex-start;
  }
}
</style>