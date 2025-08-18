<script setup lang="ts">
import {computed, nextTick, reactive, ref} from 'vue'
import {useLocalStorageRef} from "../utils/useLocalStorgeRef.ts";

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
  baseW: number;                 // 该行图的基准宽度（上传时确定）
  baseH: number;                 // 该行图的基准高度（上传时确定）
  name: string;
}

const sceneLabelW = 100 // 左边预留 100px 放场景名字
const methodLabelH = 40 // 上边预留 40px 放方法名字

const methodCount = useLocalStorageRef<number>('methodCount', 5) // 默认 5 种方法
const methodNames = useLocalStorageRef<string[]>('methodNames', [
    '3DGS', 'FSGS', 'DROP', 'OURS', 'GT'
]);
const scenes = reactive<SceneRow[]>([])

const isDrawing = ref(false)
const drawStart = reactive({x: 0, y: 0})
const currentHoverSceneIdx = ref<number | null>(null) // 当前鼠标作用的场景行索引

const methodGap = useLocalStorageRef('methodGap', 20) // px
const sceneGap = useLocalStorageRef('sceneGap', 20)  // px

// 拖拽 inset
const draggingInset = reactive({active: false, offsetX: 0, offsetY: 0, sceneIdx: -1})

function imageAreaThreshold(sceneIdx: number) {
  const row = scenes[sceneIdx];
  if (!row || !row.selection) {
    alert('请先选中一个选区。')
    return Infinity
  }
  return row.baseW * row.baseH * 0.2;
}

function addScene() {
  const row: SceneRow = {
    images: Array.from({length: methodCount.value}, () => (null as any)),
    inset: {x: 0, y: 0, zoom: 2, visible: false},
    baseW: 0,
    baseH: 0,
    name: `场景 ${scenes.length + 1}`
  }
  // 用 null 占位，后续上传后替换
  row.images = Array.from({length: methodCount.value}, () => ({
    file: undefined as any, url: '', width: 0, height: 0, el: null, name: ''
  }))
  scenes.push(row)
}

function removeScene(i: number) {
  scenes.splice(i, 1)
}

