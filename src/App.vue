<script lang="ts" setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {themeOptions, useTheme, type ThemePreference} from "./utils/useTheme";

const router = useRouter();
const route = useRoute();

// 过滤有效菜单项：包含meta.title且非首页的路由
const menus = computed(() =>
    router.getRoutes()
        .filter(route => route.meta?.title && route.path !== '/')
);

// 单独处理首页路由
const homeRoute = computed(() =>
    router.getRoutes().find(route => route.path === '/')
);

/* ------------------------------ 导航图标 ------------------------------ */
// 各工具的简单线性图标（24×24 viewBox，仅 path 数据），按路由 name 索引；
// 折叠侧栏时只显示图标，展开时图标 + 文字
const NAV_ICONS: Record<string, string[]> = {
    home: [
        "M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-4.4v-5.2H9.4V21H5a1 1 0 0 1-1-1Z",
    ],
    timestamp: [
        "M3.4 12a8.6 8.6 0 1 0 17.2 0 8.6 8.6 0 1 0-17.2 0Z",
        "M12 7.2V12l3 2",
    ],
    "cut-pdf": [
        "M7 3.8V17h13.2",
        "M3.8 7H17v13.2",
    ],
    password: [
        "M5.4 15.2a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 1 0-6.8 0Z",
        "M11.2 13 20 4.2",
        "M17.2 7l2.2 2.2",
        "M14.6 9.6l2.2 2.2",
    ],
    "github-repostory-file-tree": [
        "M5 3.8v16.4",
        "M5 8.2h5",
        "M5 15.6h5",
        "M10 6.2h4.6a1.4 1.4 0 0 1 1.4 1.4v1.2a1.4 1.4 0 0 1-1.4 1.4H10Z",
        "M10 13.6h4.6a1.4 1.4 0 0 1 1.4 1.4v1.2a1.4 1.4 0 0 1-1.4 1.4H10Z",
    ],
    "comparison-marker": [
        "M5 4.5h9.5V14H5Z",
        "M9.5 9.5H19V19H9.5Z",
    ],
    "image-compare": [
        "M4.6 5.4h14.8v13.2H4.6Z",
        "M12 5.4v13.2",
        "M6.6 15.4l2.6-2.6 2 2",
        "M13.4 13.8l2-2 2.6 2.6",
    ],
    "references-tools": [
        "M12 6.6C10.2 5.3 7.9 4.7 5 4.7v13.6c2.9 0 5.2.6 7 1.9 1.8-1.3 4.1-1.9 7-1.9V4.7c-2.9 0-5.2.6-7 1.9Z",
        "M12 6.6v13.6",
    ],
    "markdown-to-pdf": [
        "M6.2 3.6h7.4l4.2 4.2V20.4H6.2Z",
        "M13.6 3.6v4.2h4.2",
        "M10.2 11.6v4.6",
        "M8.4 14.4l1.8 1.8 1.8-1.8",
    ],
};

const navIconPaths = (name?: string | symbol | null): string[] => {
    if (!name) {
        return [];
    }
    return NAV_ICONS[String(name)] ?? [];
};

/* ------------------------------ 侧栏折叠 ------------------------------ */
const SIDEBAR_STORAGE_KEY = "kaa.sidebar-collapsed";

const readCollapsed = () => {
    try {
        return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
        return false;
    }
};

const isCollapsed = ref(readCollapsed());

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};

watch(isCollapsed, (value) => {
    try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? "1" : "0");
    } catch {
        /* 隐私模式下存储不可用时忽略即可 */
    }
});

/* ------------------------------ 主题配置 ------------------------------ */
const {preference, setPreference} = useTheme();

const themeMenuOpen = ref(false);
const themeSwitcherRef = ref<HTMLElement | null>(null);

const currentThemeLabel = computed(
    () => themeOptions.find(option => option.value === preference.value)?.label ?? "跟随系统"
);

const selectTheme = (value: ThemePreference) => {
    setPreference(value);
    themeMenuOpen.value = false;
};

const toggleThemeMenu = () => {
    themeMenuOpen.value = !themeMenuOpen.value;
};

