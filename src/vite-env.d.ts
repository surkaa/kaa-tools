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