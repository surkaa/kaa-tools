<script setup lang="ts">
import * as pdfLib from "pdfjs-dist";
import {ref} from "vue";

pdfLib.GlobalWorkerOptions.workerSrc = '../../node_modules/pdfjs-dist/build/pdf.worker.mjs'

const selected = ref<number[]>([]);

const inputChange = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const loadingTask = pdfLib.getDocument(url);
  const pdfDoc = await loadingTask.promise;
  selected.value = [];
  for (let i = 0; i < pdfDoc.numPages; i++) {
    selected.value.push(i);
  }
  console.log(pdfDoc);
}
</script>

<template>
  <div id="cut-pdf">
    <input type="file" @change="inputChange" accept="application/pdf">
  </div>
</template>

<style scoped lang="scss">
#cut-pdf {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);
}
</style>