const handleDocumentPointerDown = (event: PointerEvent) => {
    if (!themeMenuOpen.value) {
        return;
    }
    if (!themeSwitcherRef.value?.contains(event.target as Node)) {
        themeMenuOpen.value = false;
    }
};

const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
        themeMenuOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
    document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <div id="main">
    <aside id="toolbar" :class="{'is-collapsed': isCollapsed}">
      <router-link
          v-if="homeRoute"
          :to="homeRoute.path"
          class="brand"
          aria-label="返回首页"
          :title="isCollapsed ? 'Kaa Tools' : undefined"
      >
        <span class="brand-mark">K</span>
        <span class="brand-copy">
          <strong>Kaa Tools</strong>
          <small>Everyday utilities</small>
        </span>
      </router-link>

      <div class="nav-caption">工作台</div>
      <nav class="nav-list" aria-label="工具导航">
        <router-link
            v-if="homeRoute"
            :to="homeRoute.path"
            class="nav-item"
            :title="homeRoute.meta?.title || '首页'"
        >
          <span class="nav-glyph" aria-hidden="true">
            <svg v-if="navIconPaths(homeRoute.name).length" viewBox="0 0 24 24">
              <path v-for="(path, pathIndex) in navIconPaths(homeRoute.name)" :key="pathIndex" :d="path"/>
            </svg>
            <template v-else>⌂</template>
          </span>
          <span class="nav-label">{{ homeRoute.meta?.title || '首页' }}</span>
        </router-link>

        <template v-for="(menu, index) in menus" :key="menu.name">
          <router-link
              v-if="menu.meta?.title"
              :to="menu.path"
              class="nav-item"
              :title="menu.meta.title"
          >
            <span class="nav-glyph" aria-hidden="true">
              <svg v-if="navIconPaths(menu.name).length" viewBox="0 0 24 24">
                <path v-for="(path, pathIndex) in navIconPaths(menu.name)" :key="pathIndex" :d="path"/>
              </svg>
              <template v-else>{{ String(index + 1).padStart(2, '0') }}</template>
            </span>
            <span class="nav-label">{{ menu.meta.title }}</span>
          </router-link>
        </template>
      </nav>

      <!-- 侧栏底部操作区：折叠侧栏 + 主题配置 -->
      <div class="sidebar-actions">
        <button
            type="button"
            class="sidebar-action collapse-action"
            :title="isCollapsed ? '展开侧栏' : '收起侧栏'"
            :aria-label="isCollapsed ? '展开侧栏' : '收起侧栏'"
            :aria-pressed="isCollapsed"
            @click="toggleSidebar"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.2" y="4.6" width="17.6" height="14.8" rx="3.2"/>
            <path d="M9.6 4.6v14.8"/>
            <path d="M15.4 9.6 12.9 12l2.5 2.4"/>
          </svg>
        </button>

        <div ref="themeSwitcherRef" class="theme-switcher">
          <button
              type="button"
              class="sidebar-action theme-action"
              :title="`主题外观：${currentThemeLabel}`"
              :aria-label="`主题外观：${currentThemeLabel}`"
              aria-haspopup="menu"
              :aria-expanded="themeMenuOpen"
              @click="toggleThemeMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <g v-if="preference === 'light'">
                <circle cx="12" cy="12" r="4.2"/>
                <path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>
              </g>
              <g v-else-if="preference === 'dark'">
                <path d="M20.4 14.3A8.6 8.6 0 0 1 9.7 3.6a8.6 8.6 0 1 0 10.7 10.7Z"/>
              </g>
              <g v-else>
                <circle cx="12" cy="12" r="8.2"/>
                <path d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" fill="currentColor" stroke="none"/>
              </g>
            </svg>
          </button>

          <transition name="theme-menu">
            <div v-if="themeMenuOpen" class="theme-menu" role="menu" aria-label="主题外观">
              <p class="theme-menu-title">主题外观</p>
              <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  type="button"
                  class="theme-option"
                  role="menuitemradio"
                  :aria-checked="preference === option.value"
                  :class="{'is-active': preference === option.value}"
                  @click="selectTheme(option.value)"
              >
                <svg class="theme-option-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <g v-if="option.value === 'light'">
                    <circle cx="12" cy="12" r="4.2"/>
                    <path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>
                  </g>
                  <g v-else-if="option.value === 'dark'">
                    <path d="M20.4 14.3A8.6 8.6 0 0 1 9.7 3.6a8.6 8.6 0 1 0 10.7 10.7Z"/>
                  </g>
                  <g v-else>
                    <circle cx="12" cy="12" r="8.2"/>
                    <path d="M12 3.8a8.2 8.2 0 0 1 0 16.4Z" fill="currentColor" stroke="none"/>
                  </g>
                </svg>
                <span class="theme-option-copy">
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.hint }}</small>
                </span>
                <span class="theme-option-check" aria-hidden="true">✓</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </aside>

    <main class="app-stage">
      <router-view v-slot="{ Component }">
        <transition name="fade-transform" mode="out-in">
          <keep-alive>
            <component :key="route.path" :is="Component"/>
          </keep-alive>
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped lang="scss">
#main {
  width: 100%;
  height: 100%;
  display: flex;
  overflow: hidden;

  .fade-transform-enter-active,
  .fade-transform-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
  }

  .fade-transform-enter-from {
    opacity: 0;
    transform: translateY(8px);
  }

  .fade-transform-leave-to {
    opacity: 0;
    transform: translateY(-5px);
  }
}

