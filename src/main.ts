import { createApp } from 'vue';
import App from './App.vue';
import './assets/style.css';
import './assets/index.css';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import router from "./router";
import {createPinia} from "pinia";

const pinia = createPinia();

createApp(App)
    .use(pinia)
    .use(router)
    .use(ElementPlus)
    .mount('#app');
