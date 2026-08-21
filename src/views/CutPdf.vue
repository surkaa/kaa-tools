<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist";
import {PDFDocument} from "pdf-lib";
import {computed, nextTick, onMounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import dayjs from "dayjs";
import NProgress from 'nprogress';

pdfLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

let pdf: PDFDocumentProxy | null = null;
const pageCount = ref(0);
const renderScale = ref(0.5);
const scaleStep = computed(() => {
  const s = renderScale.value;
  if (0.5 <= s && s < 1) {
    return 0.1;
  } else if (s < 1.5) {
    return 0.2;
  } else {
    return 0.3;
  }
})
const selected = ref<number[]>([]);
const renderSuccessList = ref<number[]>([]); // 用于存储渲染成功的页面
const pdfKey = ref(dayjs().valueOf());
const showDetailDialog = ref({
  visible: false,
  page: 0,
});
const originalPdfBytes = ref<ArrayBuffer | null>(null);
const originalFileName = ref('');
const pageStr = computed(() => formatPageNumbers(selected.value));
const dialogCanvas = ref<HTMLCanvasElement | null>(null);

const renderToCanvas = async (page: PDFPageProxy, canvas: HTMLCanvasElement, scale: number) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    ElMessage.error('无法渲染页面，退出渲染');
    return;
  }
  const viewport = page.getViewport({scale});
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;
}

const renderPage = async (num: number) => {
  if (!pdf) return;
  try {
    const page = await pdf.getPage(num);
    const canvas = document.getElementById(`page-${num}`) as HTMLCanvasElement;
    await renderToCanvas(page, canvas, renderScale.value);
    // 渲染成功的页面加入列表
    renderSuccessList.value.push(num);
    if (num < pageCount.value) {
      const p = num / pageCount.value;
      console.log(`渲染进度：${p}`);
      NProgress.set(p);
      await nextTick(() => renderPage(num + 1));
    } else {
      NProgress.done();
    }
  } catch (err) {
    console.error('渲染错误', err);
    ElMessage.error(`渲染第${num}页出现错误`);
  }
}

const inputChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  originalFileName.value = file.name.replace(/.pdf$/i, '');

  // 读取文件内容保存到originalPdfBytes
  const reader = new FileReader();
  reader.onload = (e) => {
    originalPdfBytes.value = e.target?.result as ArrayBuffer;
  };
  reader.readAsArrayBuffer(file);

  const url = URL.createObjectURL(file);
  const loadingTask = pdfLib.getDocument({
    url,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/cmaps/',
    cMapPacked: true,
  });
  loadingTask.promise.then(pdfDoc => {
    selected.value = [];
    pdfKey.value = dayjs().valueOf();
    pageCount.value = pdfDoc.numPages;
    pdf = pdfDoc;
    // 渲染成功的页面列表清空
    renderSuccessList.value = [];
    NProgress.start();
    // 从第一页开始渲染
    nextTick(() => renderPage(1));
  }).catch(_err => ElMessage.error('加载错误'))
      .finally(() => URL.revokeObjectURL(url)); // 释放URL对象
}

const showDetail = (page: number) => {
  if (!pdf) return;
  showDetailDialog.value = {
    visible: true,
    page,
  }
  pdf.getPage(page).then((page) => {
    if (!dialogCanvas.value) {
      ElMessage.error('页面异常，请刷新页面然后重试');
      return;
    }
    renderToCanvas(page, dialogCanvas.value, 3);
  });
}

const selectPage = (page: number) => {
  if (selected.value.includes(page)) {
    selected.value = selected.value.filter(p => p !== page);
  } else {
    selected.value.push(page);
  }
}

const clearSelected = () => {
  selected.value = [];
}

const selectAll = () => {
  selected.value = Array.from({length: pageCount.value}, (_, i) => i + 1);
}

// 添加页码格式化函数
const formatPageNumbers = (pages: number[]): string => {
  if (pages.length === 0) return '';

  const sorted = [...pages].sort((a, b) => a - b);
  const result: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      result.push(start === end ? `${start}` : `${start}~${end}`);
      start = end = sorted[i];
    }
  }
  result.push(start === end ? `${start}` : `${start}~${end}`);

  return result.join(',');
};

