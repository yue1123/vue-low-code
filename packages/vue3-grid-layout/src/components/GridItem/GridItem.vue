<template>
	<div ref="itemRef" class="vue-grid-item" :class="classObj" :style="style">
		<slot />
		<span v-if="resizableAndNotStatic" ref="handle" :class="resizableHandleClass" />
	</div>
</template>
<script setup lang="ts">
import {ref, inject, computed, useSlots, onBeforeUnmount, onMounted, watch, h} from 'vue'
	import '@interactjs/auto-start'
	import '@interactjs/auto-scroll'
	import '@interactjs/actions/drag'
	import '@interactjs/actions/resize'
	import '@interactjs/modifiers'
	import '@interactjs/dev-tools'
	import interact from '@interactjs/interact'

	import {
		setTopLeft,
		setTopRight,
		setTransformRtl,
		setTransform,
		getControlPosition,
		createCoreData,
		getColsFromBreakpoint,
		getDocumentDir
	} from '@utils'
	import { usePubSub } from '@hooks'
	import type { Layout, CssStyle } from '@types'
  import {anchorDark} from 'naive-ui'
  import * as buffer from 'buffer'
import type {GridLayoutProps} from '@components/GridLayout'

	export interface GridItemProps {
		isDraggable?: boolean
		isResizable?: boolean
		isBounded?: boolean
		static?: boolean
		minH?: number
		minW?: number
		maxH?: number
		maxW?: number
		x: number
		y: number
		w: number
		h: number
		i: string
		dragIgnoreFrom?: string
		dragAllowFrom?: string | null
		resizeIgnoreFrom?: string
		preserveAspectRatio?: boolean
		dragOption?: Record<string, any>
		resizeOption?: Record<string, any>
	}
	const { on, off, emit } = usePubSub()
	const props = withDefaults(defineProps<GridItemProps>(), {
		minH: 1,
		minW: 1,
		maxH: Infinity,
		maxW: Infinity,
		dragIgnoreFrom: 'a, button',
		dragAllowFrom: null,
		resizeIgnoreFrom: 'a, button',
		dragOption: () => ({}),
		resizeOption: () => ({})
	})
	// parent provide
	const layout = inject<Layout>('layout')
  const parentLayoutPropsGetter = (inject('parentLayoutPropsGetter') as () => GridLayoutProps)()

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

	// #region Refs
	const itemRef = ref()
	// #endregion

	// #region
	const cols = ref<number>(1)
	const containerWidth = ref<number>(100)
	const rowHeight = ref<number>(30)
	const margin = ref<number[]>([10, 10])
	const maxRows = ref<number>(Infinity)
	const draggable = ref<any>(null)
	const resizable = ref<any>(null)
	const transformScale = ref<number>(1)
	const useCssTransforms = ref<boolean>(true)
	const useStyleCursor = ref<boolean>(true)
	const isDragging = ref<boolean>(false)
	const dragging = ref<{ top: number; left: number } | null>({ top: 0, left: 0 })
	const isResizing = ref<boolean>(false)
	const resizing = ref<{ width: number; height: number } | null>({ width: 0, height: 0 })
	const lastX = ref<number>(NaN)
	const lastY = ref<number>(NaN)
	const lastW = ref<number>(NaN)
	const lastH = ref<number>(NaN)
	const style = ref<CssStyle>({})
	const rtl = ref<boolean>(false)
	const dragEventSet = ref<boolean>(false)
	const resizeEventSet = ref<boolean>(false)
	const previousW = ref<any>(null)
	const previousH = ref<any>(null)
	const previousX = ref<any>(null)
	const previousY = ref<any>(null)
	const innerX = ref<number>(props.x)
	const innerY = ref<number>(props.y)
	const innerW = ref<number>(props.w)
	const innerH = ref<number>(props.h)
	// #endregion

	/**
	 * computed
	 */
	const resizableAndNotStatic = computed(() => resizable.value && props.static)
	const draggableOrResizableAndNotStatic = computed(() => {
		return (draggable.value || resizable.value) && props.static
	})
	const isAndroid = computed(() => navigator.userAgent.toLowerCase().indexOf('android') !== -1)
	const renderRtl = computed(() => {
		// FIXME: what layout is?
		return false
		// return layout?.isMirrored ? !rtl.value : rtl.value
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


watch(() => props.isDraggable, (val) => {
  draggable.value = val
})
watch(() => props.static, () => {
  tryMakeDraggable()
  tryMakeResizable()
})
watch(draggable, () => {
  tryMakeDraggable()
})
watch(() => props.isResizable, val => {
  resizable.value = val
})
watch(() => props.isBounded, val => {
  bounded = val
})
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
watch(() => props.x, newVal => {
  innerX.value = newVal
  createStyle()
})
watch(() => props.y, val => {
  innerY.value = val
  createStyle()
})
watch(() => props.h, val => {
  innerH.value = val
  createStyle()
})
watch(() => props.w, val => {
  innerW.value = val
  createStyle()
})
watch(renderRtl, () => {
  tryMakeResizable()
  createStyle()
})
watch(
    [() => props.minH, () => props.maxH, () => props.minW, () => props.maxW],
    tryMakeResizable
)
watch(() => parentLayoutPropsGetter.margin, (val) => {
  if (!val || (val[0] == margin.value[0] && val[1] == margin.value[1])) return
  margin.value = val.map((m: number) => Number(m))
  createStyle()
  emitContainerResized()
})


  // created
  ;(function() {
    on('updateWidth', updateWidthHandler)
    on('compact', compactHandler)
    on('setDraggable', setDraggableHandler)
    on('setResizable', setResizableHandler)
    on('setBounded', setBoundedHandler)
    on('setTransformScale', setTransformScaleHandler)
    on('setRowHeight', setRowHeightHandler)
    on('setMaxRows', setMaxRowsHandler)
    on('directionchange', directionchangeHandler)
    on('setColNum', setColNum)

    rtl.value = getDocumentDir() === 'rtl'
  })()

onMounted(() => {
  if ((layout as any).responsive && (layout as any).lastBreakpoint) {
    cols.value = getColsFromBreakpoint((layout as any).lastBreakpoint, (layout as any).cols);
  } else {
    cols.value = (layout as any).colNum;
  }

  rowHeight.value = (layout as any).rowHeight;
  containerWidth.value = (layout as any).width !== null ? (layout as any).width : 100;
  margin.value = (layout as any).margin !== undefined ? (layout as any).margin : [10, 10];
  maxRows.value = (layout as any).maxRows;

  draggable.value = props.isDraggable ?? (layout as any).isDraggable
  resizable.value = props.isResizable ?? (layout as any).isResizable
  bounded = props.isBounded ?? (layout as any).isBounded
  transformScale.value = (layout as any).transformScale
  useCssTransforms.value = (layout as any).useCssTransforms;
  useStyleCursor.value = (layout as any).useStyleCursor;
  createStyle();
})

  onBeforeUnmount(() => {
    off('updateWidth', updateWidthHandler)
    off('compact', compactHandler)
    off('setDraggable', setDraggableHandler)
    off('setResizable', setResizableHandler)
    off('setBounded', setBoundedHandler)
    off('setTransformScale', setTransformScaleHandler)
    off('setRowHeight', setRowHeightHandler)
    off('setMaxRows', setMaxRowsHandler)
    off('directionchange', directionchangeHandler)
    off('setColNum', setColNum)

    if (interactObj) {
      interactObj.unset() // destroy interact intance
    }
  })

	// #region Methods
  function updateWidthHandler(width: number) {
    updateWidth(width)
  }
  function compactHandler() {
    compact()
  }
  function setDraggableHandler(isDraggable: boolean) {
    if (props.isDraggable === null) {
      draggable.value = isDraggable;
    }
  }
  function setResizableHandler(isResizable: boolean) {
    if (props.isResizable === null) {
      resizable.value = isResizable;
    }
  }
  function setBoundedHandler(isBounded: boolean) {
    if (props.isBounded === null) {
      bounded = isBounded;
    }
  }
  function setTransformScaleHandler(_transformScale: number) {
    transformScale.value = _transformScale
  }
  function setRowHeightHandler(_rowHeight: number) {
    rowHeight.value = _rowHeight;
  }
  function setMaxRowsHandler(_maxRows: number) {
    maxRows.value = _maxRows;
  }
  function directionchangeHandler() {
    rtl.value = getDocumentDir() === 'rtl';
    compact()
  }
  function setColNum(colNum: string | number) {
    cols.value = typeof colNum === 'string'
      ? parseInt(colNum)
      : colNum
  }

	function createStyle() {
		if (props.x + props.w > cols.value) {
			innerX.value = 0
			innerW.value = props.w > cols.value ? cols.value : props.w
		} else {
			innerX.value = props.x
			innerW.value = props.w
		}

		let pos = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value)

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
				previousW.value = innerW.value
				previousH.value = innerH.value
				pos = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value)
				newSize.width = pos.width
				newSize.height = pos.height
				resizing.value = newSize
				isResizing.value = true
				break
			}
			case 'resizemove': {
				const coreEvent = createCoreData(lastW.value, lastH.value, x, y)

				if (renderRtl.value) {
					newSize.width = resizing.value!.width - coreEvent.deltaX / transformScale.value
				} else {
					newSize.width = resizing.value!.width + coreEvent.deltaX / transformScale.value
				}

				newSize.height = resizing.value!.height + coreEvent.deltaY / transformScale.value
				resizing.value = newSize
				break
			}
			case 'resizeend': {
				pos = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value)
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
		lastW.value = x
		lastH.value = y

		if (innerW.value !== pos.w || innerH.value !== pos.h) {
			vueEmits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}
		if (
			event.type === 'resizeend' &&
			(previousW.value !== innerW.value || previousH.value !== innerH.value)
		) {
			vueEmits('resized', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}

		// emit('resizeEvent', event.type, props.i, innerX.value, innerY.value, pos.h, pos.w)
    emit('item:resizeEvent', {
      eventName: event.type,
      id: props.i,
      x: innerX.value,
      y: innerY.value,
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
        previousX.value = innerX.value
        previousY.value = innerY.value

				let parentRect = event.target?.offsetParent?.getBoundingClientRect()
				let clientRect = event.target.getBoundingClientRect()

				const cLeft = clientRect.left / transformScale.value
				const pLeft = parentRect.left / transformScale.value
				const cRight = clientRect.right / transformScale.value
				const pRight = parentRect.right / transformScale.value
				const cTop = clientRect.top / transformScale.value
				const pTop = parentRect.top / transformScale.value

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

				const cLeft = clientRect.left / transformScale.value
				const pLeft = parentRect.left / transformScale.value
				const cRight = clientRect.right / transformScale.value
				const pRight = parentRect.right / transformScale.value
				const cTop = clientRect.top / transformScale.value
				const pTop = parentRect.top / transformScale.value

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
				const coreEvent = createCoreData(lastX.value, lastY.value, x, y)
				//                        Add rtl support
				if (renderRtl.value) {
					newPosition.left = dragging.value!.left - coreEvent.deltaX / transformScale.value
				} else {
					newPosition.left = dragging.value!.left + coreEvent.deltaX / transformScale.value
				}
				newPosition.top = dragging.value!.top + coreEvent.deltaY / transformScale.value
				if (bounded) {
					const bottomBoundary =
						event.target.offsetParent.clientHeight -
						calcGridItemWHPx(props.h, rowHeight.value, margin.value[1])
					newPosition.top = clamp(newPosition.top, 0, bottomBoundary)
					const colWidth = calcColWidth()
					const rightBoundary = containerWidth.value - calcGridItemWHPx(props.w, colWidth, margin.value[0])
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

		lastX.value = x
		lastY.value = y

		if (innerX.value !== pos.x || innerY.value !== pos.y) {
			vueEmits('move', props.i, pos.x, pos.y)
		}
		if (
			event.type === 'dragend' &&
			(previousX.value !== innerX.value || previousY.value !== innerY.value)
		) {
			vueEmits('moved', props.i, pos.x, pos.y)
		}
		emit('dragEvent', {
      type: event.type,
      i: props.i,
      x: pos.x,
      y: pos.y,
      h: innerH.value,
      w: innerW.value
    })
	}
	function calcPosition(x: number, y: number, w: number, h: number) {
		const colWidth = calcColWidth()
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

		if (renderRtl.value) {
			out = {
				right: Math.round(colWidth * x + (x + 1) * margin.value[0]),
				top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
				// 0 * Infinity === NaN, which causes problems with resize constriants;
				// Fix this if it occurs.
				// Note we do it here rather than later because Math.round(Infinity) causes deopt
				width:
					w === Infinity
						? w
						: Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
				height:
					h === Infinity
						? h
						: Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin.value[1])
			}
		} else {
			out = {
				left: Math.round(colWidth * x + (x + 1) * margin.value[0]),
				top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
				// 0 * Infinity === NaN, which causes problems with resize constriants;
				// Fix this if it occurs.
				// Note we do it here rather than later because Math.round(Infinity) causes deopt
				width:
					w === Infinity
						? w
						: Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
				height:
					h === Infinity
						? h
						: Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin.value[1])
			}
		}

		return out
	}
	function calcXY(top: number, left: number) {
		const colWidth = calcColWidth()
		let x = Math.round((left - margin.value[0]) / (colWidth + margin.value[0]))
		let y = Math.round((top - margin.value[1]) / (rowHeight.value + margin.value[1]))

		x = Math.max(Math.min(x, cols.value - innerW.value), 0)
		y = Math.max(Math.min(y, maxRows.value - innerH.value), 0)

		return {
			x,
			y
		}
	}
	function calcColWidth() {
		return (containerWidth.value - margin.value[0] * (cols.value + 1)) / cols.value
	}
	function calcGridItemWHPx(gridUnits: number, colOrRowSize: number, marginPx: number) {
		if (!Number.isFinite(gridUnits)) return gridUnits
		return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx)
	}
	function clamp(num: number, lowerBound: number, upperBound: number) {
		return Math.max(Math.min(num, upperBound), lowerBound)
	}
	function calcWH(height: number, width: number, autoSizeFlag = false) {
		const colWidth = calcColWidth()
		let w = Math.round((width + margin.value[0]) / (colWidth + margin.value[0]))
		let h = 0

		if (!autoSizeFlag) {
			h = Math.round((height + margin.value[1]) / (rowHeight.value + margin.value[1]))
		} else {
			h = Math.ceil((height + margin.value[1]) / (rowHeight.value + margin.value[1]))
		}

		w = Math.max(Math.min(w, cols.value - innerX.value), 0)
		h = Math.max(Math.min(h, maxRows.value - innerY.value), 0)

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

			if (!useStyleCursor.value) {
				interactObj.styleCursor(false)
			}
		}

		if (draggable.value && props.static) {
			const opts = {
				ignoreFrom: props.dragIgnoreFrom,
				allowFrom: props.dragAllowFrom,
				...props.dragOption
			}

			interactObj.draggable(opts)

			if (!dragEventSet.value) {
				dragEventSet.value = true
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

			if (!useStyleCursor.value) {
				interactObj.styleCursor(false)
			}
		}

		if (resizable.value && props.static) {
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
						height: minimum.height * transformScale.value,
						width: minimum.width * transformScale.value
					},
					max: {
						height: maximum.height * transformScale.value,
						width: maximum.width * transformScale.value
					}
				},
				...props.resizeOption
			}

			if (props.preserveAspectRatio) {
				opts.modifiers = [(interact as any).modifiers.aspectRatio({ ratio: 'preserve' })]
			}

			interactObj.resizable(opts)

			if (!resizeEventSet.value) {
				resizeEventSet.value = true
				interactObj.on('resizestart resizemove resizeend', (event: MouseEvent) => {
					handleResize(event)
				})
			}
		} else {
			interactObj.resizable({ enabled: false })
		}
	}
	function autoSize() {
		previousW.value = innerW.value
		previousH.value = innerH.value

    // @ts-ignore
		let newSize = slots.defaults[0].elm.getBoundingClientRect()
		let pos = calcWH(newSize.height, newSize.width, true)

		if (pos.w < props.minW) pos.w = props.minW
		if (pos.w > props.maxW) pos.w = props.maxW
		if (pos.h < props.minH) pos.h = props.minH
		if (pos.h > props.maxH) pos.h = props.maxH
		if (pos.h < 1) pos.h = 1
		if (pos.w < 1) pos.w = 1

		if (innerW.value !== pos.w || innerH.value !== pos.h) {
			vueEmits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
		}

		if (previousW.value !== pos.w || previousH.value !== pos.h) {
			vueEmits('resized', props.i, pos.h, pos.w, newSize.height, newSize.width)
			emit('item:resizeEvent', {
        eventName: 'resizeend',
        id: props.i,
        x: innerX.value,
        y: innerY.value,
        h: pos.h,
        w: pos.w
      })
		}
	}
	// #endregion
</script>