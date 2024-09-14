import {ref} from "vue";

/**
 * 获取组件实例引用 <ElButton ref="BtnRef">
 * const BtnRef = useCompRef<typeof ElButton>();
 */
export function useCompRef<
    T extends abstract new (...args: any) => any
>() {
    return ref<InstanceType<T>>();
}