.app-stage {
  position: relative;
  min-width: 0;
  flex: 1;
  overflow: auto;
}

#toolbar {
  position: relative;
  z-index: 20;
  width: 248px;
  flex: 0 0 248px;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 18px;
  color: #d8e8e2;
  background:
      radial-gradient(circle at 28% 5%, rgba(43, 220, 164, 0.18), transparent 15rem),
      linear-gradient(165deg, #122923 0%, #0b1c18 68%, #071512 100%);
  box-shadow: 12px 0 40px rgba(16, 45, 37, 0.1);
  transition: width 0.24s ease, flex-basis 0.24s ease, padding 0.24s ease;

  &::after {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 160px;
    height: 160px;
    border: 1px solid rgba(105, 227, 186, 0.1);
    border-radius: 50%;
    content: "";
    transform: translate(55%, 55%);
    pointer-events: none;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 6px 34px;
  color: #fff;
  text-decoration: none;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  flex: 0 0 42px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 14px;
  color: #083528;
  background: #52d7aa;
  box-shadow: 0 10px 28px rgba(21, 202, 144, 0.25);
  font-size: 1.1rem;
  font-weight: 850;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;

  strong {
    font-size: 0.98rem;
    letter-spacing: -0.015em;
  }

  small {
    margin-top: 2px;
    color: rgba(216, 232, 226, 0.52);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.nav-caption {
  margin: 0 12px 9px;
  color: rgba(216, 232, 226, 0.42);
  font-size: 0.66rem;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.nav-list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 13px;
  color: rgba(225, 239, 234, 0.67);
  font-size: 0.83rem;
  font-weight: 580;
  text-decoration: none;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &::after {
    position: absolute;
    right: 12px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #59deb2;
    content: "";
    opacity: 0;
    transform: scale(0.5);
    transition: opacity 0.18s ease, transform 0.18s ease;
  }

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.055);
    transform: translateX(2px);
  }

  &.router-link-exact-active {
    border-color: rgba(105, 227, 186, 0.14);
    color: #fff;
    background: linear-gradient(90deg, rgba(63, 211, 164, 0.16), rgba(255, 255, 255, 0.04));

    &::after {
      opacity: 1;
      transform: scale(1);
    }

    .nav-glyph {
      border-color: rgba(105, 227, 186, 0.28);
      color: #7be7c4;
      background: rgba(89, 222, 178, 0.1);
    }
  }
}

.nav-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-glyph {
  width: 25px;
  height: 25px;
  display: grid;
  flex: 0 0 25px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(216, 232, 226, 0.46);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.62rem;
  letter-spacing: -0.02em;

  /* 导航图标：折叠态只显示它 */
  svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

/* 侧栏底部操作区：折叠 + 主题 */
.sidebar-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex: 0 0 auto;
}

.sidebar-action {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(216, 232, 226, 0.72);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  &:hover,
  &:focus-visible {
    color: #fff;
    border-color: rgba(126, 229, 195, 0.32);
    background: rgba(255, 255, 255, 0.09);
  }

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.24s ease;
  }
}

