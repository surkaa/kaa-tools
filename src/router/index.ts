import type {RouteRecordRaw} from 'vue-router'
import {createRouter, createWebHistory} from 'vue-router';
import HomeView from "../views/HomeView.vue";
import TimestampTool from "../views/TimestampTool.vue";
import JsonFormatter from "../views/JsonFormatter.vue";
import RandomPassword from "../views/RandomPassword.vue";

const routes: RouteRecordRaw[] = [
    {
        name: 'home',
        path: '/',
        component: HomeView
    },
    {
        name: 'timestamp',
        path: '/timestamp',
        component: TimestampTool
    },
    {
        name: 'json',
        path: '/json',
        component: JsonFormatter
    },
    {
        name: 'password',
        path: '/password',
        component: RandomPassword
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.VITE_BASE_URL),
    routes: routes,
})

export default router