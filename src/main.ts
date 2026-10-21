import {createApp} from 'vue';
// 进度条
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
// Element Plus 暗色变量（跟随 html.dark 生效），需在基础样式之后引入
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'primeicons/primeicons.css';
// 项目设计 token 与全局样式最后引入，确保覆盖组件库默认值
import './assets/style.css';
import App from './App.vue';
import router from "./router";
import {createPinia} from "pinia";
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import {initTheme} from './utils/useTheme';

const pinia = createPinia();

// 挂载前先应用持久化的主题，避免首屏闪烁
initTheme();

createApp(App)
    .use(pinia)
    .use(router)
    .use(ElementPlus)
    .use(PrimeVue, {theme: {preset: Aura, options: {darkModeSelector: '.dark'}}})
    .mount('#app');

// 配置进度条
NProgress.configure({
    easing: 'ease',         // 动画方式
    speed: 500,             // 递增进度条的速度
    showSpinner: false,     // 是否显示加载ico
    trickleSpeed: 200,      // 自动递增间隔
});