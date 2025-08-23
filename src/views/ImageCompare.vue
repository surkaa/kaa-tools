<script setup lang="ts">
import {reactive, ref} from "vue"

type ImgItem = {
  url: string
  width: number
  height: number
  name: string
}

type Mode = "grid" | "highlight"

const images = ref<ImgItem[]>([])

const mode = ref<Mode>("grid") // grid=并排，highlight=高亮差异
const selected = ref<number[]>([]) // 选中的图片索引

// highlight 生成结果
const highlightUrl = ref<string | null>(null)

// 同步缩放/平移
const zoom = ref(1)
const offset = reactive({x: 0, y: 0})
let dragging = false
let dragStart = {x: 0, y: 0}

// 上传多图
async function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return

  const loaded: ImgItem[] = []
  for (const f of files) {
    const url = URL.createObjectURL(f)
    const dims = await getImageSize(url)
    loaded.push({
      url, width: dims.width, height: dims.height, name: f.name
    })
  }
  images.value = loaded
  input.value = ""
}

function getImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = url
  })
}

function toggleSelect(index: number) {
  if (selected.value.includes(index)) {
    selected.value = selected.value.filter(i => i !== index)
  } else {
    if (selected.value.length >= 2) {
      // 只允许同时选 2 张
      selected.value.shift()
    }
    selected.value.push(index)
  }
}

// 生成高亮差异图
async function generateHighlight(img1: ImgItem, img2: ImgItem) {
  return new Promise<void>((resolve) => {
    const image1 = new Image()
    const image2 = new Image()
    let loaded = 0

    const onLoad = () => {
      loaded++
      if (loaded < 2) return

      const w = Math.min(image1.width, image2.width)
      const h = Math.min(image1.height, image2.height)
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")!

      // 绘制图1
      ctx.drawImage(image1, 0, 0, w, h)
      const imgData1 = ctx.getImageData(0, 0, w, h)

      // 绘制图2
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(image2, 0, 0, w, h)
      const imgData2 = ctx.getImageData(0, 0, w, h)

      const out = ctx.createImageData(w, h)
      const threshold = 50 // 可调阈值

      for (let i = 0; i < imgData1.data.length; i += 4) {
        const r1 = imgData1.data[i]
        const g1 = imgData1.data[i + 1]
        const b1 = imgData1.data[i + 2]
        const r2 = imgData2.data[i]
        const g2 = imgData2.data[i + 1]
        const b2 = imgData2.data[i + 2]

        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)

        if (diff > threshold) {
          // 差异像素用品红色高亮
          out.data[i] = 255
          out.data[i + 1] = 0
          out.data[i + 2] = 255
          out.data[i + 3] = 255
        } else {
          // 保持图1原像素
          out.data[i] = r1
          out.data[i + 1] = g1
          out.data[i + 2] = b1
          out.data[i + 3] = 255
        }
      }

      ctx.putImageData(out, 0, 0)
      highlightUrl.value = canvas.toDataURL()
      resolve()
    }

    image1.onload = onLoad
    image2.onload = onLoad
    image1.src = img1.url
    image2.src = img2.url
  })
}

// 缩放与拖动
function onWheel(ev: WheelEvent) {
  ev.preventDefault()
  const scale = ev.deltaY < 0 ? 1.1 : 0.9
  zoom.value = Math.min(zoom.value * scale, 10)
  zoom.value = Math.max(zoom.value, 0.5)
}

function onMouseDown(ev: MouseEvent) {
  dragging = true
  dragStart = {x: ev.clientX - offset.x, y: ev.clientY - offset.y}
}

function onMouseMove(ev: MouseEvent) {
  if (!dragging) return
  offset.x = ev.clientX - dragStart.x
  offset.y = ev.clientY - dragStart.y
}

function onMouseUp() {
  dragging = false
}

function toggleMode(m: Mode) {
  console.log('click', m)
  if (m === "highlight" && images.value.length !== 2) return
  mode.value = m
}

window.addEventListener("mouseup", onMouseUp)

async function doHighlight() {
  if (selected.value.length !== 2) {
    alert("请选择两张图进行对比")
    return
  }
  const img1 = images.value[selected.value[0]]
  const img2 = images.value[selected.value[1]]
  await generateHighlight(img1, img2)
  mode.value = "highlight"
}
</script>

<template>
  <div id="multi-comparator">
    <div class="toolbar">
      <input type="file" accept="image/*" multiple @change="handleUpload"/>
      <button class="btn" @click="toggleMode('grid')">并排对比</button>
      <button class="btn" @click="doHighlight()" :disabled="selected.length!==2">高亮差异</button>
    </div>

    <div class="viewer" @wheel="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove">
      <!-- 并排 -->
      <div v-if="mode==='grid'" class="grid" :style="{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }">
        <div v-for="(img,i) in images" :key="i" class="img-wrap" :class="{selected: selected.includes(i)}" @click="toggleSelect(i)">
          <img
              :src="img.url"
              :style="{transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`} "
              draggable="false"
              alt=""
          />
          <p class="file-name">
            {{ img.name }}
          </p>
        </div>
      </div>

      <!-- highlight 模式 -->
      <div v-if="mode==='highlight' && highlightUrl" class="highlight-wrap">
        <img :src="highlightUrl"
             :style="{transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}"
             draggable="false" alt="highlight"/>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#multi-comparator {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .toolbar {
    display: flex;
    gap: 10px;

    .btn {
      padding: 6px 12px;
      border: 1px solid #999;
      border-radius: 4px;
      cursor: pointer;

      &.primary {
        background: #3b82f6;
        color: #fff;
      }
    }
  }

  .viewer {
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: 400px;

    .grid {
      display: grid;
      width: 100%;
      height: 100%;

      .img-wrap {
        overflow: hidden;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 0 4px;
        user-select: none;
        flex-direction: column;
        border: 1px solid #ccc;
        border-radius: 4px;

        &.selected {
          border: 2px solid #3b82f6;
        }

        img {
          max-width: 100%;
          max-height: 100%;
          transition: none;
          cursor: grab;

          &:active {
            cursor: grabbing;
          }
        }

        .file-name {
          color: #fff;
          font-size: 12px;
          text-align: center;
          word-break: break-all;
          z-index: 2;
        }
      }
    }

    .highlight-wrap {
      display: flex;
      justify-content: center;
      align-items: center;

      img {
        max-width: 100%;
        max-height: 100%;
      }
    }
  }
}
</style>
