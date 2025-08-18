import {ref, watch} from "vue";

export const useLocalStorageRef = <T>(key: string, initialValue: T) => {
    const storedValue = localStorage.getItem(key);
    const initial = storedValue ? JSON.parse(storedValue) : initialValue;

    const r = ref<T>(initial);

    watch(r, (newValue) => {
        localStorage.setItem(key, JSON.stringify(newValue));
    });

    return r;
}