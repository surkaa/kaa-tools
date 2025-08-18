<script setup lang="ts">
import {ref, reactive, computed, nextTick} from 'vue'

type Selection = {
  x: number; y: number; w: number; h: number; // 像素，基于原图尺寸
}

type Inset = {
  x: number; y: number; // 以图片左上为原点的像素坐标（放大图左上）
  zoom: number;         // 放大倍数
  visible: boolean;     // 是否显示（当选区面积<20%自动true）
}

type ImgItem = {
  file: File;
  url: string;
  width: number;
  height: number;
  name: string;
  el?: HTMLImageElement | null; // 预览 <img> 引用（用于绘制 inset）
}

type SceneRow = {
  images: ImgItem[];             // 长度应等于 methodCount
  selection?: Selection;         // 统一选区
  inset: Inset;                  // 统一放大图状态
}

const methodCount = ref<number>(5) // 默认 5 种方法
const scenes = reactive<SceneRow[]>([])

const baseWidth = ref<number | null>(null)
const baseHeight = ref<number | null>(null)

const isDrawing = ref(false)
const drawStart = reactive({x: 0, y: 0})
const currentHoverSceneIdx = ref<number | null>(null) // 当前鼠标作用的场景行索引

const methodGap = ref(20) // px
const sceneGap = ref(40)  // px

// 拖拽 inset
const draggingInset = reactive({active: false, offsetX: 0, offsetY: 0, sceneIdx: -1})

const imageAreaThreshold = computed(() => {
  if (baseWidth.value == null || baseHeight.value == null) return Infinity
  return baseWidth.value * baseHeight.value * 0.2
})

function addScene() {
  const row: SceneRow = {
    images: Array.from({length: methodCount.value}, () => (null as any)),
    inset: {x: 0, y: 0, zoom: 2, visible: false}
  }
  // 用 null 占位，后续上传后替换
  row.images = Array.from({length: methodCount.value}, () => ({
    file: undefined as any, url: '', width: 0, height: 0, el: null
  }))
  scenes.push(row)
}

function removeScene(i: number) {
  scenes.splice(i, 1)
  if (scenes.length === 0) {
    baseWidth.value = null
    baseHeight.value = null
  }
}

// 检查尺寸是否和基准一致
function ensureBaseSizeMatch(w: number, h: number): boolean {
  if (baseWidth.value == null || baseHeight.value == null) {
    baseWidth.value = w
    baseHeight.value = h
    return true
  }
  return w === baseWidth.value && h === baseHeight.value
}

async function handleUpload(e: Event, sceneIdx: number) {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length === 0) return

  if (files.length !== methodCount.value) {
    alert(`请一次选择 ${methodCount.value} 张图片（对应 ${methodCount.value} 种方法）。`)
    input.value = ''
    return
  }

  // 读取尺寸
  const loaded: ImgItem[] = []
  for (const f of files) {
    const url = URL.createObjectURL(f)
    const dims = await getImageSize(url)
    if (!ensureBaseSizeMatch(dims.width, dims.height)) {
      URL.revokeObjectURL(url)
      alert(`尺寸不一致：该批图片为 ${dims.width}×${dims.height}，但基准尺寸是 ${baseWidth.value}×${baseHeight.value}。已拦截。`)
      input.value = ''
      // 释放之前已创建的URL
      loaded.forEach(it => URL.revokeObjectURL(it.url))
      return
    }
    loaded.push({
      file: f,
      url,
      width: dims.width,
      height: dims.height,
      name: f.name,
      el: null
    })
  }

  // 设置到该行
  scenes[sceneIdx].images.splice(0, scenes[sceneIdx].images.length, ...loaded)
  // 默认把 inset 放在中心
  const bw = baseWidth.value!, bh = baseHeight.value!
  const defaultInsetW = Math.floor(Math.min(bw, bh) * 0.45)
  const defaultInsetH = defaultInsetW
  scenes[sceneIdx].inset.x = Math.floor((bw - defaultInsetW) / 2)
  scenes[sceneIdx].inset.y = Math.floor((bh - defaultInsetH) / 2)
  scenes[sceneIdx].inset.zoom = 2
  await nextTick()
  input.value = ''
}

