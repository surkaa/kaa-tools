<script setup lang="ts">
import {reactive, ref} from "vue"

type ImgItem = {
  url: string
  width: number
  height: number
  name: string
}

const images = ref<ImgItem[]>([])
const baseWidth = ref<number | null>(null)
const baseHeight = ref<number | null>(null)

const mode = ref<"grid">("grid") // 对比模式：grid=并排，slider=滑动

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
    if (!ensureBaseSizeMatch(dims.width, dims.height)) {
      URL.revokeObjectURL(url)
      alert(`尺寸不一致，要求所有图片必须是 ${baseWidth.value}×${baseHeight.value}`)
      return
    }
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

function ensureBaseSizeMatch(w: number, h: number): boolean {
  if (baseWidth.value == null || baseHeight.value == null) {
    baseWidth.value = w
    baseHeight.value = h
    return true
  }
  return w === baseWidth.value && h === baseHeight.value
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

window.addEventListener("mouseup", onMouseUp)
</script>

<template>
  <div id="multi-comparator">
    <div class="toolbar">
      <input type="file" accept="image/*" multiple @change="handleUpload"/>
      <button class="btn" @click="mode = 'grid'">并排对比</button>
    </div>

    <div class="viewer" @wheel="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove">
      <!-- 并排 -->
      <div v-if="mode==='grid'" class="grid" :style="{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }">
        <div v-for="(img,i) in images" :key="i" class="img-wrap">
          <img
              :src="img.url"
              :style="{transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}"
              draggable="false"
              alt=""
          />
          <p class="file-name">
            {{ img.name }}
          </p>
        </div>
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
  }
}
</style>