// 检查尺寸是否和基准一致
function ensureBaseSizeMatch(w: number, h: number, sceneIdx: number): boolean {
  const row = scenes[sceneIdx]
  if (row.baseW === 0 && row.baseH === 0) {
    // 第一次设置基准尺寸
    row.baseW = w
    row.baseH = h
    return true
  }
  return w === row.baseW && h === row.baseH
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
  const loaded: ImgItem[] = [];
  const row = scenes[sceneIdx];
  for (const f of files) {
    const url = URL.createObjectURL(f)
    const dims = await getImageSize(url)
    if (!ensureBaseSizeMatch(dims.width, dims.height, sceneIdx)) {
      URL.revokeObjectURL(url)
      alert(`尺寸不一致：该批图片为 ${dims.width}×${dims.height}，但基准尺寸是 ${row.baseW}×${row.baseH}。已拦截。`)
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
  const defaultInsetW = Math.floor(Math.min(row.baseW, row.baseH) * 0.45)
  const defaultInsetH = defaultInsetW
  scenes[sceneIdx].inset.x = Math.floor((row.baseW - defaultInsetW) / 2)
  scenes[sceneIdx].inset.y = Math.floor((row.baseH - defaultInsetH) / 2)
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

  const {x, y} = getRelativePos(ev, imgEl, sceneIdx)
  drawStart.x = x
  drawStart.y = y
  // 初始化一个 selection
  scenes[sceneIdx].selection = {x, y, w: 0, h: 0}
}

function onMouseMove(ev: MouseEvent, sceneIdx: number, imgEl: HTMLImageElement | null) {
  const row = scenes[sceneIdx];
  if (draggingInset.active && draggingInset.sceneIdx === sceneIdx) {
    // 正在拖拽 inset
    const bw = row.baseW, bh = row.baseH
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
  const {x, y} = getRelativePos(ev, imgEl!, sceneIdx)
  const rx = clamp(Math.min(drawStart.x, x), 0, row.baseW)
  const ry = clamp(Math.min(drawStart.y, y), 0, row.baseH)
  const rw = clamp(Math.abs(x - drawStart.x), 0, row.baseW - rx)
  const rh = clamp(Math.abs(y - drawStart.y), 0, row.baseH - ry)
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
  s.inset.visible = area > 0 && area < imageAreaThreshold(sceneIdx)
}

function getRelativePos(ev: MouseEvent, imgEl: HTMLImageElement, sceneIdx: number) {
  const row = scenes[sceneIdx];
  const rect = imgEl.getBoundingClientRect()
  // 将屏幕坐标映射到原图像素（假设展示按等比铺满容器且原始尺寸=基准尺寸）
  const scaleX = row.baseW / rect.width
  const scaleY = row.baseH / rect.height
  const x = clamp(Math.round((ev.clientX - rect.left) * scaleX), 0, row.baseW)
  const y = clamp(Math.round((ev.clientY - rect.top) * scaleY), 0, row.baseH)
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
  const maxW = Math.floor(s.baseW * 0.65)
  const maxH = Math.floor(s.baseH * 0.65)
  return {w: Math.min(w, maxW), h: Math.min(h, maxH)}
}

function onWheelInset(ev: WheelEvent, sceneIdx: number) {
  if (!scenes[sceneIdx].inset.visible) return
  ev.preventDefault()
  const s = scenes[sceneIdx];
  const inset = s.inset;
  inset.zoom = clamp(inset.zoom + (ev.deltaY < 0 ? 0.2 : -0.2), 1, 8)
  // 缩放后保证仍在边界内
  const sz = getInsetRenderSize(sceneIdx)
  inset.x = clamp(inset.x, 0, s.baseW - sz.w)
  inset.y = clamp(inset.y, 0, s.baseH - sz.h)
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

  // 1. 找出所有场景的最大基准宽度
  const maxBaseW = Math.max(...scenes.map(r => r.baseW))

  // 2. 每行计算缩放后的高度
  const rowHeights: number[] = []
  for (const row of scenes) {
    const scale = maxBaseW / row.baseW
    rowHeights.push(Math.round(row.baseH * scale))
  }

  // 3. 计算画布总宽高
  const W = methodCount.value * maxBaseW + (methodCount.value - 1) * methodGap.value + sceneLabelW
  const H = rowHeights.reduce((sum, h, i) => sum + h + (i > 0 ? sceneGap.value : 0), 0) + methodLabelH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 绘制字符串
  ctx.save()
  ctx.font = "20px Times New Roman"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  for (let c = 0; c < methodCount.value; c++) {
    const x = sceneLabelW + c * maxBaseW + c * methodGap.value + maxBaseW / 2
    const y = methodLabelH / 2
    const mn = methodNames.value[c];
    console.log(mn);
    ctx.fillText(mn, x, y)
  }
  ctx.restore()
  ctx.save()

  ctx.font = "20px Times New Roman"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  let yOffset = 0
  for (let r = 0; r < scenes.length; r++) {
    const row = scenes[r]
    const scaledH = rowHeights[r]

    // 文字中心点
    const cx = sceneLabelW / 2
    const cy = methodLabelH + yOffset + scaledH / 2

    // 把画布移动到中心点，旋转 -90°，写字
    ctx.translate(cx, cy)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(row.name, 0, 0)

    ctx.rotate(Math.PI / 2)
    ctx.translate(-cx, -cy)

    yOffset += scaledH + sceneGap.value
  }
  ctx.restore()

  // 逐格绘制
  yOffset = 0
  for (let r = 0; r < scenes.length; r++) {
    const row = scenes[r]
    const scale = maxBaseW / row.baseW
    const scaledH = rowHeights[r]

    for (let c = 0; c < methodCount.value; c++) {
      const img = await ensureImageElement(row.images[c].url)

      const x = sceneLabelW + c * maxBaseW + c * methodGap.value
      const y = methodLabelH + yOffset

      // 绘制缩放后的主图
      ctx.drawImage(
          img,
          0, 0, row.baseW, row.baseH, // 原图基准大小
          x, y, maxBaseW, scaledH     // 缩放绘制
      )

      if (!(row.selection && row.selection.w > 0 && row.selection.h > 0)) continue;
      // 画红框
      ctx.save()
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 3
      ctx.strokeRect(
          x + row.selection.x * scale,
          y + row.selection.y * scale,
          row.selection.w * scale,
          row.selection.h * scale
      )
      ctx.restore()
      if (!row.inset.visible) continue;

      // 画放大后的图
      const insetSize = getInsetSizeForExport(row)
      const insetX = x + row.inset.x * scale
      const insetY = y + row.inset.y * scale
      const insetW = insetSize.w * scale
      const insetH = insetSize.h * scale
      ctx.save()
      ctx.fillStyle = 'white'
      ctx.fillRect(insetX, insetY, insetW, insetH)
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.strokeRect(insetX, insetY, insetW, insetH)
      const scaleInset = Math.min(
          insetW / (row.selection.w * scale),
          insetH / (row.selection.h * scale)
      )
      const drawW = Math.floor(row.selection.w * scale * scaleInset)
      const drawH = Math.floor(row.selection.h * scale * scaleInset)
      const padX = Math.floor((insetW - drawW) / 2)
      const padY = Math.floor((insetH - drawH) / 2)
      ctx.drawImage(
          img,
          row.selection.x, row.selection.y, row.selection.w, row.selection.h,
          insetX + padX, insetY + padY, drawW, drawH
      )
      ctx.restore()
    }

    yOffset += scaledH + sceneGap.value
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
  const maxW = Math.floor((row.baseW || 0) * 0.65)
  const maxH = Math.floor((row.baseH || 0) * 0.65)
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

function onMethodCountInput(event: Event) {
  const val = Number((event.target as HTMLInputElement).value)

  // 如果已经有场景了，询问是否要更改
  if (scenes.length > 0 && val !== methodCount.value) {
    if (!confirm(`当前有 ${scenes.length} 个场景，是否要更改方法数？这将重置所有场景。`)) return
    // 重置所有场景
    scenes.splice(0, scenes.length);
  }
  // 确保 methodNames 数组长度与 methodCount 一致
  while (methodNames.value.length < methodCount.value) {
    methodNames.value.push(`method ${methodNames.value.length + 1}`)
  }
  while (methodNames.value.length > methodCount.value) {
    methodNames.value.pop()
  }

  methodCount.value = val
}
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
            :value="methodCount"
            @input="onMethodCountInput"
        />
        渲染时不同方法间隔：
        <input
            type="number"
            min="0"
            v-model.number="methodGap"
        />
        渲染时不同场景间隔：
        <input
            type="number"
            min="0"
            v-model.number="sceneGap"
        />
      </label>
      <button class="btn" @click="addScene">新增场景行</button>
      <button class="btn primary" @click="exportComposite" :disabled="scenes.length===0">
        导出对比图
      </button>
      <div class="meta" v-if="scenes.length">
        网格：{{ methodCount }} 列 × {{ scenes.length }} 行
      </div>
      <div id="method-names" v-for="i in methodCount">
        <input type="text" v-model="methodNames[i - 1]">
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
            <div class="title">
              <!-- 可输入可修改的场景 -->
              <input
                  type="text"
                  v-model="row.name"
                  placeholder="场景名称"
                  @input="row.name = row.name.trim() || `场景 ${rIdx + 1}`"
              />
            </div>
            <input v-if="!row.baseW && !row.baseH" type="file" accept="image/*" :multiple="true" @change="(e) => handleUpload(e, rIdx)"/>
            <div v-if="!row.baseW && !row.baseH" class="hint">一次选择 {{ methodCount }} 张图片（同尺寸）。</div>
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
                left: (row.selection.x / (row.baseW || 1)) * 100 + '%',
                top: (row.selection.y / (row.baseH || 1)) * 100 + '%',
                width: (row.selection.w / (row.baseW || 1)) * 100 + '%',
                height: (row.selection.h / (row.baseH || 1)) * 100 + '%'
              }"
            ></div>

            <!-- 放大图（预览 canvas） -->
            <div
                v-if="row.inset.visible && row.selection && row.selection.w>0"
                class="inset"
                :style="{
                left: (row.inset.x / (row.baseW || 1)) * 100 + '%',
                top: (row.inset.y / (row.baseH || 1)) * 100 + '%',
                width: (getInsetRenderSize(rIdx).w / (row.baseW || 1)) * 100 + '%',
                height: (getInsetRenderSize(rIdx).h / (row.baseH || 1)) * 100 + '%'
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
        <li>点击“导出对比图”，输出 PNG：宽 = 方法数×最宽图的宽+若干间隙，高 = 每个场景图片的高度和+若干间隙。</li>
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
  gap: 10px;
  align-items: start;
  border: 1px solid #8886;

  .cell {
    position: relative;
    background: #1113;
    overflow: hidden;

    &.header {
      grid-column: 1 / -1;
      padding: 10px;
      background: #1112;

      .upload {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;

        .title {
          font-weight: 600;
          margin-right: 6px;

          input {
            // 放大
            width: 150px;
            padding: 4px 6px;
            font-size: 40px;
            border: 1px solid #999;
            border-radius: 4px;
            background: #222;
            color: #fff;
            outline: none;
          }
        }

        .hint {
          opacity: 0.8;
        }
      }
    }
  }

  .image-cell {
    background: #000;

    .filename {
      margin-top: 4px;
      font-size: 12px;
      color: #aaa;
      text-align: center;
      word-break: break-all;
    }

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
