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
  <div id="multi-comparator" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Visual utility</span>
      <h1 class="tool-title">图片对比</h1>
      <p class="tool-description">同步缩放与移动多张图片，并选择其中两张高亮像素差异。</p>
    </header>

    <main class="compare-workspace">
      <section class="toolbar surface-card">
        <div class="upload-action">
          <input id="image-compare-upload" type="file" accept="image/*" multiple @change="handleUpload"/>
          <label for="image-compare-upload">
            <span class="plus">＋</span>
            <span><strong>选择图片</strong><small>支持一次上传多张</small></span>
          </label>
        </div>

        <div class="mode-actions">
          <button class="btn" :class="{active: mode === 'grid'}" @click="toggleMode('grid')">
            <i class="grid-icon"><span></span><span></span></i>并排对比
          </button>
          <button class="btn" :class="{active: mode === 'highlight'}" @click="doHighlight()" :disabled="selected.length!==2">
            <i class="diff-icon"></i>高亮差异
          </button>
        </div>

        <div class="toolbar-meta">
          <span>{{ images.length }} 张图片</span>
          <span>{{ selected.length }}/2 已选择</span>
          <span>{{ Math.round(zoom * 100) }}%</span>
        </div>
      </section>

      <section class="viewer surface-card" @wheel="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove">
        <div v-if="images.length === 0" class="empty-state">
          <div class="empty-visual">
            <span></span><span></span>
          </div>
          <h2>上传图片开始对比</h2>
          <p>滚轮缩放，按住鼠标拖动；点击图片可选择两张生成差异图。</p>
        </div>

        <div v-if="mode==='grid' && images.length" class="grid" :style="{ gridTemplateColumns: `repeat(${images.length}, minmax(240px, 1fr))` }">
          <div v-for="(img,i) in images" :key="i" class="img-wrap" :class="{selected: selected.includes(i)}" @click="toggleSelect(i)">
            <div class="selection-badge">{{ selected.includes(i) ? '已选择' : `图 ${i + 1}` }}</div>
            <div class="image-stage">
              <img
                  :src="img.url"
                  :style="{transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`} "
                  draggable="false"
                  :alt="img.name"
              />
            </div>
            <p class="file-name">{{ img.name }}</p>
          </div>
        </div>

        <div v-if="mode==='highlight' && highlightUrl" class="highlight-wrap">
          <div class="highlight-label">差异像素以品红色标记</div>
          <img :src="highlightUrl"
               :style="{transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`}"
               draggable="false" alt="高亮差异结果"/>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
#multi-comparator {
  width: 100%;
}

.compare-workspace {
  width: min(100%, 1280px);
  display: grid;
  gap: 16px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
}

.upload-action {
  input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
  }

  label {
    display: flex;
    align-items: center;
    gap: 11px;
    cursor: pointer;

    .plus {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 11px;
      color: #fff;
      background: var(--accent);
      box-shadow: 0 8px 20px rgba(17, 168, 121, 0.2);
      font-size: 1.15rem;
    }

    > span:last-child {
      display: grid;
      gap: 2px;
    }

    strong {
      color: #263d37;
      font-size: 0.78rem;
    }

    small {
      color: var(--muted);
      font-size: 0.62rem;
    }
  }
}

.mode-actions {
  display: flex;
  gap: 7px;
  padding-left: 18px;
  border-left: 1px solid var(--line);

  .btn {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    color: #52625d;
    background: #f6faf8;
    cursor: pointer;
    font-size: 0.72rem;
    font-weight: 650;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

    &.active {
      border-color: rgba(17, 168, 121, 0.28);
      color: var(--accent-strong);
      background: var(--accent-soft);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.46;
    }
  }
}

.grid-icon {
  width: 15px;
  height: 12px;
  display: flex;
  gap: 2px;

  span {
    flex: 1;
    border: 1.5px solid currentColor;
    border-radius: 2px;
  }
}

.diff-icon {
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  box-shadow: inset 5px 0 0 currentColor;
}

.toolbar-meta {
  display: flex;
  gap: 14px;
  margin-left: auto;
  color: #82908c;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.62rem;

  span + span {
    padding-left: 14px;
    border-left: 1px solid var(--line);
  }
}

.viewer {
  position: relative;
  min-height: clamp(430px, 60vh, 720px);
  padding: 12px;
  overflow: auto;
  background:
      linear-gradient(45deg, rgba(24, 62, 52, 0.025) 25%, transparent 25%, transparent 75%, rgba(24, 62, 52, 0.025) 75%),
      linear-gradient(45deg, rgba(24, 62, 52, 0.025) 25%, transparent 25%, transparent 75%, rgba(24, 62, 52, 0.025) 75%),
      rgba(255, 255, 255, 0.82);
  background-position: 0 0, 10px 10px;
  background-size: 20px 20px;
}

.empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 30px;
  text-align: center;

  h2 {
    margin: 20px 0 7px;
    color: #304741;
    font-size: 1rem;
  }

  p {
    max-width: 460px;
    margin: 0;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.65;
  }
}

.empty-visual {
  position: relative;
  width: 74px;
  height: 52px;

  span {
    position: absolute;
    width: 48px;
    height: 48px;
    border: 1px solid rgba(17, 168, 121, 0.22);
    border-radius: 13px;
    background: rgba(226, 247, 240, 0.78);

    &:first-child { left: 0; transform: rotate(-8deg); }
    &:last-child { right: 0; transform: rotate(8deg); }
  }
}

.grid {
  min-width: 100%;
  min-height: calc(clamp(430px, 60vh, 720px) - 24px);
  display: grid;
  gap: 10px;

  .img-wrap {
    position: relative;
    min-width: 0;
    display: grid;
    grid-template-rows: 1fr auto;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: #13241f;
    user-select: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &.selected {
      border-color: #30c695;
      box-shadow: 0 0 0 3px rgba(48, 198, 149, 0.16);

      .selection-badge {
        color: #073f2f;
        background: #68deb7;
      }
    }
  }
}

.selection-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  padding: 5px 8px;
  border-radius: 7px;
  color: rgba(238, 249, 245, 0.7);
  background: rgba(6, 25, 20, 0.68);
  backdrop-filter: blur(8px);
  font-size: 0.61rem;
}

.image-stage {
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 100%;
    cursor: grab;
    transition: none;

    &:active { cursor: grabbing; }
  }
}

.file-name {
  z-index: 2;
  margin: 0;
  padding: 11px 14px;
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: rgba(232, 244, 240, 0.62);
  background: rgba(4, 15, 12, 0.5);
  font-size: 0.67rem;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.highlight-wrap {
  position: relative;
  min-height: calc(clamp(430px, 60vh, 720px) - 24px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  background: #13241f;

  img {
    max-width: 100%;
    max-height: 100%;
  }
}

.highlight-label {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  padding: 7px 10px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(6, 25, 20, 0.72);
  font-size: 0.66rem;
  backdrop-filter: blur(8px);
}

@media (max-width: 920px) {
  .toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .toolbar-meta {
    width: 100%;
    margin-left: 0;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }
}

@media (max-width: 560px) {
  .toolbar,
  .viewer {
    border-radius: 22px;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .mode-actions {
    padding-top: 14px;
    padding-left: 0;
    border-top: 1px solid var(--line);
    border-left: 0;

    .btn {
      flex: 1;
      justify-content: center;
    }
  }

  .toolbar-meta {
    justify-content: space-between;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
