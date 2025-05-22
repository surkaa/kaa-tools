import type {RouteRecordRaw} from 'vue-router'
import {createRouter, createWebHistory} from 'vue-router';

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
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: routes,
});

router.beforeEach((to, _from, next) => {
    document.title = to.meta.title as string || '工具箱';
    next();
});

export default router