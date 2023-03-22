import { onUnmounted } from 'vue'

export function useEventListener<T = any>(
	target: any,
	event: keyof WindowEventMap,
	callback: (...arg: T[]) => void
) {
	if (!target) return
	const fn = (...arg: any[]) => {
		callback.apply(target, arg)
	}
	target.addEventListener(event, fn)
	onUnmounted(() => {
		target.removeEventListener(event, fn)
	})
}
