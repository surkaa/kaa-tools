<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Props {
  bgColor?: string;
  textColor?: string;
  label?: string;
}

const props = defineProps<Props>();

const buttonRef = ref<HTMLDivElement | null>(null);
const textRef = ref<HTMLSpanElement | null>(null);

const maxRange = 150; // 最大磁吸范围
let handleMouseMove: ((e: MouseEvent) => void) | null = null;

onMounted(() => {
  const btn = buttonRef.value;
  const text = textRef.value;
  if (!btn || !text) return;

  handleMouseMove = (e: MouseEvent) => {
    const rect = btn.getBoundingClientRect();
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;

    const dx = e.clientX - btnCenterX;
    const dy = e.clientY - btnCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < maxRange) {
      const strength = 1 - dist / maxRange;
      btn.style.transform = `translate(${dx * 0.15 * strength}px, ${dy * 0.15 * strength}px)`;
      text.style.transform = `translate(${dx * 0.35 * strength}px, ${dy * 0.35 * strength}px)`;
    } else {
      btn.style.transform = "translate(0,0)";
      text.style.transform = "translate(0,0)";
    }
  };

  document.addEventListener("mousemove", handleMouseMove);
});

onBeforeUnmount(() => {
  if (handleMouseMove) {
    document.removeEventListener("mousemove", handleMouseMove);
  }
});
</script>

<template>
  <div
      ref="buttonRef"
      class="magnetic-button"
      :style="{ backgroundColor: props.bgColor || '#f0f0f0', color: props.textColor || '#000' }"
  >
    <span ref="textRef" class="button-text">
      <slot>{{ props.label || 'Button' }}</slot>
    </span>
  </div>
</template>

<style scoped lang="scss">
.magnetic-button {
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 12px 28px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: transform 0.15s ease-out;
  user-select: none;
  overflow: hidden;
}

.button-text {
  position: relative;
  transition: transform 0.15s ease-out;
}
</style>
