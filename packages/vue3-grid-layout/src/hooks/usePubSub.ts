import mitt from 'mitt'
import type { Emitter } from 'mitt'

type ItemDragEvent = {
	eventName: string
	id: string
	x: number
	y: number
	h: number
	w: number
}

export type EmitterEvents = {
	// initd: BMapGL.Map
	// unload: any
	'item:dragEvent': ItemDragEvent
	updateWidth: number
	compact: void

	setColNum: number

	'item:resizeEvent': ItemDragEvent
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