const download = async () => {
  if (!originalPdfBytes.value || selected.value.length === 0) {
    ElMessage.error('请先选择文件并选中页面');
    return;
  }
  try {
    // 加载原始PDF
    const originalPdf = await PDFDocument.load(originalPdfBytes.value);
    // 创建新PDF文档
    const newPdf = await PDFDocument.create();
    // 按页码排序选中的页面
    const sortedPages = selected.value.sort((a, b) => a - b);

    // 复制每一页到新PDF
    for (const pageNum of sortedPages) {
      const [copiedPage] = await newPdf.copyPages(originalPdf, [pageNum - 1]); // 转换为0-based索引
      newPdf.addPage(copiedPage);
    }

    // 生成PDF文件并下载
    const pdfBytes = await newPdf.save();

    // 生成文件名
    const baseName = originalFileName.value || 'document';
    const fileName = `${baseName}-${pageStr.value}.pdf`;

    const blob = new Blob([pdfBytes], {type: 'application/pdf'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    ElMessage.error('生成PDF失败');
    console.error(err);
  }
}

onMounted(() => {
  watch(renderScale, () => {
    pdfKey.value = dayjs().valueOf();
    // 从第一页开始渲染
    nextTick(() => renderPage(1));
  });
  // 在对话框关闭时释放canvas资源
  watch(() => showDetailDialog.value.visible, (visible) => {
    if (!visible && dialogCanvas.value) {
      dialogCanvas.value.getContext('2d')?.clearRect(0, 0, dialogCanvas.value.width, dialogCanvas.value.height);
    }
  });
});
</script>

<template>
  <div id="cut-pdf" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Document utility</span>
      <h1 class="tool-title">PDF 页面裁剪</h1>
      <p class="tool-description">上传 PDF，直观选择需要保留的页面，并生成一份新的文档。</p>
    </header>

    <main class="pdf-workspace surface-card">
      <section id="pdf-view">
        <div v-if="pageCount === 0" class="pdf-empty">
          <div class="document-symbol"><i></i><i></i><i></i></div>
          <h2>先选择一份 PDF 文档</h2>
          <p>上传后会在这里生成页面缩略图，点击页面即可选择。</p>
        </div>

        <div
            v-for="page in pageCount" :key="pdfKey + page"
            class="page" :class="{'selected': selected.includes(page), 'rendering': !renderSuccessList.includes(page)}"
        >
          <canvas :id="`page-${page}`" @click="selectPage(page)"/>
          <span class="page-number" v-text="page"/>
          <div class="hover-show">
            <div class="checkbox" @click="selectPage(page)">
              <input type="checkbox" :checked="selected.includes(page)"/>
            </div>
            <button class="magnify" type="button" title="查看大图" @click="showDetail(page)">↗</button>
          </div>
        </div>
      </section>

      <aside id="operate">
        <div class="operate-title">
          <span>DOCUMENT</span>
          <h2>页面操作</h2>
          <p>选择文件后，挑选需要导出的页面。</p>
        </div>

        <div class="upload-control">
          <input id="pdf-file-input" type="file" @change="inputChange" accept="application/pdf"/>
          <label for="pdf-file-input"><i>＋</i><span>选择 PDF 文件</span></label>
        </div>

        <div v-show="pageCount > 0" class="document-stats">
          <div><strong>{{ pageCount }}</strong><span>总页数</span></div>
          <div><strong>{{ selected.length }}</strong><span>已选择</span></div>
        </div>

        <div class="scale" v-show="pageCount > 0">
          <label for="scale-input-number">缩略图大小</label>
          <el-input-number id="scale-input-number" v-model="renderScale" :step="scaleStep" :max="2" :min="0.5"/>
        </div>

        <el-button-group v-show="pageCount > 0" class="selected-operate-group">
          <el-button v-show="selected.length > 0" @click="clearSelected" type="danger">清除选中</el-button>
          <el-button v-show="pageCount != selected.length" @click="selectAll">全选页面</el-button>
        </el-button-group>

        <el-button
            v-show="selected.length > 0"
            class="download-button"
            @click="download"
            :disabled="selected.length === pageCount"
            :title="selected.length === pageCount ? '与原文件相同，无法下载' : ''"
            type="primary"
        >
          下载第 {{ pageStr }} 页
        </el-button>

        <div class="operate-note">
          <i></i>
          <span>生成过程在浏览器内完成，文件不会被上传。</span>
        </div>
      </aside>
    </main>

    <el-dialog v-model="showDetailDialog.visible" :lock-scroll="false">
      <template #header>
        <span>第{{ showDetailDialog.page + 1 }}页</span>
      </template>
      <div class="dialog-canvas">
        <canvas ref="dialogCanvas" style="max-width: 100%; max-height: 100%;"/>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
#cut-pdf {
  width: 100%;
}

.pdf-workspace {
  width: min(100%, 1320px);
  min-height: 570px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  margin: 0 auto;
  overflow: hidden;
}

#pdf-view {
  position: relative;
  max-height: 68vh;
  min-height: 570px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 22px;
  padding: 30px;
  overflow: auto;
  background:
      linear-gradient(45deg, rgba(22, 61, 50, 0.025) 25%, transparent 25%, transparent 75%, rgba(22, 61, 50, 0.025) 75%),
      linear-gradient(45deg, rgba(22, 61, 50, 0.025) 25%, transparent 25%, transparent 75%, rgba(22, 61, 50, 0.025) 75%),
      #f7faf9;
  background-position: 0 0, 12px 12px;
  background-size: 24px 24px;
}

