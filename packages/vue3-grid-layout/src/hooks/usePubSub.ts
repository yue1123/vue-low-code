import mitt from 'mitt'
import type { Emitter } from 'mitt'
import type { Layout, ItemDragEvent, ItemResizeEvent } from '@types'

export type EmitterEvents = {
  compact: void
	setColNum: number
	'layout:updateWidth': number
	'item:dragEvent': ItemDragEvent
	'item:resizeEvent': ItemResizeEvent
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