function getImageSize(url: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({width: img.naturalWidth, height: img.naturalHeight})
    img.onerror = reject
    img.src = url
  })
}

// 在某一行任意方法图上开始拉框
function onMouseDownSelect(ev: MouseEvent, sceneIdx: number, imgEl: HTMLImageElement | null) {
  if (!imgEl) return
  if (!scenes[sceneIdx] || scenes[sceneIdx].images.some(it => !it.url)) return
  isDrawing.value = true
  currentHoverSceneIdx.value = sceneIdx

  const {x, y} = getRelativePos(ev, imgEl)
  drawStart.x = x
  drawStart.y = y
  // 初始化一个 selection
  scenes[sceneIdx].selection = {x, y, w: 0, h: 0}
}

function onMouseMove(ev: MouseEvent, sceneIdx: number, imgEl: HTMLImageElement | null) {
  if (draggingInset.active && draggingInset.sceneIdx === sceneIdx) {
    // 正在拖拽 inset
    const bw = baseWidth.value!, bh = baseHeight.value!
    const insetSize = getInsetRenderSize(sceneIdx)
    const newX = ev.clientX - draggingInset.offsetX
    const newY = ev.clientY - draggingInset.offsetY

    // 将屏幕坐标转成图片内像素坐标
    const imgRect = (imgEl as HTMLImageElement).getBoundingClientRect()
    let ix = Math.round(newX - imgRect.left)
    let iy = Math.round(newY - imgRect.top)

    // 边界限制（inset 不能超出原图范围）
    ix = clamp(ix, 0, bw - insetSize.w)
    iy = clamp(iy, 0, bh - insetSize.h)

    scenes[sceneIdx].inset.x = ix
    scenes[sceneIdx].inset.y = iy
    return
  }

  if (!isDrawing.value || currentHoverSceneIdx.value !== sceneIdx) return
  const s = scenes[sceneIdx]
  if (!s.selection) return
  const {x, y} = getRelativePos(ev, imgEl!)
  const rx = clamp(Math.min(drawStart.x, x), 0, baseWidth.value!)
  const ry = clamp(Math.min(drawStart.y, y), 0, baseHeight.value!)
  const rw = clamp(Math.abs(x - drawStart.x), 0, baseWidth.value! - rx)
  const rh = clamp(Math.abs(y - drawStart.y), 0, baseHeight.value! - ry)
  s.selection = {x: rx, y: ry, w: rw, h: rh}
}

function onMouseUpSelect(_ev: MouseEvent, sceneIdx: number) {
  if (!isDrawing.value) return
  isDrawing.value = false
  currentHoverSceneIdx.value = null
  const s = scenes[sceneIdx]
  if (!s || !s.selection) return
  // 判断是否显示 inset（小于 20% 就显示）
  const area = s.selection.w * s.selection.h
  s.inset.visible = area > 0 && area < imageAreaThreshold.value
}

