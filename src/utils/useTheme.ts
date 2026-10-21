import {computed, ref, watch} from "vue";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeOption {
    value: ThemePreference;
    label: string;
    hint: string;
}

export const THEME_STORAGE_KEY = "kaa.theme";

export const themeOptions: ThemeOption[] = [
    {value: "light", label: "亮色", hint: "始终使用亮色外观"},
    {value: "dark", label: "暗色", hint: "始终使用暗色外观"},
    {value: "system", label: "跟随系统", hint: "随系统亮暗偏好自动切换"},
];

const THEME_COLORS: Record<ResolvedTheme, string> = {
    light: "#f3f7f5",
    dark: "#08110f",
};

const isThemePreference = (value: string | null): value is ThemePreference =>
    value === "light" || value === "dark" || value === "system";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

const readStoredPreference = (): ThemePreference => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return isThemePreference(stored) ? stored : "system";
    } catch {
        return "system";
    }
};

const preference = ref<ThemePreference>(readStoredPreference());
const systemPrefersDark = ref(mediaQuery.matches);

// 最终生效的主题：system 时跟随系统偏好
const resolvedTheme = computed<ResolvedTheme>(() =>
    preference.value === "system"
        ? (systemPrefersDark.value ? "dark" : "light")
        : preference.value
);

const applyTheme = (theme: ResolvedTheme) => {
    const root = document.documentElement;
    // data-theme 供本项目 token 使用；.dark 同时供 Element Plus / PrimeVue 的暗色选择器使用
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
        meta.content = THEME_COLORS[theme];
    }
};

const persistPreference = (value: ThemePreference) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
        /* 隐私模式下 localStorage 不可用时忽略即可 */
    }
};

// 模块加载即应用一次，配合 index.html 里的首屏脚本避免闪烁
applyTheme(resolvedTheme.value);

watch(resolvedTheme, (theme) => applyTheme(theme));

mediaQuery.addEventListener("change", (event) => {
    if (preference.value === "system") {
        systemPrefersDark.value = event.matches;
    }
});

// 多标签页之间同步主题设置
window.addEventListener("storage", (event) => {
    if (event.key === THEME_STORAGE_KEY && isThemePreference(event.newValue)) {
        preference.value = event.newValue;
    }
});

export const useTheme = () => {
    const setPreference = (value: ThemePreference) => {
        preference.value = value;
        persistPreference(value);
    };

    return {preference, resolvedTheme, systemPrefersDark, setPreference, themeOptions};
};

// 供 main.ts 在挂载前调用
export const initTheme = () => applyTheme(resolvedTheme.value);