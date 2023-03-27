<template>
	<div ref="itemRef" class="vue-grid-item" :class="classObj" :style="style">
		<slot />
		{{ resizableAndNotStatic }}
		<span v-if="resizableAndNotStatic" ref="handle" :class="resizableHandleClass" />
	</div>
</template>
<script setup lang="ts">
	import { ref, inject, computed, useSlots, onBeforeUnmount, onMounted, watch } from 'vue'
	import interact from 'interactjs'

	import {
		setTopLeft,
		setTopRight,
		setTransformRtl,
		setTransform,
		getControlPosition,
		createCoreData,
		getColsFromBreakpoint,
		getDocumentDir
	} from '../../utils'
	import { usePubSub } from '../../hooks'
	import type { Layout, CssStyle } from '../../types'
	// import type {GridLayoutProps} from '@components/GridLayout'

	export interface GridItemProps {
		/**
		 * 标识栅格元素位于第几列，需为自然数。
		 */
		x: number
		/**
		 * 标识栅格元素位于第几行，需为自然数
		 */
		y: number
		/**
		 * 标识栅格元素的初始宽度，值为 colWidth 的倍数。
		 */
		w: number
		/**
		 * 标识栅格元素的初始高度，值为 rowHeight 的倍数
		 */
		h: number
		/**
		 * 栅格中元素的ID
		 */
		i: string
		/**
		 * 栅格元素的最小宽度，值为colWidth的倍数。
		 * 如果w小于minW，则minW的值会被w覆盖。
		 */
		minW?: number
		/**
		 * 栅格元素的最小高度，值为 rowHeight 的倍数。如果 h 小于 minH，则 minH 的值会被 h 覆盖。
		 */
		minH?: number
		/**
		 * 栅格元素的最大宽度，值为 colWidth的 倍数。如果 w 大于 maxW，则 maxW 的值会被 w 覆盖
		 */
		maxW?: number
		/**
		 * 栅格元素的最大高度，值为 rowHeight 的倍数。如果 h 大于 maxH，则 maxH 的值会被 h 覆盖
		 */
		maxH?: number
		/**
		 * 标识栅格元素是否可拖拽。如果值为 null 则取决于父容器
		 */
		isDraggable?: boolean
		/**
		 * 标识栅格元素是否可调整大小。如果值为 null 则取决于父容器
		 */
		isResizable?: boolean
		/**
		 * 标识栅格元素是否为静态的（无法拖拽、调整大小或被其他元素移动）
		 */
		static?: boolean
		/**
		 * 标识栅格元素中哪些子元素无法触发拖拽事件，值为 css-like 选择器
		 */
		dragIgnoreFrom?: string
		/**
		 * 标识栅格元素中哪些子元素可以触发拖拽事件，值为 css-like 选择器。如果值为 null 则表示所有子元素（dragIgnoreFrom 的除外）。
		 */
		dragAllowFrom?: string
		/**
		 * 标识栅格元素中哪些子元素无法触发调整大小的事件，值为 css-like 选择器。
		 */
		resizeIgnoreFrom?: string
		/**
		 * Says if the item is bounded to the container when dragging. If default value is null then it's inherited from parent.
		 */
		isBounded?: boolean
		/**
		 * If 'true', forces the GridItem to preserve its aspect ratio when resizing.
		 */
		preserveAspectRatio?: boolean
		/**
		 * Passthrough object for the grid item interact.js draggable configuration
		 */
		dragOption?: Record<string, any>
		/**
		 * Passthrough object for the grid item interact.js resizable configuration
		 */
		resizeOption?: Record<string, any>
	}
	const { on, off, emit } = usePubSub()
	const props = withDefaults(defineProps<GridItemProps>(), {
		minH: 1,
		minW: 1,
		maxH: Infinity,
		maxW: Infinity,
		isDraggable: undefined,
		isResizable: undefined,
		static: false,
		dragIgnoreFrom: 'a, button',
		dragAllowFrom: undefined,
		resizeIgnoreFrom: 'a, button',
		isBounded: undefined,
		preserveAspectRatio: false,
		dragOption: () => ({}),
		resizeOption: () => ({})
	})

	// parent provide
	const layout = inject('parentLayoutInstance') as any
	const parentLayoutProps = inject('parentLayoutProps') as any

	const slots = useSlots()

	const vueEmits = defineEmits<{
		(e: 'containerResized', i: string, h: number, w: number, h2: number, w2: number): void
		(e: 'resize', i: string, h: number, w: number, h2: number, w2: number): void
		(e: 'resized', i: string, h: number, w: number, h2: number, w2: number): void
		(e: 'move', i: string, x: number, y: number): void
		(e: 'moved', i: string, x: number, y: number): void
	}>()

	let interactObj: any
	let bounded: boolean = false
	let margin: number[] = [10, 10]
	let maxRows: number = Infinity
	let transformScale: number = 1
	let useStyleCursor: boolean = true
	let lastX: number = NaN
	let lastY: number = NaN
	let lastW: number = NaN
	let lastH: number = NaN
	let rtl: boolean = false
	let dragEventSet: boolean = false
	let resizeEventSet: boolean = false
	let previousW: number | null = null
	let previousH: number | null = null
	let previousX: number | null = null
	let previousY: number | null = null
	let innerX: number = props.x
	let innerY: number = props.y
	let innerW: number = props.w
	let innerH: number = props.h

	// #region Refs
	const itemRef = ref()
	// #endregion

	// #region
	const cols = ref<number>(1)
	const containerWidth = ref<number>(100)
	const rowHeight = ref<number>(30)
	const draggable = ref<any>(null)
	const resizable = ref<any>(null)
	const useCssTransforms = ref<boolean>(true)
	const isDragging = ref<boolean>(false)
	const dragging = ref<{ top: number; left: number } | null>({ top: 0, left: 0 })
	const isResizing = ref<boolean>(false)
	const resizing = ref<{ width: number; height: number } | null>({ width: 0, height: 0 })
	const style = ref<CssStyle>({})
	// #endregion

	/**
	 * computed
	 */
	const resizableAndNotStatic = computed(() => resizable.value && !props.static)
	const draggableOrResizableAndNotStatic = computed(() => {
		return (draggable.value || resizable.value) && props.static
	})
	const isAndroid = computed(() => navigator.userAgent.toLowerCase().indexOf('android') !== -1)
	const renderRtl = computed(() => {
		// FIXME: what layout is?
		return false
		// return layout?.isMirrored ? !rtl : rtl
	})
	const resizableHandleClass = computed(() => {
		let baseClassName = 'vue-resizable-handle'

		if (renderRtl.value) {
			baseClassName += ' vue-rtl-resizable-handle'
		}

		return baseClassName
	})
	const classObj = computed(() => ({
		'vue-resizable': resizableAndNotStatic.value,
		static: props.static,
		resizing: isResizing.value,
		'vue-draggable-dragging': isDragging.value,
		cssTransforms: useCssTransforms.value,
		'render-rtl': renderRtl.value,
		'disable-userselect': isDragging.value,
		'no-touch': isAndroid.value && draggableOrResizableAndNotStatic.value
	}))

	watch(
		() => props.isDraggable,
		(val) => {
			draggable.value = val
		}
	)
	watch(
		() => props.static,
		() => {
			tryMakeDraggable()
			tryMakeResizable()
		}
	)
	watch(draggable, () => {
		tryMakeDraggable()
	})
	watch(
		() => props.isResizable,
		(val) => {
			resizable.value = val
		}
	)
	watch(
		() => props.isBounded,
		(val) => {
			bounded = !!val
		}
	)
	watch(resizable, tryMakeResizable)
	watch(rowHeight, () => {
		createStyle()
		emitContainerResized()
	})
	watch(cols, () => {
		tryMakeResizable()
		createStyle()
		emitContainerResized()
	})
	watch(containerWidth, () => {
		tryMakeResizable()
		createStyle()
		emitContainerResized()
	})
	watch(
		() => props.x,
		(newVal) => {
			innerX = newVal
			createStyle()
		}
	)
	watch(
		() => props.y,
		(val) => {
			innerY = val
			createStyle()
		}
	)
	watch(
		() => props.h,
		(val) => {
			innerH = val
			createStyle()
		}
	)
	watch(
		() => props.w,
		(val) => {
			innerW = val
			createStyle()
		}
	)
	watch(renderRtl, () => {
		tryMakeResizable()
		createStyle()
	})
	watch(
		[() => props.minH, () => props.maxH, () => props.minW, () => props.maxW],
		tryMakeResizable
	)
	watch(
		() => parentLayoutProps.margin,
		(val) => {
			if (!val || (val[0] == margin[0] && val[1] == margin[1])) return
			margin = val.map((m: number) => Number(m))
			createStyle()
			emitContainerResized()
		}
	)

	// created
	;(function () {
		on('compact', compactHandler)
		on('layout:updateWidth', updateWidthHandler)
		// on('setDraggable', setDraggableHandler)
		// on('setResizable', setResizableHandler)
		// on('setBounded', setBoundedHandler)
		// on('setTransformScale', setTransformScaleHandler)
		// on('setRowHeight', setRowHeightHandler)
		// on('setMaxRows', setMaxRowsHandler)
		// on('directionchange', directionchangeHandler)
		on('setColNum', setColNum)

		rtl = getDocumentDir() === 'rtl'
	})()

	onMounted(() => {
		const parentLayoutWidth = (inject('parentLayoutContainerWidthGetter') as () => number)()
		if (parentLayoutProps.responsive && parentLayoutProps.lastBreakpoint) {
			cols.value = getColsFromBreakpoint(
				parentLayoutProps.lastBreakpoint,
				parentLayoutProps.cols
			)
		} else {
			cols.value = parentLayoutProps.colNum
		}

		rowHeight.value = parentLayoutProps.rowHeight
		containerWidth.value = parentLayoutWidth !== null ? parentLayoutWidth : 100
		margin = parentLayoutProps.margin !== undefined ? parentLayoutProps.margin : [10, 10]
		maxRows = parentLayoutProps.maxRows
		draggable.value = props.isDraggable ?? parentLayoutProps.isDraggable
		resizable.value = props.isResizable ?? parentLayoutProps.isResizable
		bounded = props.isBounded ?? parentLayoutProps.isBounded
		transformScale = parentLayoutProps.transformScale
		useCssTransforms.value = parentLayoutProps.useCssTransforms
		useStyleCursor = parentLayoutProps.useStyleCursor
		createStyle()
	})

	onBeforeUnmount(() => {
		off('compact', compactHandler)
		off('layout:updateWidth', updateWidthHandler)
		// off('setDraggable', setDraggableHandler)
		// off('setResizable', setResizableHandler)
		// off('setBounded', setBoundedHandler)
		// off('setTransformScale', setTransformScaleHandler)
		// off('setRowHeight', setRowHeightHandler)
		// off('setMaxRows', setMaxRowsHandler)
		// off('directionchange', directionchangeHandler)
		off('setColNum', setColNum)

		if (interactObj) {
			interactObj.unset() // destroy interact intance
		}
	})

	// #region Methods
	function updateWidthHandler(width: number) {
		console.info('layout:updateWidth', width)
		updateWidth(width)
	}
	function compactHandler() {
		compact()
	}
	function setDraggableHandler(isDraggable: boolean) {
		if (props.isDraggable === undefined) {
			draggable.value = isDraggable
		}
	}
	function setResizableHandler(isResizable: boolean) {
		if (props.isResizable === undefined) {
			resizable.value = isResizable
		}
	}
	function setBoundedHandler(isBounded: boolean) {
		if (props.isBounded === undefined) {
			bounded = isBounded
		}
	}
	function setTransformScaleHandler(_transformScale: number) {
		transformScale = _transformScale
	}
	function setRowHeightHandler(_rowHeight: number) {
		rowHeight.value = _rowHeight
	}
	function setMaxRowsHandler(_maxRows: number) {
		maxRows = _maxRows
	}
	function directionchangeHandler() {
		rtl = getDocumentDir() === 'rtl'
		compact()
	}
	function setColNum(colNum: string | number) {
		cols.value = typeof colNum === 'string' ? parseInt(colNum) : colNum
	}

	function createStyle() {
		if (props.x + props.w > cols.value) {
			innerX = 0
			innerW = props.w > cols.value ? cols.value : props.w
		} else {
			innerX = props.x
			innerW = props.w
		}

		let pos = calcPosition(innerX, innerY, innerW, innerH)

		if (isDragging.value) {
			pos.top = dragging.value!.top

			if (renderRtl.value) {
				pos.right = dragging.value!.left
			} else {
				pos.left = dragging.value!.left
			}
		}

		if (isResizing.value && resizing.value) {
			pos.width = resizing.value.width
			pos.height = resizing.value.height
		}

		let _style

		if (useCssTransforms.value) {
			console.log('--------------')
			if (renderRtl.value) {
				_style = setTransformRtl(pos.top, pos.right!, pos.width, pos.height)
			} else {
				_style = setTransform(pos.top, pos.left!, pos.width, pos.height)
			}
		} else {
			if (renderRtl.value) {
				_style = setTopRight(pos.top, pos.right!, pos.width, pos.height)
			} else {
				_style = setTopLeft(pos.top, pos.left!, pos.width, pos.height)
			}
		}

		style.value = _style
		console.log(style, 'style')
	}
	function emitContainerResized() {
		let styleProps: {
			width: number
			height: number
			[props: string]: any
		} = {
			width: 0,
			height: 0
		}

		for (let prop of ['width', 'height']) {
			let val: string = style.value[prop as any]
			let matches = val.match(/^(\d+)px$/)

			if (!matches) return
			styleProps[prop] = matches[1]
		}

		vueEmits('containerResized', props.i, props.h, props.w, styleProps.height, styleProps.width)
	}
	function handleResize(event: MouseEvent) {
		if (props.static) return

		const position = getControlPosition(event)

		if (position == null) return

		const { x, y } = position
		const newSize = {
			width: 0,
			height: 0
		}
		let pos

		switch (event.type) {
			case 'resizestart': {
				tryMakeResizable()
				previousW = innerW
				previousH = innerH
				pos = calcPosition(innerX, innerY, innerW, innerH)
				newSize.width = pos.width
				newSize.height = pos.height
				resizing.value = newSize
				isResizing.value = true
				break
			}
			case 'resizemove': {
				const coreEvent = createCoreData(lastW, lastH, x, y)

				if (renderRtl.value) {
					newSize.width = resizing.value!.width - coreEvent.deltaX / transformScale
				} else {
					newSize.width = resizing.value!.width + coreEvent.deltaX / transformScale
				}

				newSize.height = resizing.value!.height + coreEvent.deltaY / transformScale
				resizing.value = newSize
				break
			}
			case 'resizeend': {
				pos = calcPosition(innerX, innerY, innerW, innerH)
				newSize.width = pos.width
				newSize.height = pos.height
				resizing.value = null
				isResizing.value = false
				break
			}
		}

		pos = calcWH(newSize.height, newSize.width)
		if (pos.w < props.minW) pos.w = props.minW
		if (pos.w > props.maxW) pos.w = props.maxW
		if (pos.h < props.minH) pos.h = props.minH
		if (pos.h > props.maxH) pos.h = props.maxH
		if (pos.h < 1) pos.h = 1
		if (pos.w < 1) pos.w = 1
		lastW = x
		lastH = y

		if (innerW !== pos.w || innerH !== pos.h) {
			vueEmits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}
		if (event.type === 'resizeend' && (previousW !== innerW || previousH !== innerH)) {
			vueEmits('resized', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}

		// emit('resizeEvent', event.type, props.i, innerX, innerY, pos.h, pos.w)
		emit('item:resizeEvent', {
			eventName: event.type,
			i: props.i,
			x: innerX,
			y: innerY,
			w: pos.w,
			h: pos.h
		})
	}
	function handleDrag(event: any) {
		if (props.static || isResizing.value) return

		const position = getControlPosition(event)

		if (position === null) return
		const { x, y } = position
		let newPosition = { top: 0, left: 0 }

		switch (event.type) {
			case 'dragstart': {
				previousX = innerX
				previousY = innerY

				let parentRect = event.target?.offsetParent?.getBoundingClientRect()
				let clientRect = event.target.getBoundingClientRect()

				const cLeft = clientRect.left / transformScale
				const pLeft = parentRect.left / transformScale
				const cRight = clientRect.right / transformScale
				const pRight = parentRect.right / transformScale
				const cTop = clientRect.top / transformScale
				const pTop = parentRect.top / transformScale

				if (renderRtl.value) {
					newPosition.left = (cRight - pRight) * -1
				} else {
					newPosition.left = cLeft - pLeft
				}
				newPosition.top = cTop - pTop
				dragging.value = newPosition
				isDragging.value = true
				break
			}
			case 'dragend': {
				if (!isDragging.value) return
				let parentRect = event.target.offsetParent.getBoundingClientRect()
				let clientRect = event.target.getBoundingClientRect()

				const cLeft = clientRect.left / transformScale
				const pLeft = parentRect.left / transformScale
				const cRight = clientRect.right / transformScale
				const pRight = parentRect.right / transformScale
				const cTop = clientRect.top / transformScale
				const pTop = parentRect.top / transformScale

				//                        Add rtl support
				if (renderRtl.value) {
					newPosition.left = (cRight - pRight) * -1
				} else {
					newPosition.left = cLeft - pLeft
				}
				newPosition.top = cTop - pTop
				//                        console.log("### drag end => " + JSON.stringify(newPosition));
				//                        console.log("### DROP: " + JSON.stringify(newPosition));
				dragging.value = null
				isDragging.value = false
				// shouldUpdate = true;
				break
			}
			case 'dragmove': {
				const coreEvent = createCoreData(lastX, lastY, x, y)
				//                        Add rtl support
				if (renderRtl.value) {
					newPosition.left = dragging.value!.left - coreEvent.deltaX / transformScale
				} else {
					newPosition.left = dragging.value!.left + coreEvent.deltaX / transformScale
				}
				newPosition.top = dragging.value!.top + coreEvent.deltaY / transformScale
				if (bounded) {
					const bottomBoundary =
						event.target.offsetParent.clientHeight -
						calcGridItemWHPx(props.h, rowHeight.value, margin[1])
					newPosition.top = clamp(newPosition.top, 0, bottomBoundary)
					const colWidth = calcColWidth()
					const rightBoundary =
						containerWidth.value - calcGridItemWHPx(props.w, colWidth, margin[0])
					newPosition.left = clamp(newPosition.left, 0, rightBoundary)
				}
				dragging.value = newPosition
				break
			}
		}

		// Get new XY
		let pos
		if (renderRtl.value) {
			pos = calcXY(newPosition.top, newPosition.left)
		} else {
			pos = calcXY(newPosition.top, newPosition.left)
		}

		lastX = x
		lastY = y

		if (innerX !== pos.x || innerY !== pos.y) {
			vueEmits('move', props.i, pos.x, pos.y)
		}
		if (event.type === 'dragend' && (previousX !== innerX || previousY !== innerY)) {
			vueEmits('moved', props.i, pos.x, pos.y)
		}
		emit('item:dragEvent', {
			eventName: event.type,
			i: props.i,
			x: pos.x,
			y: pos.y,
			h: innerH,
			w: innerW
		})
	}
	function calcPosition(x: number, y: number, w: number, h: number) {
		const colWidth = calcColWidth()
		console.log('====', colWidth, x, y, w, h)
		let out: {
			top: number
			right?: number
			left?: number
			width: number
			height: number
		} = {
			top: 0,
			width: 0,
			height: 0
		}
		const { margin } = parentLayoutProps
		console.log(renderRtl.value)
		if (renderRtl.value) {
			out = {
				right: Math.round(colWidth * x + (x + 1) * margin[0]),
				top: Math.round(rowHeight.value * y + (y + 1) * margin[1]),
				// 0 * Infinity === NaN, which causes problems with resize constriants;
				// Fix this if it occurs.
				// Note we do it here rather than later because Math.round(Infinity) causes deopt
				width:
					w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
				height:
					h === Infinity
						? h
						: Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin[1])
			}
		} else {
			out = {
				left: Math.round(colWidth * x + (x + 1) * margin[0]),
				top: Math.round(rowHeight.value * y + (y + 1) * margin[1]),
				// 0 * Infinity === NaN, which causes problems with resize constriants;
				// Fix this if it occurs.
				// Note we do it here rather than later because Math.round(Infinity) causes deopt
				width:
					w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
				height:
					h === Infinity
						? h
						: Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin[1])
			}
		}
		console.log(out, 'out')
		return out
	}
	function calcXY(top: number, left: number) {
		const colWidth = calcColWidth()
		let x = Math.round((left - margin[0]) / (colWidth + margin[0]))
		let y = Math.round((top - margin[1]) / (rowHeight.value + margin[1]))

		x = Math.max(Math.min(x, cols.value - innerW), 0)
		y = Math.max(Math.min(y, maxRows - innerH), 0)

		return {
			x,
			y
		}
	}
	function calcColWidth() {
		const { margin } = parentLayoutProps
		console.log(containerWidth.value, 'containerWidth.value')
		return (containerWidth.value - margin[0] * (cols.value + 1)) / cols.value
	}
	function calcGridItemWHPx(gridUnits: number, colOrRowSize: number, marginPx: number) {
		if (!Number.isFinite(gridUnits)) return gridUnits
		return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx)
	}
	function clamp(num: number, lowerBound: number, upperBound: number) {
		return Math.max(Math.min(num, upperBound), lowerBound)
	}
	function calcWH(height: number, width: number, autoSizeFlag = false) {
		const { margin } = parentLayoutProps
		const colWidth = calcColWidth()
		let w = Math.round((width + margin[0]) / (colWidth + margin[0]))
		let h = 0

		if (!autoSizeFlag) {
			h = Math.round((height + margin[1]) / (rowHeight.value + margin[1]))
		} else {
			h = Math.ceil((height + margin[1]) / (rowHeight.value + margin[1]))
		}

		w = Math.max(Math.min(w, cols.value - innerX), 0)
		h = Math.max(Math.min(h, maxRows - innerY), 0)

		return {
			w,
			h
		}
	}
	function updateWidth(width: number, colNum?: number) {
		containerWidth.value = width
		if (colNum !== undefined && colNum !== null) {
			cols.value = colNum
		}
	}
	function compact() {
		createStyle()
	}
	function tryMakeDraggable() {
		if (interactObj === null || interactObj === undefined) {
			interactObj = interact(itemRef.value)

			if (!useStyleCursor) {
				interactObj.styleCursor(false)
			}
		}

		console.log(
			'%cGridItem.vue:690%cdraggable',
			'background:#03186d; color: #fff;padding:2px 4px;border-radius:2px 0 0 2px',
			'background: #496cf6; color: #fff;padding:2px 4px;border-radius:0 2px 2px 0',
			draggable.value
		)
		// debugger
		console.log(draggable.value, !props.static, 'draggable.value && !props.static')
		if (draggable.value && !props.static) {
			const opts = {
				ignoreFrom: props.dragIgnoreFrom,
				allowFrom: props.dragAllowFrom,
				...props.dragOption
			}
			console.log('object', opts, '============fasdfasdffasdfasfd发的发=')
			interactObj.draggable(opts)

			if (!dragEventSet) {
				dragEventSet = true
				interactObj.on('dragstart dragmove dragend', (event: MouseEvent) => {
					handleDrag(event)
				})
			}
		} else {
			interactObj.draggable({ enabled: false })
		}
	}
	function tryMakeResizable() {
		if (interactObj === null || interactObj === undefined) {
			interactObj = interact(itemRef.value)
			console.log('============  tryMakeResizable  ============')
			console.log(interactObj)

			if (!useStyleCursor) {
				interactObj.styleCursor(false)
			}
		}
		console.log(
			resizable.value && !props.static,
			'resizable.value && !props.staticasd=============='
		)
		if (resizable.value && !props.static) {
			let maximum = calcPosition(0, 0, props.maxW, props.maxH)
			let minimum = calcPosition(0, 0, props.minW, props.minH)
			const opts: Record<string, any> = {
				edges: {
					left: false,
					right: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
					bottom: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
					top: false
				},
				ignoreFrom: props.resizeIgnoreFrom,
				restrictSize: {
					min: {
						height: minimum.height * transformScale,
						width: minimum.width * transformScale
					},
					max: {
						height: maximum.height * transformScale,
						width: maximum.width * transformScale
					}
				},
				...props.resizeOption
			}

			if (props.preserveAspectRatio) {
				opts.modifiers = [(interact as any).modifiers.aspectRatio({ ratio: 'preserve' })]
			}
			console.log('interactObj.resizable(opts)7777777777777777777777777777777', opts)
			interactObj.resizable(opts)

			if (!resizeEventSet) {
				resizeEventSet = true
				interactObj.on('resizestart resizemove resizeend', (event: MouseEvent) => {
					handleResize(event)
				})
			}
		} else {
			interactObj.resizable({ enabled: false })
		}
	}
	function autoSize() {
		previousW = innerW
		previousH = innerH

		// @ts-ignore
		let newSize = slots.defaults[0].elm.getBoundingClientRect()
		let pos = calcWH(newSize.height, newSize.width, true)

		if (pos.w < props.minW) pos.w = props.minW
		if (pos.w > props.maxW) pos.w = props.maxW
		if (pos.h < props.minH) pos.h = props.minH
		if (pos.h > props.maxH) pos.h = props.maxH
		if (pos.h < 1) pos.h = 1
		if (pos.w < 1) pos.w = 1

		if (innerW !== pos.w || innerH !== pos.h) {
			vueEmits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}

		if (previousW !== pos.w || previousH !== pos.h) {
			vueEmits('resized', props.i, pos.h, pos.w, newSize.height, newSize.width)
			emit('item:resizeEvent', {
				eventName: 'resizeend',
				i: props.i,
				x: innerX,
				y: innerY,
				h: pos.h,
				w: pos.w
			})
		}
	}
	// #endregion
</script>