function getRelativePos(ev: MouseEvent, imgEl: HTMLImageElement) {
  const rect = imgEl.getBoundingClientRect()
  // 将屏幕坐标映射到原图像素（假设展示按等比铺满容器且原始尺寸=基准尺寸）
  const scaleX = baseWidth.value! / rect.width
  const scaleY = baseHeight.value! / rect.height
  const x = clamp(Math.round((ev.clientX - rect.left) * scaleX), 0, baseWidth.value!)
  const y = clamp(Math.round((ev.clientY - rect.top) * scaleY), 0, baseHeight.value!)
  return {x, y}
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// 放大图尺寸（渲染到预览层时，取选区大小*zoom，但同时限制最大宽高为原图 65%）
function getInsetRenderSize(sceneIdx: number) {
  const s = scenes[sceneIdx]
  const sel = s.selection
  if (!sel) return {w: 0, h: 0}
  const w = Math.floor(sel.w * s.inset.zoom)
  const h = Math.floor(sel.h * s.inset.zoom)
  const maxW = Math.floor(baseWidth.value! * 0.65)
  const maxH = Math.floor(baseHeight.value! * 0.65)
  return {w: Math.min(w, maxW), h: Math.min(h, maxH)}
}

function onWheelInset(ev: WheelEvent, sceneIdx: number) {
  if (!scenes[sceneIdx].inset.visible) return
  ev.preventDefault()
  const s = scenes[sceneIdx].inset
  s.zoom = clamp(s.zoom + (ev.deltaY < 0 ? 0.2 : -0.2), 1, 8)
  // 缩放后保证仍在边界内
  const sz = getInsetRenderSize(sceneIdx)
  s.x = clamp(s.x, 0, baseWidth.value! - sz.w)
  s.y = clamp(s.y, 0, baseHeight.value! - sz.h)
}

function onMouseDownInset(ev: MouseEvent, sceneIdx: number, imgEl: HTMLImageElement | null) {
  if (!imgEl) return
  draggingInset.active = true
  draggingInset.sceneIdx = sceneIdx
  const imgRect = imgEl.getBoundingClientRect()
  draggingInset.offsetX = ev.clientX - (imgRect.left + scenes[sceneIdx].inset.x)
  draggingInset.offsetY = ev.clientY - (imgRect.top + scenes[sceneIdx].inset.y)
}

function onMouseUpAnywhere() {
  draggingInset.active = false
  draggingInset.sceneIdx = -1
}

window.addEventListener('mouseup', onMouseUpAnywhere)

// 导出拼接图
async function exportComposite() {
  // 校验：每行必须有 methodCount 张图且均已就绪
  if (scenes.length === 0) {
    alert('没有场景可导出。')
    return
  }
  for (let i = 0; i < scenes.length; i++) {
    const row = scenes[i]
    if (row.images.length !== methodCount.value || row.images.some(img => !img || !img.url)) {
      alert(`第 ${i + 1} 行还未上传完 ${methodCount.value} 张图片。`)
      return
    }
  }
  const W = methodCount.value * (baseWidth.value || 0) + (methodCount.value - 1) * methodGap.value
  const H = scenes.length * (baseHeight.value || 0) + (scenes.length - 1) * sceneGap.value
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 逐格绘制
  for (let r = 0; r < scenes.length; r++) {
    const row = scenes[r]
    for (let c = 0; c < methodCount.value; c++) {
      const img = await ensureImageElement(row.images[c].url)
      const x = c * baseWidth.value! + c * methodGap.value
      const y = r * baseHeight.value! + r * sceneGap.value
      ctx.drawImage(img, x, y)

      // 画红框
      if (row.selection && row.selection.w > 0 && row.selection.h > 0) {
        ctx.save()
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 3
        ctx.strokeRect(x + row.selection.x, y + row.selection.y, row.selection.w, row.selection.h)
        ctx.restore()

        // 放大图（若可见）
        if (row.inset.visible) {
          const insetSize = getInsetSizeForExport(row) // 与预览逻辑一致
          // 截取选区，按 zoom 绘制到 inset 区域
          ctx.save()
          ctx.strokeStyle = 'red'
          ctx.lineWidth = 2
          // 背景白底以增加可见性
          ctx.fillStyle = 'white'
          ctx.fillRect(x + row.inset.x, y + row.inset.y, insetSize.w, insetSize.h)
          // 计算将选区绘制到 inset 的缩放
          const scale = Math.min(insetSize.w / row.selection.w, insetSize.h / row.selection.h)
          const drawW = Math.floor(row.selection.w * scale)
          const drawH = Math.floor(row.selection.h * scale)
          const padX = Math.floor((insetSize.w - drawW) / 2)
          const padY = Math.floor((insetSize.h - drawH) / 2)
          ctx.drawImage(
              img,
              row.selection.x, row.selection.y, row.selection.w, row.selection.h,
              x + row.inset.x + padX, y + row.inset.y + padY, drawW, drawH
          )
          ctx.strokeRect(x + row.inset.x, y + row.inset.y, insetSize.w, insetSize.h)
          ctx.restore()
        }
      }
    }
  }

  // 下载
  const a = document.createElement('a')
  a.download = `comparison_${W}x${H}.png`
  a.href = canvas.toDataURL('image/png')
  a.click()
}

function getInsetSizeForExport(row: SceneRow) {
  if (!row.selection) return {w: 0, h: 0}
  const w = Math.floor(row.selection.w * row.inset.zoom)
  const h = Math.floor(row.selection.h * row.inset.zoom)
  const maxW = Math.floor((baseWidth.value || 0) * 0.65)
  const maxH = Math.floor((baseHeight.value || 0) * 0.65)
  return {w: Math.min(w, maxW), h: Math.min(h, maxH)}
}

function ensureImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function attachImgEl(sceneIdx: number, colIdx: number, el: HTMLImageElement | null) {
  const row = scenes[sceneIdx]
  if (!row) return
  if (!row.images[colIdx]) return
  row.images[colIdx].el = el
}

// 把选区渲染到 inset 预览 <canvas>（每格一个）
function drawInsetPreview(sceneIdx: number, colIdx: number, canvasEl: HTMLCanvasElement | null) {
  const row = scenes[sceneIdx]
  if (!canvasEl || !row || !row.inset.visible || !row.selection) return
  const imgEl = row.images[colIdx].el
  if (!imgEl) return

  const {w, h} = getInsetRenderSize(sceneIdx)
  canvasEl.width = w
  canvasEl.height = h

  const ctx = canvasEl.getContext('2d')!
  ctx.clearRect(0, 0, w, h)

  // 将原图上选区绘制到 inset
  const scale = Math.min(w / row.selection.w, h / row.selection.h)
  const drawW = Math.floor(row.selection.w * scale)
  const drawH = Math.floor(row.selection.h * scale)
  const padX = Math.floor((w - drawW) / 2)
  const padY = Math.floor((h - drawH) / 2)

  // 为了画布能从 <img> 取像素，我们用 Image 对象
  ensureImageElement(row.images[colIdx].url).then(srcImg => {
    ctx.drawImage(
        srcImg,
        row.selection!.x, row.selection!.y, row.selection!.w, row.selection!.h,
        padX, padY, drawW, drawH
    )
    // 红边
    ctx.save()
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, w, h)
    ctx.restore()
  })
}

const gridColsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${methodCount.value}, 1fr)`
}))
</script>

<template>
  <div id="comparison-marker">
    <div class="toolbar">
      <label class="inline">
        方法数：
        <input
            type="number"
            min="1"
            max="20"
            v-model.number="methodCount"
        />
      </label>
      <button class="btn" @click="addScene">新增场景行</button>
      <button class="btn primary" @click="exportComposite" :disabled="!baseWidth || !baseHeight || scenes.length===0">
        导出对比图
      </button>
      <div class="meta" v-if="baseWidth && baseHeight">
        基准尺寸：{{ baseWidth }} × {{ baseHeight }} | 网格：{{ methodCount }} 列 × {{ scenes.length }} 行
      </div>
    </div>

    <div class="scenes">
      <div
          v-for="(row, rIdx) in scenes"
          :key="rIdx"
          class="scene-row"
          :style="gridColsStyle"
      >
        <div class="cell header">
          <div class="upload">
            <div class="title">场景 {{ rIdx + 1 }}</div>
            <input type="file" accept="image/*" :multiple="true" @change="(e) => handleUpload(e, rIdx)"/>
            <div class="hint">一次选择 {{ methodCount }} 张图片（同尺寸）。</div>
            <button class="btn danger" @click="removeScene(rIdx)">删除该行</button>
          </div>
        </div>

        <div
            v-for="(img, cIdx) in row.images"
            :key="cIdx"
            class="cell image-cell"
        >
          <div class="filename">{{ img.name }}</div>
          <div class="image-wrap" v-if="img && img.url">
            <!-- 原图 -->
            <img
                :src="img.url"
                class="base-img"
                draggable="false"
                :style="{ width: '100%', height: 'auto' }"
                @mousedown="(ev) => onMouseDownSelect(ev, rIdx, ev.target as HTMLImageElement)"
                @mousemove="(ev) => onMouseMove(ev, rIdx, ev.target as HTMLImageElement)"
                @mouseup="(ev) => onMouseUpSelect(ev, rIdx)"
                @load="(ev) => attachImgEl(rIdx, cIdx, ev.target as HTMLImageElement)"
                alt=""/>

            <!-- 红框（按基准尺寸 -> 实际呈现按比例缩放） -->
            <div
                v-if="row.selection && row.selection.w>0 && row.selection.h>0"
                class="selection"
                :style="{
                left: (row.selection.x / (baseWidth||1)) * 100 + '%',
                top: (row.selection.y / (baseHeight||1)) * 100 + '%',
                width: (row.selection.w / (baseWidth||1)) * 100 + '%',
                height: (row.selection.h / (baseHeight||1)) * 100 + '%'
              }"
            ></div>

            <!-- 放大图（预览 canvas） -->
            <div
                v-if="row.inset.visible && row.selection && row.selection.w>0"
                class="inset"
                :style="{
                left: (row.inset.x / (baseWidth||1)) * 100 + '%',
                top: (row.inset.y / (baseHeight||1)) * 100 + '%',
                width: (getInsetRenderSize(rIdx).w / (baseWidth||1)) * 100 + '%',
                height: (getInsetRenderSize(rIdx).h / (baseHeight||1)) * 100 + '%'
              }"
                @wheel.prevent="(e) => onWheelInset(e, rIdx)"
                @mousedown.stop="(e) => onMouseDownInset(e, rIdx, img.el || null)"
            >
              <canvas
                  class="inset-canvas"
                  :ref="(el:any) => drawInsetPreview(rIdx, cIdx, el)"
              ></canvas>
            </div>
          </div>
          <div v-else class="placeholder">
            <div>方法 {{ cIdx + 1 }}</div>
            <div class="sub">等待上传</div>
          </div>
        </div>
      </div>
    </div>

    <div class="tips">
      使用说明：
      <ol>
        <li>点击“新增场景行”，每行代表一个场景；一次性选择 <b>{{ methodCount }}</b> 张图（对应不同方法）。</li>
        <li>在任意方法图上用鼠标拖出红框（所有方法图同步该位置）。</li>
        <li>若选区 &lt; 原图 20% 面积，会自动显示放大图：滚轮调倍率，按住左键拖动位置（限原图内）。</li>
        <li>点击“导出对比图”，输出 PNG：宽 = 方法数×图宽，高 = 场景数×图高。</li>
      </ol>
    </div>
  </div>
</template>

<style scoped lang="scss">
#comparison-marker {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  user-select: none;
  overflow-y: auto;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;

    input[type="number"] {
      width: 80px;
      padding: 4px 6px;
    }
  }

  .btn {
    padding: 6px 12px;
    border: 1px solid #999;
    cursor: pointer;
    border-radius: 6px;

    &.primary {
      background: #3b82f6;
      color: #fff;
      border-color: #3b82f6;
    }

    &.danger {
      background: #ef4444;
      color: #fff;
      border-color: #ef4444;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .meta {
    opacity: 0.8;
  }
}

.scenes {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scene-row {
  display: grid;
  grid-auto-rows: 1fr;
  gap: 10px;
  align-items: start;

  .cell {
    position: relative;
    background: #1113;
    border: 1px dashed #8886;
    overflow: hidden;
    min-height: 120px;

    &.header {
      grid-column: 1 / -1;
      padding: 10px;
      background: #1112;
      border-style: solid;

      .upload {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;

        .title {
          font-weight: 600;
          margin-right: 6px;
        }

        .hint {
          opacity: 0.8;
        }
      }
    }
  }

  .image-cell {
    background: #000;

    .placeholder {
      display: grid;
      place-items: center;
      height: 220px;
      color: #ddd;

      .sub {
        opacity: 0.7;
        font-size: 12px;
      }
    }

    .image-wrap {
      position: relative;
      width: 100%;
      // 让图片宽度自适应，保持等比，容器按内容高度
      .base-img {
        display: block;
        width: 100%;
        height: auto;
        pointer-events: auto;
      }

      // 红框（选区）
      .selection {
        position: absolute;
        border: 3px solid red;
        box-shadow: 0 0 0 1px #0006 inset;
        pointer-events: none;
      }

      // 放大图容器
      .inset {
        position: absolute;
        box-shadow: 0 0 0 2px red inset, 0 0 0 2px red;
        background: #fff;
        overflow: hidden;
        cursor: grab;

        .inset-canvas {
          display: block;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
      }

      .inset:active {
        cursor: grabbing;
      }
    }
  }

  .filename {
    margin-top: 4px;
    font-size: 12px;
    color: #aaa;
    text-align: center;
    word-break: break-all;
  }
}

.tips {
  font-size: 13px;
  opacity: 0.9;

  ol {
    margin: 6px 0 0 18px;

    li {
      margin: 4px 0;
    }
  }
}
</style>
