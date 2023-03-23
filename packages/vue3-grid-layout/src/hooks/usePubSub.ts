import mitt from 'mitt'
import type { Emitter } from 'mitt'

export type EmitterEvents = {
	// initd: BMapGL.Map
	// unload: any
	'item:dragEvent': {
		eventName: string
		id: string
		x: number
		y: number
		h: number
		w: number
	}
	// [prop: string]:
}

let emitter: Emitter<EmitterEvents>
export function usePubSub() {
	if (!emitter) {
		emitter = mitt<EmitterEvents>()
	}
	return {
		/**
		 * publish a change
		 */
		emit: emitter.emit,
		/**
		 * subscribe a change
		 */
		on: emitter.on,
		/**
		 * unSubscribe a change
		 */
		off: emitter.off
	}
}
