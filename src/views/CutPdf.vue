<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist";
import {PDFDocument} from "pdf-lib";
import {computed, nextTick, onMounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

pdfLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

let pdf: PDFDocumentProxy | null = null;
const pageCount = ref(0);
const renderScale = ref(0.5);
const selected = ref<number[]>([]);
const pdfKey = ref(dayjs().valueOf());
const showDetailDialog = ref({
  visiable: false,
  page: 0,
});
const originalPdfBytes = ref<ArrayBuffer | null>(null);
const originalFileName = ref('');
const pageStr = computed(() => formatPageNumbers(selected.value));

const renderToCanvas = (page: PDFPageProxy, canvas: HTMLCanvasElement, scale: number) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    ElMessage.error('无法渲染页面，退出渲染');
    return;
  }
  const viewport = page.getViewport({scale});
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  page.render({
    canvasContext: ctx,
    viewport
  });
}

const renderPage = (num: number) => {
  if (!pdf) return;
  pdf.getPage(num).then((page) => {
    const canvas = document.getElementById(`page-${num}`) as HTMLCanvasElement;
    renderToCanvas(page, canvas, renderScale.value);
    if (num < pageCount.value) {
      nextTick(() => renderPage(num + 1));
    }
  })
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
    // 从第一页开始渲染
    nextTick(() => renderPage(1));
  }).catch(_err => ElMessage.error('加载错误'));
}

const showDetail = (page: number) => {
  if (!pdf) return;
  showDetailDialog.value = {
    visiable: true,
    page,
  }
  pdf.getPage(page).then((page) => {
    const canvas = document.getElementById('detail-page') as HTMLCanvasElement;
    renderToCanvas(page, canvas, 3);
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
});
</script>

<template>
  <div id="cut-pdf">
    <div id="pdf-view">
      <div
          v-for="page in pageCount" :key="pdfKey + page"
          class="page" :class="{'selected': selected.includes(page)}"
      >
        <canvas :id="`page-${page}`" @click="selectPage(page)"/>
        <span class="page-number" v-text="page"/>
        <div class="hover-show">
          <div class="checkbox" @click="selectPage(page)">
            <input type="checkbox" :checked="selected.includes(page)"/>
          </div>
          <div class="magnify" @click="showDetail(page)">
            🔍
          </div>
        </div>
      </div>
    </div>
    <div id="operate">
      <input type="file" @change="inputChange" accept="application/pdf"/>
      <div class="scale" v-show="pageCount > 0">
        <label for="scale-input-number">缩略图大小： </label>
        <el-input-number id="scale-input-number" v-model="renderScale" :step="0.1" :max="0.9" :min="0.3"/>
      </div>
      <el-button-group class="selected-operate-group">
        <el-button v-show="selected.length > 0" @click="clearSelected" type="danger">清除选中</el-button>
        <el-button v-show="pageCount != selected.length" @click="selectAll" type="success">全选</el-button>
      </el-button-group>
      <el-button v-show="selected.length > 0" @click="download" type="primary">下载选中的{{ pageStr }}页</el-button>
    </div>
    <el-dialog v-model="showDetailDialog.visiable" :lock-scroll="false">
      <template #title>
        <span>第{{ showDetailDialog.page + 1 }}页</span>
      </template>
      <div class="dialog-canvas">
        <canvas id="detail-page" style="max-width: 100%; max-height: 100%;"/>
      </div>
      <template #footer>
        <el-button @click="showDetailDialog.visiable = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
#cut-pdf {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  #pdf-view {
    max-height: 100%;
    width: 100%;
    overflow: auto;
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    padding: 1rem;

    .page {
      position: relative;
      margin: 4px;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;

      &:hover {
        canvas {
          transform: scale(1.03);
        }

        .hover-show {
          display: flex;
        }
      }

      &.selected {
        .hover-show {
          display: flex;
        }
      }

      canvas {
        transition: .3s;
      }

      .hover-show {
        display: none;
        position: absolute;
        top: 0;
        right: 0;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }

      .magnify {
        cursor: pointer;
      }

      .page-number {
        margin-top: 6px;
      }
    }
  }

  #operate {
    width: clamp(300px, 20vw, 500px);
    height: 100%;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #ccc;
    gap: 1rem;
    justify-content: flex-start;
    align-items: center;

    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #fff;
      color: #333;
      font-size: 1rem;
      transition: all 0.3s ease;

      &:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
      }
    }

    .selected-operate-group {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
    }
  }

  .dialog-canvas {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
}
</style>
