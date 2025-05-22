<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {PDFDocumentProxy, PDFPageProxy} from "pdfjs-dist";
import {nextTick, ref} from "vue";
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

pdfLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

let pdf: PDFDocumentProxy | null = null;
const pageCount = ref(0);
const renderScale = ref(0.5);
const selected = ref<number[]>([]);
const pdfKey = ref(dayjs().valueOf());
const showDetailDialog = ref({
  visiable: false,
  page: 0,
});

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

const inputChange = (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

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
    renderToCanvas(page, canvas, 2);
  });
}
</script>

<template>
  <div id="cut-pdf">
    <div id="pdf-view">
      <div class="page" v-for="page in pageCount" :key="pdfKey + page">
        <canvas :id="`page-${page}`"/>
        <div class="magnify" @click="showDetail(page)">
          🔍
        </div>
      </div>
    </div>
    <div id="operate">
      <input type="file" @change="inputChange" accept="application/pdf">
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
    gap: 0.5rem;
    padding: 1rem;

    .page {
      position: relative;

      &:hover {
        .magnify {
          display: block;
        }
      }

      .magnify {
        display: none;
        position: absolute;
        top: 4px;
        right: 4px;
        cursor: pointer;
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
