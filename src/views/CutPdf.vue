<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {PDFDocumentProxy} from "pdfjs-dist";
import {nextTick, ref} from "vue";
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

pdfLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

const pdfPages = ref(0);
const pdfScale = ref(0.5);
const selected = ref<number[]>([]);
const pdfKey = ref(dayjs().valueOf());

const renderPage = (num: number, pdfDoc: PDFDocumentProxy) => {
  pdfDoc.getPage(num).then((page) => {
    const canvas = document.getElementById(`page-${num}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      ElMessage.error(`无法渲染第${num}页，退出渲染`);
      return;
    }
    const viewport = page.getViewport({scale: pdfScale.value});
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    page.render({
      canvasContext: ctx,
      viewport
    });
    if (num < pdfPages.value) {
      nextTick(() => renderPage(num + 1, pdfDoc));
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
    pdfPages.value = pdfDoc.numPages;
    // 从第一页开始渲染
    nextTick(() => renderPage(1, pdfDoc));
  }).catch(_err => ElMessage.error('加载错误'));
}
</script>

<template>
  <div id="cut-pdf">
    <div id="pdf-view">
      <canvas v-for="page in pdfPages" :key="pdfKey + page" :id="`page-${page}`"/>
      <div id="text-view"></div>
    </div>
    <div id="operate">
      <input type="file" @change="inputChange" accept="application/pdf">
    </div>
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
}
</style>