.pdf-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 30px;
  text-align: center;

  h2 {
    margin: 20px 0 7px;
    color: #314842;
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.73rem;
  }
}

.document-symbol {
  width: 58px;
  height: 68px;
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid rgba(17, 168, 121, 0.2);
  border-radius: 15px;
  background: var(--accent-soft);
  box-shadow: 0 12px 30px rgba(17, 168, 121, 0.1);

  i {
    height: 2px;
    border-radius: 99px;
    background: #58bd9b;

    &:last-child { width: 62%; }
  }
}

.page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 8px 10px;
  border: 2px solid transparent;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(31, 65, 56, 0.09);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    box-shadow: 0 14px 34px rgba(31, 65, 56, 0.14);
    transform: translateY(-3px);

    .hover-show { opacity: 1; }
  }

  &.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 4px rgba(17, 168, 121, 0.12), 0 14px 34px rgba(31, 65, 56, 0.12);

    .hover-show { opacity: 1; }
    .page-number { color: var(--accent-strong); }
  }

  &.rendering {
    min-width: 160px;
    min-height: 220px;
    background: linear-gradient(100deg, #edf2f0 20%, #f7faf9 40%, #edf2f0 60%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;

    .hover-show,
    .page-number { display: none; }
  }

  canvas {
    display: block;
    max-width: 100%;
    border-radius: 8px;
    cursor: pointer;
  }

  .page-number {
    margin-top: 9px;
    color: #798782;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 0.67rem;
    font-weight: 650;
  }

  .hover-show {
    position: absolute;
    top: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.18s ease;
  }

  .checkbox {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: rgba(7, 27, 21, 0.78);
    cursor: pointer;

    input {
      accent-color: #33c594;
      pointer-events: none;
    }
  }

  .magnify {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 8px;
    color: #dff8ef;
    background: rgba(7, 27, 21, 0.78);
    cursor: pointer;
    font-size: 0.78rem;
  }
}

@keyframes shimmer {
  to { background-position: -200% 0; }
}

#operate {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 30px 24px;
  border-left: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
}

.operate-title {
  span {
    color: var(--accent-strong);
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.16em;
  }

  h2 {
    margin: 7px 0;
    color: #263d37;
    font-size: 1.25rem;
    letter-spacing: -0.035em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.6;
  }
}

.upload-control {
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
  }

  label {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border: 1px dashed rgba(17, 168, 121, 0.38);
    border-radius: 12px;
    color: var(--accent-strong);
    background: var(--accent-soft);
    cursor: pointer;
    font-size: 0.76rem;
    font-weight: 650;

    i {
      font-size: 1.05rem;
      font-style: normal;
    }
  }
}

.document-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  > div {
    display: grid;
    gap: 3px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: #f7faf9;

    strong {
      color: #24453b;
      font-size: 1.25rem;
    }

    span {
      color: var(--muted);
      font-size: 0.64rem;
    }
  }
}

.scale {
  display: grid;
  gap: 8px;

  label {
    color: #53625e;
    font-size: 0.7rem;
    font-weight: 650;
  }
}

:deep(.scale .el-input-number) {
  width: 100%;
  min-height: 43px;
}

.selected-operate-group {
  width: 100%;
  display: flex;

  :deep(.el-button) {
    flex: 1;
  }
}

.download-button {
  width: 100%;
  min-height: 48px;
  white-space: normal;
}

.operate-note {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.65rem;
  line-height: 1.55;

  i {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    margin-top: 3px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px rgba(17, 168, 121, 0.1);
  }
}

.dialog-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 900px) {
  .pdf-workspace {
    grid-template-columns: 1fr;
  }

  #pdf-view {
    min-height: 480px;
    max-height: none;
  }

  #operate {
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .operate-note {
    margin-top: 10px;
  }
}

@media (max-width: 560px) {
  .pdf-workspace {
    border-radius: 22px;
  }

  #pdf-view {
    min-height: 420px;
    justify-content: center;
    padding: 20px;
  }

  #operate {
    padding: 24px 18px;
  }
}
</style>
