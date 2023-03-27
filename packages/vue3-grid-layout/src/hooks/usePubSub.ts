import mitt from 'mitt'
import type { Emitter } from 'mitt'
import type { Layout, ItemDragEvent, ItemResizeEvent } from '../types'

export type EmitterEvents = {
	compact: void
	setColNum: number
	setRowHeight: number
	setDraggable: boolean
	setResizable: boolean
	setBounded: boolean
	setTransformScale: number
	setMaxRows: number
	'layout:updateWidth': number
	'item:dragEvent': ItemDragEvent
	'item:resizeEvent'?: ItemResizeEvent
	updateWidth: number
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
