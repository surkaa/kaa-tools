<script lang="ts" setup>
import {useRoute, useRouter} from "vue-router";
import {computed} from "vue";

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
</script>

<template>
  <div id="main">
    <aside id="toolbar">
      <router-link v-if="homeRoute" :to="homeRoute.path" class="brand" aria-label="返回首页">
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
        >
          <span class="nav-glyph">⌂</span>
          <span>{{ homeRoute.meta?.title || '首页' }}</span>
        </router-link>

        <template v-for="(menu, index) in menus" :key="menu.name">
          <router-link
              v-if="menu.meta?.title"
              :to="menu.path"
              class="nav-item"
          >
            <span class="nav-glyph">{{ String(index + 1).padStart(2, '0') }}</span>
            <span>{{ menu.meta.title }}</span>
          </router-link>
        </template>
      </nav>

      <div class="sidebar-footer">
        <span class="status-dot"></span>
        <span>轻量 · 本地优先</span>
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
}

.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 20px 9px 0;
  color: rgba(216, 232, 226, 0.42);
  font-size: 0.69rem;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #55dcae;
  box-shadow: 0 0 0 5px rgba(85, 220, 174, 0.09);
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
    .sidebar-footer {
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

  .nav-glyph {
    width: auto;
    height: auto;
    border: 0;
    background: transparent !important;
    font-size: 0.58rem;
  }
}
</style>
