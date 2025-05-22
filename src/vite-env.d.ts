/// <reference types="vite/client" />
interface ImportMetaEnv {
    /**
     * 网站前缀
     */
    readonly VITE_BASE_URL: string;
    /**
     * 网站标题
     */
    readonly VITE_APP_TITLE: string;
    /**
     * API
     */
    readonly VITE_APP_API_URL: string;
    /**
     * 图片资源路径
     */
    readonly VITE_APP_IMAGE_HOST: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// 扩展vue-router的类型定义
import 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        /**
         * 页面标题
         */
        title?: string;
        /**
         * 菜单图标
         */
        icon?: string;
    }
}