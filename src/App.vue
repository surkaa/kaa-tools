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
    <router-view v-slot="{ Component }">
      <transition name="fade-transform" mode="out-in">
        <keep-alive>
          <component :key="route.path" :is="Component"/>
        </keep-alive>
      </transition>
    </router-view>
    <nav id="toolbar">
      <!-- 首页单独处理 -->
      <router-link
          v-if="homeRoute"
          :to="homeRoute.path"
          class="nav-item"
      >
        {{ homeRoute.meta?.title || '首页' }}
      </router-link>

      <!-- 动态生成其他菜单项 -->
      <template v-for="menu in menus" :key="menu.name">
        <router-link
            :to="menu.path"
            class="nav-item"
            v-if="menu.meta?.title"
        >
          {{ menu.meta.title }}
        </router-link>
      </template>
    </nav>
  </div>
</template>

<style scoped lang="scss">
#main {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .fade-transform-leave-active,
  .fade-transform-enter-active {
    transition: all .3s;
  }

  .fade-transform-enter {
    opacity: 0;
    transform: translateX(-30px);
  }

  .fade-transform-leave-to {
    opacity: 0;
    transform: translateX(30px);
  }

  #toolbar {
    position: absolute;
    display: flex;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%); // 水平居中对齐
    width: auto;
    justify-content: space-around;
    background-color: #333;
    border-radius: 20px;

    a {
      color: #fff;
      width: fit-content;
      text-decoration: none;
      font-weight: bold;
      padding: 12px 3rem;
    }

    .nav-item {
      color: #fff;
      min-width: 100px; // 改为最小宽度适应不同标题长度
      text-align: center;
      text-decoration: none;
      font-weight: bold;
      padding: 12px 1.5rem; // 调整左右间距
      transition: background 0.3s ease;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
      }

      &.router-link-exact-active {
        color: #42b983;
        background-color: rgba(66, 185, 131, 0.1);
      }
    }
  }
}
</style>
