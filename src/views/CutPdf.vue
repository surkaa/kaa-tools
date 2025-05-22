<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {PDFDocumentProxy} from "pdfjs-dist";
import {nextTick, ref} from "vue";
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

pdfLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs';

const pageCount = ref(0);
const renderScale = ref(0.5);
const selected = ref<number[]>([]);
const pdfKey = ref(dayjs().valueOf());
let pdf: PDFDocumentProxy | null = null;

const renderPage = (num: number) => {
  if (!pdf) return;
  pdf.getPage(num).then((page) => {
    const canvas = document.getElementById(`page-${num}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      ElMessage.error(`无法渲染第${num}页，退出渲染`);
      return;
    }
    const viewport = page.getViewport({scale: renderScale.value});
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    page.render({
      canvasContext: ctx,
      viewport
    });
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
}
</style>
