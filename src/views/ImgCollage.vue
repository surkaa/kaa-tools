<script setup lang="ts">
import {onMounted, ref, useTemplateRef} from "vue";

const container = useTemplateRef('imageContainer');
const imageList = ref<string[]>([]);
const sourceNode = ref<HTMLLIElement | null>(null);
const ondragstart = (e: DragEvent) => {
  if (!e.target) return;
  setTimeout(() => (e.target as HTMLLIElement).classList.add('moving'), 0);
  sourceNode.value = e.target as HTMLLIElement;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  console.log('ondragstart');
};

const ondragenter = (e: DragEvent) => {
  if (!sourceNode.value || !container.value) return
  if (e.target === container.value || e.target === sourceNode.value) return;
  const children = Array.from(container.value?.children || []);
  const sourceIndex = children.indexOf(sourceNode.value);
  const targetIndex = children.indexOf(e.target as HTMLLIElement);
  if (sourceIndex < targetIndex) {
    container.value.insertBefore(sourceNode.value, (e.target as HTMLLIElement).nextElementSibling);
  } else {
    container.value.insertBefore(sourceNode.value, (e.target as HTMLLIElement));
  }
  console.log('ondragenter');
};

const ondragend = (_: DragEvent) => {
  if (!sourceNode.value) return;
  sourceNode.value.classList.remove('moving');
  sourceNode.value = null;
  console.log('ondragend');
};

const ondragover = (_: DragEvent) => {
  console.log('ondragover');
}

onMounted(() => {
  // 生成50个
  imageList.value = Array.from({ length: 50 }, (_, i) => `Image ${i + 1}`);
});
</script>

<template>
  <main class="img-collage">
    <ul
        class="list" ref="imageContainer" @dragstart="ondragstart"
        @dragenter.prevent="ondragenter" @dragend.prevent="ondragend"
        @dragover.prevent="ondragover"
    >
      <li class="item" draggable="true" v-for="i in imageList">{{ i }}</li>
    </ul>
  </main>
</template>

<style scoped lang="scss">
.img-collage {
  width: 100%;
  height: 100%;
  background-image: linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%);

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;

    .item {
      width: 100px;
      height: 100px;
      background-color: #ccc;
      margin: 10px;
      display: inline-block;
      text-align: center;
      line-height: 100px;
      cursor: move;
      transition: transform 0.2s ease;

      &.moving {
        background: transparent;
        color: transparent;
        // 虚线边框
        border: 1px dashed #000;
      }
    }
  }
}
</style>