.theme-switcher {
  position: relative;
  display: flex;
}

/* 主题菜单：侧栏始终是深色，因此菜单固定使用深色浮层 */
.theme-menu {
  position: absolute;
  left: calc(100% + 16px);
  bottom: 0;
  z-index: 30;
  width: 236px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(10, 24, 19, 0.97);
  box-shadow: 0 24px 60px rgba(4, 18, 13, 0.5);
  backdrop-filter: blur(18px);
}

.theme-menu-title {
  margin: 4px 10px 7px;
  color: rgba(216, 232, 226, 0.42);
  font-size: 0.62rem;
  font-weight: 750;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.theme-option {
  width: 100%;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 14px;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: 10px;
  color: rgba(216, 232, 226, 0.72);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: color 0.16s ease, background 0.16s ease;

  &:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  &.is-active {
    color: #fff;
    background: rgba(63, 211, 164, 0.14);
  }

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.theme-option-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;

  strong {
    font-size: 0.76rem;
    font-weight: 640;
  }

  small {
    margin-top: 1px;
    color: rgba(216, 232, 226, 0.45);
    font-size: 0.62rem;
  }
}

.theme-option-check {
  color: #5ce0b2;
  font-size: 0.72rem;
  opacity: 0;
  transition: opacity 0.16s ease;

  .theme-option.is-active & {
    opacity: 1;
  }
}

.theme-menu-enter-active,
.theme-menu-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.theme-menu-enter-from,
.theme-menu-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

/* 折叠态：仅保留图标栏，宽度 76px；折叠按钮仍可见可展开 */
@media (min-width: 861px) {
  #toolbar.is-collapsed {
    width: 76px;
    flex: 0 0 76px;
    align-items: center;
    padding: 18px 10px 14px;

    .brand {
      justify-content: center;
      margin: 0 0 24px;
    }

    .brand-copy,
    .nav-caption {
      display: none;
    }

    .nav-list {
      width: 100%;
    }

    .nav-item {
      justify-content: center;
      gap: 0;
      padding: 8px;

      &::after {
        right: 6px;
      }
    }

    .nav-label {
      display: none;
    }

    .nav-glyph {
      width: 28px;
      height: 28px;
      flex-basis: 28px;

      svg {
        width: 19px;
        height: 19px;
      }
    }

    .sidebar-actions {
      /* 折叠态纵向排列：主题按钮在上，折叠按钮在下（DOM 顺序为折叠、主题，故用 column-reverse） */
      flex-direction: column-reverse;
      gap: 8px;
    }

    .collapse-action svg {
      transform: rotate(180deg);
    }

    .theme-menu {
      left: calc(100% + 18px);
      bottom: 0;
    }
  }
}

@media (max-width: 860px) {
  #main {
    display: block;
  }

  .app-stage {
    width: 100%;
    height: 100%;
  }

  #toolbar {
    position: fixed;
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
    height: 68px;
    display: block;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    box-shadow: 0 18px 50px rgba(7, 24, 19, 0.3);

    &::after,
    .brand,
    .nav-caption,
    .sidebar-actions {
      display: none;
    }
  }

  .nav-list {
    height: 100%;
    display: flex;
    flex-direction: row;
    gap: 4px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .nav-item {
    min-width: 94px;
    min-height: 50px;
    flex: 1 0 auto;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    padding: 5px 10px;
    font-size: 0.65rem;
    line-height: 1;
    scroll-snap-align: center;

    &::after {
      top: 6px;
      right: 8px;
    }

    &:hover {
      transform: none;
    }
  }

  .nav-label {
    white-space: nowrap;
  }

  .nav-glyph {
    width: auto;
    height: auto;
    border: 0;
    background: transparent !important;
    font-size: 0.58rem;

    svg {
      width: 16px;
      height: 16px;
    }
  }
}
</style>