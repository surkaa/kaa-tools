import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        watch: {
            // pnpm 的项目索引可能链接回当前目录，避免循环监听和重复热更新。
            ignored: ['**/.pnpm-store/**'],
        },
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern-compiler',
            }
        }
    },
    optimizeDeps: {
        // 单页应用只从入口扫描依赖，避免遍历工作区内的 .pnpm-store 等缓存目录。
        entries: ['index.html'],
    },
    plugins: [vue()],
})
