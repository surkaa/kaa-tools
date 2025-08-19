import type {RouteRecordRaw} from 'vue-router'
import {createRouter, createWebHistory} from 'vue-router';
import NProgress from 'nprogress';

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: () => import('../views/HomeView.vue'),
        meta: {
            title: '首页'
        }
    },
    {
        name: 'timestamp',
        path: '/timestamp',
        component: () => import('../views/TimestampTool.vue'),
        meta: {
            title: '时间戳转换'
        }
    },
    {
        name: 'cut-pdf',
        path: '/cut-pdf',
        component: () => import('../views/CutPdf.vue'),
        meta: {
            title: 'PDF裁剪'
        }
    },
    // {
    //     name: 'json',
    //     path: '/json',
    //     component: () => import('../views/JsonFormatter.vue'),
    //     meta: {
    //         title: 'JSON格式化'
    //     }
    // },
    // {
    //     name: 'translate',
    //     path: '/translate',
    //     component: () => import('../views/TranslateTool.vue'),
    //     meta: {
    //         title: '翻译工具'
    //     }
    // },
    // {
    //     name: 'compare',
    //     path: '/compare',
    //     component: () => import('../views/CompareContent.vue'),
    //     meta: {
    //         title: '比较文本'
    //     }
    // },
    {
        name: 'password',
        path: '/password',
        component: () => import('../views/RandomPassword.vue'),
        meta: {
            title: '随机密码'
        }
    },
    {
        name: 'github-repostory-file-tree',
        path: '/github-repostory-file-tree',
        component: () => import('../views/GitHubRepoFileTree.vue'),
        meta: {
            title: 'GitHub 仓库文件树'
        }
    },
    {
        name: 'comparison-marker',
        path: '/comparison-marker',
        component: () => import('../views/ComparisonMarker.vue'),
        meta: {
            title: '对比标记'
        }
    },
    {
        name: 'image-compare',
        path: '/image-compare',
        component: () => import('../views/ImageCompare.vue'),
        meta: {
            title: '图片对比'
        }
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: routes,
});

router.beforeEach((to, from, next) => {
    console.log(`${from.path} => ${to.path}`);
    NProgress.start() // 开始加载进度条
    document.title = to.meta.title as string || '工具箱';
    next();
});

router.afterEach(() => NProgress.done());

router.onError((error) => {
    NProgress.done() // 发生错误时也结束进度条
    console.error('路由错误:', error)
});

export default router