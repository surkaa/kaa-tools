<template>
  <div class="box-selector">
    <!-- 颜色选择器 -->
    <div class="controls">
      <label>
        框线颜色:
        <input type="color" v-model="boxColor">
      </label>
      <label>
        框线宽度:
        <input type="range" v-model="boxWidth" min="1" max="10">
      </label>
      <button @click="resetBoxes">重置所有框</button>
    </div>

    <!-- 图片和框选区域 -->
    <div class="image-container">
      <img
          ref="imageRef"
          :src="imageUrl"
          alt="Target image"
          @mousedown="startDrawing"
          @mousemove="drawing"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
      />

      <!-- 框选层 -->
      <svg ref="svgRef" class="box-layer"></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

// 类型定义
interface Box {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 响应式数据
const imageUrl = ref('https://via.placeholder.com/600x400');
const boxColor = ref('#ff0000');
const boxWidth = ref(3);
const isDrawing = ref(false);
const startX = ref(0);
const startY = ref(0);
const boxes = ref<Box[]>([]);
const nextId = ref(1);

// DOM 引用
const imageRef = ref<HTMLImageElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

// 开始绘制
const startDrawing = (e: MouseEvent) => {
  if (!imageRef.value) return;

  isDrawing.value = true;
  const rect = imageRef.value.getBoundingClientRect();
  startX.value = e.clientX - rect.left;
  startY.value = e.clientY - rect.top;
};

// 绘制中
const drawing = (e: MouseEvent) => {
  if (!isDrawing.value || !imageRef.value || !svgRef.value) return;

  const rect = imageRef.value.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  // 更新SVG
  svgRef.value.innerHTML = '';

  // 绘制所有已有框
  boxes.value.forEach(box => {
    drawBox(box);
  });

  // 绘制当前框
  const width = Math.abs(currentX - startX.value);
  const height = Math.abs(currentY - startY.value);
  const x = Math.min(startX.value, currentX);
  const y = Math.min(startY.value, currentY);

  const tempBox = { id: -1, x, y, width, height };
  drawBox(tempBox);
};

// 停止绘制
const stopDrawing = (e: MouseEvent) => {
  if (!isDrawing.value || !imageRef.value) return;

  const rect = imageRef.value.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;

  // 确保有足够的尺寸
  if (Math.abs(endX - startX.value) > 5 && Math.abs(endY - startY.value) > 5) {
    boxes.value.push({
      id: nextId.value++,
      x: Math.min(startX.value, endX),
      y: Math.min(startY.value, endY),
      width: Math.abs(endX - startX.value),
      height: Math.abs(endY - startY.value)
    });
  }

  isDrawing.value = false;
};

// 绘制单个框
const drawBox = (box: Box) => {
  if (!svgRef.value) return;

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', box.x.toString());
  rect.setAttribute('y', box.y.toString());
  rect.setAttribute('width', box.width.toString());
  rect.setAttribute('height', box.height.toString());
  rect.setAttribute('stroke', boxColor.value);
  rect.setAttribute('stroke-width', boxWidth.value.toString());
  rect.setAttribute('fill', 'none');
  rect.setAttribute('class', 'box-rect');

  svgRef.value.appendChild(rect);
};

// 重置所有框
const resetBoxes = () => {
  boxes.value = [];
  if (svgRef.value) {
    svgRef.value.innerHTML = '';
  }
};

// 当框列表变化时重绘
watch(boxes, () => {
  if (!svgRef.value) return;

  svgRef.value.innerHTML = '';
  boxes.value.forEach(box => {
    drawBox(box);
  });
}, { deep: true });

// 当颜色或宽度变化时重绘
watch([boxColor, boxWidth], resetBoxes);

// 设置SVG尺寸
onMounted(() => {
  if (imageRef.value && svgRef.value) {
    svgRef.value.style.width = imageRef.value.offsetWidth + 'px';
    svgRef.value.style.height = imageRef.value.offsetHeight + 'px';
  }
});
</script>

<style scoped lang="scss">
.box-selector {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  font-family: Arial, sans-serif;

  .controls {
    display: flex;
    gap: 15px;
    align-items: center;

    label {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    input[type="color"] {
      width: 50px;
      height: 30px;
      border: none;
      cursor: pointer;
    }

    input[type="range"] {
      width: 100px;
    }

    button {
      padding: 8px 15px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;

      &:hover {
        background: #c0392b;
      }
    }
  }

  .image-container {
    position: relative;
    display: inline-block;
    border: 1px solid #ddd;
    max-width: 100%;

    img {
      display: block;
      max-width: 100%;
      max-height: 80vh;
      cursor: crosshair;
    }

    .box-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }
  }
}
</style>