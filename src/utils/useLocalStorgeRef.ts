import {ref, watch} from "vue";

export const refix = 'ulr.' as const;

export const useLocalStorageRef = <T>(key: string, initialValue: T) => {
    key = refix + key;
    const storedValue = localStorage.getItem(key);
    let initial;
    if (storedValue) {
        initial = JSON.parse(storedValue);
    } else {
        initial = initialValue;
        localStorage.setItem(key, JSON.stringify(initialValue));
    }

    const r = ref<T>(initial);

    watch(r, (newValue) => {
        localStorage.setItem(key, JSON.stringify(newValue));
    });

    return r;
}