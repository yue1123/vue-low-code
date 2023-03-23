import mitt from 'mitt'
import type { Emitter } from 'mitt'
import type { Layout, ItemDragEvent } from '@types'

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
