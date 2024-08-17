import type {RouteRecordRaw} from 'vue-router'
import {createRouter, createWebHistory} from 'vue-router';
import HomeView from "../views/HomeView.vue";
import TimestampTool from "../views/TimestampTool.vue";
import JsonFormatter from "../views/JsonFormatter.vue";

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: HomeView
    },
    {
        name: 'timestamp-tool',
        path: '/timestamp-tool',
        component: TimestampTool
    },
    {
        name: 'json-formatter',
        path: '/json-formatter',
        component: JsonFormatter
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/login',
        name: 'NotFount',
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: routes,
})

export default router