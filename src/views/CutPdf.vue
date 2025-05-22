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
    <input type="file" @change="inputChange" accept="application/pdf">
    <div id="pdf-view">
      <canvas v-for="page in pdfPages" :key="pdfKey + page" :id="`page-${page}`"/>
      <div id="text-view"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#cut-pdf {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);

  #pdf-view {
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
