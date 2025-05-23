import {createApp} from 'vue';
import App from './App.vue';
import 'nprogress/nprogress.css'
import './assets/style.css';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'primeicons/primeicons.css'
import router from "./router";
import {createPinia} from "pinia";
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
// 进度条
import NProgress from 'nprogress';

const pinia = createPinia();

createApp(App)
    .use(pinia)
    .use(router)
    .use(ElementPlus).use(PrimeVue, {theme: {preset: Aura}})
    .mount('#app');

// 配置进度条
NProgress.configure({
    easing: 'ease',         // 动画方式
    speed: 500,             // 递增进度条的速度
    showSpinner: false,     // 是否显示加载ico
    trickleSpeed: 200,      // 自动递增间隔
});