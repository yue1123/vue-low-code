<template>
	{{ mergedStyle }}
	<div v-bind="$attrs" ref="layoutGridContainerRef" class="vue_grid-layout" :style="mergedStyle">
		<slot></slot>
		<template v-if="isDragging && placeholder">
			<GridItem
				class="vue_grid-placeholder"
				role="placeholder"
				:x="placeholder.x"
				:y="placeholder.y"
				:w="placeholder.w"
				:h="placeholder.h"
				:i="placeholder.i"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
	import {
		shallowRef,
		onBeforeMount,
		onBeforeUnmount,
		onMounted,
		nextTick,
		defineEmits,
		provide,
		getCurrentInstance,
		ref,
		watch
	} from 'vue'
	import elementResizeDetector from 'element-resize-detector'
	// import _debug from 'debug'
	import {
		bottom,
		compact,
		getBreakpointFromWidth,
		getColsFromBreakpoint,
		cloneLayout,
		findOrGenerateResponsiveLayout,
		getLayoutItem,
		getAllCollisions,
		moveElement,
		validateLayout
	} from '../../utils'
	import { usePubSub, useEventListener } from '../../hooks'
	import type {
		Layout,
		BreakPoints,
		Col,
		Placeholder,
		CssStyle,
		LayoutItem,
		BreakPointsType,
		ItemDragEvent,
		ItemResizeEvent
	} from '../../types'
	import GridItem from '../GridItem'
	import { diffTwoLayout } from './utils'
	export interface GridLayoutProps {
		/**
		 * 自动尺寸
		 * @default true
		 */
		autoResize?: boolean
		/**
		 * 列数
		 * @default 12
		 */
		colNum?: number
		/**
		 * 行高
		 * @default 150
		 */
		rowHeight?: number
		/**
		 * 最大行数
		 * @default Infinity
		 */
		maxRows?: number
		/**
		 * 子项目之间的边距
		 * @default [10, 10]
		 */
		margin?:
			| [/* top and bottom */ number, /* left and right */ number]
			| [/* top */ number, /* right */ number, /* bottom */ number, /* left */ number]
		/**
		 * 子项目是否可拖动
		 * @default true
		 */
		isDraggable?: boolean
		/**
		 * 子项目是否可改变大小
		 * @default true
		 */
		isResizable?: boolean
		/**
		 * 是否镜像
		 * @default false
		 */
		isMirrored?: boolean
		/**
		 * 是否有边界
		 * @default false
		 */
		isBounded?: boolean
		/**
		 * 使用css transform
		 * @default true
		 */
		useCssTransforms?: boolean
		/**
		 * 垂直压缩空间
		 * @default true
		 */
		verticalCompact?: boolean
		// FIXME: unknown props
		restoreOnDrag?: boolean
		/**
		 * 布局配置
		 * @required
		 */
		layout: Layout
		/**
		 * 是否可自适应布局
		 * @default false
		 */
		responsive: boolean
		/**
		 * 可自适应布局
		 * @default {}
		 */
		responsiveLayouts?: Record<string, any>
		/**
		 * 缩放大小
		 * @default 1
		 */
		transformScale?: number
		/**
		 * 设备大小断点
		 * @default { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
		 */
		breakpoints?: BreakPoints
		/**
		 * 列数断点
		 * @default { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
		 */
		cols?: Col
		/**
		 * 防止碰撞 for child use
		 * @default false
		 */
		preventCollision?: boolean
		/**
		 * 使用样式光标, for child use
		 * @default true
		 */
		useStyleCursor?: boolean
	}
	const props = withDefaults(defineProps<GridLayoutProps>(), {
		autoResize: true,
		colNum: 12,
		rowHeight: 150,
		maxRows: Infinity,
		margin: () => [10, 10],
		isDraggable: true,
		isResizable: true,
		isMirrored: false,
		isBounded: false,
		useCssTransforms: true,
		verticalCompact: true,
		restoreOnDrag: false,
		responsive: false,
		responsiveLayouts: () => ({}),
		transformScale: 1,
		breakpoints: () => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }),
		cols: () => ({ lg: 30, md: 10, sm: 6, xs: 4, xxs: 2 }),
		preventCollision: false,
		useStyleCursor: true
	})

	// debug
	// const debug = _debug('vue-grid-layout:layout')
	const debug = console.log

	// resize listen
	let elementResizeDetectorInstance: any = null
	// layout container ref
	const layoutGridContainerRef = ref<HTMLDivElement>()
	// pub sub center
	const { off, on, emit } = usePubSub()
	const vueEmits = defineEmits<{
		(event: 'layout-updated', layout: Layout): any
		(event: 'layout-before-mount', layout: Layout): any
		(event: 'layout-mounted', layout: Layout): any
		(event: 'layout-created', layout: Layout): any
		(event: 'breakpoint-changed', newBreakPoint: BreakPointsType, layout: Layout): any
		(event: 'update:layout', layout: Layout): any
		(event: 'layout-ready', layout: Layout): any
	}>()
	// 是否正在拖动中
	const isDragging = ref<boolean>(false)
	// 预判拖动元素位置
	const placeholder = ref<Placeholder>()
	// style
	let mergedStyle = shallowRef<CssStyle>({})
	// last layout length
	let lastLayoutLength: number = 0
	// breakpoints
	let lastBreakpoint: BreakPointsType | null = null // store last active breakpoint
	let originalLayout = ref<Layout | null>(null)
	// window width
	let width = ref<number|null>(null)
	// responsive layouts
	// FIXME: rename
	let layouts: any = null
	let positionsBeforeDrag: Record<string, LayoutItem> | undefined = undefined
	// elementResizeDetector
	// window resize event handler
	// function resizeEventHandler() {}
	// sub item drag event handler
	// function dragEventHandler() {}
	onBeforeMount(() => {
		vueEmits('layout-before-mount', props.layout)
	})
	onMounted(() => {
		useEventListener(self, 'resize', handleWindowResize)
		vueEmits('layout-mounted', props.layout)

		// init
		nextTick(function () {
			// FIXME: ???
			// validateLayout(props.layout)

			originalLayout.value = props.layout
			nextTick(function () {
				initResponsiveFeatures()

				handleWindowResize()

				width.value = layoutGridContainerRef.value!.offsetWidth
				emit('layout:updateWidth', width.value)

				compact(props.layout, props.verticalCompact)

				vueEmits('layout-updated', props.layout)

				updateHeight()
				nextTick(function () {
					elementResizeDetectorInstance = elementResizeDetector({
						strategy: 'scroll', //<- For ultra performance.
						// See https://github.com/wnr/element-resize-detector/issues/110 about callOnAdd.
						callOnAdd: false
					})
					elementResizeDetectorInstance.listenTo(
						layoutGridContainerRef.value,
						function () {
							handleWindowResize()
						}
					)
				})
			})
		})
	})
	onBeforeUnmount(() => {
		off('item:resizeEvent', handleDragEvent)
		off('item:dragEvent', handleDragEvent)
		if (elementResizeDetectorInstance) {
			elementResizeDetectorInstance.uninstall(layoutGridContainerRef.value)
		}
	})

	// watch

  watch(width, (newVal, oldVal) => {
    nextTick(() => {
      emit('updateWidth', newVal??0)
      if (oldVal === null) {
        nextTick(() => {
          vueEmits('layout-ready', props.layout)
        })
      }
      updateHeight()
    })
  })
	watch(
		() => props.layout,
		() => {
			layoutUpdate()
		}
	)
  watch(
      () => props.layout.length,
      () => {
        layoutUpdate()
      }
  )
  watch(
      () => props.colNum,
      val => {
        emit('setColNum', val)
      }
  )
  watch(
      () => props.rowHeight,
      val => {
        emit('setRowHeight', val)
      }
  )
  watch(
      () => props.isDraggable,
      val => {
        emit('setDraggable', val)
      }
  )
  watch(
      () => props.isResizable,
      val => {
        emit('setResizable', val)
      }
  )
  watch(
      () => props.isBounded,
      val => {
        emit('setBounded', val)
      }
  )
  watch(
      () => props.transformScale,
      val => {
        emit('setTransformScale', val)
      }
  )
  watch(
      () => props.responsive,
      val => {
        if (!val) {
          vueEmits("update:layout", originalLayout.value || [])
          emit("setColNum", props.colNum)
        }
        onWindowResize()
      }
  )
  watch(
      () => props.maxRows,
      val => {
        emit("setMaxRows", val)
      }
  )
  watch(
      () => props.margin,
      () => {
        updateHeight()
      }
  )
  //

	provide('parentLayoutProps', props)
	provide('parentLayoutInstance', getCurrentInstance())
	provide('parentLayoutContainerWidthGetter', () => width)

	// init
	;(function init() {
		on('item:resizeEvent', handleResizeEvent)
		on('item:dragEvent', handleDragEvent)
		vueEmits('layout-created', props.layout)
	})()

	function initResponsiveFeatures() {
		// clear layouts
		layouts = Object.assign({}, props.responsiveLayouts)
	}
	// window resize handler
	function handleWindowResize() {
		// TODO: window resize case
	}
	function updateHeight() {
		if (!props.autoResize) return
		let { rowHeight, margin, layout } = props
		mergedStyle.value = Object.assign(mergedStyle.value, {
			// FIXME: handle margin four value case
			height: bottom(layout) * (rowHeight + margin[1]) + margin[1] + 'px'
		})
	}
	// finds or generates new layouts for set breakpoints
	function responsiveGridLayout() {
		const { breakpoints, cols, layout: userLayout, verticalCompact } = props
		let newBreakpoint = getBreakpointFromWidth(breakpoints, width.value??0)
		let newCols = getColsFromBreakpoint(newBreakpoint, cols)

		// save actual layout in layouts
		if (lastBreakpoint != null && !layouts[lastBreakpoint])
			// FIXME: Layout type
			layouts[lastBreakpoint] = cloneLayout(userLayout)

		// Find or generate a new layout.
		let layout = findOrGenerateResponsiveLayout(
			// @ts-ignore
			originalLayout.value!,
			layouts,
			breakpoints,
			newBreakpoint,
			// @ts-ignore
			lastBreakpoint,
			newCols,
			verticalCompact
		)

		// Store the new layout.
		layouts[newBreakpoint] = layout

		if (lastBreakpoint !== newBreakpoint) {
			// FIXME: arg nums, try convert it to object arguments
			vueEmits('breakpoint-changed', newBreakpoint, layout)
		}

		// new prop sync
		vueEmits('update:layout', layout)

		lastBreakpoint = newBreakpoint
		emit('setColNum', getColsFromBreakpoint(newBreakpoint, cols))
	}
	function layoutUpdate() {
		const { layout, verticalCompact } = props
		if (layout !== undefined && originalLayout.value !== null) {
			if (layout.length !== originalLayout.value.length) {
				debug('### LAYOUT UPDATE!', layout.length, originalLayout.value.length)

				let diff = diffTwoLayout(layout, originalLayout.value)
				if (diff.length > 0) {
					if (layout.length > originalLayout.value.length) {
						originalLayout.value = originalLayout.value.concat(diff)
					} else {
						originalLayout.value = originalLayout.value.filter((obj) => {
							return !diff.some((obj2) => {
								return obj.i === obj2.i
							})
						})
					}
				}

				lastLayoutLength = layout.length
				initResponsiveFeatures()
			}

			compact(layout, verticalCompact)
			emit('layout:updateWidth', width.value!)
			updateHeight()

			vueEmits('layout-updated', layout)
		}
	}
	function handleResizeEvent(data?: ItemResizeEvent) {
    const { eventName = '', i = '', x = 0, y = 0, h = 0, w = 0 } = data || {}
		const { layout, preventCollision, responsive } = props
		let currentResizeLayoutItem = getLayoutItem(layout, i)
		// GetLayoutItem sometimes return null object
		if (currentResizeLayoutItem === undefined || currentResizeLayoutItem === null) {
			currentResizeLayoutItem = { h: 0, w: 0 } as LayoutItem
		}
		let hasCollisions
		if (preventCollision) {
			const collisions = getAllCollisions(layout, {
				...currentResizeLayoutItem,
				w,
				h
			}).filter((layoutItem) => layoutItem.i !== currentResizeLayoutItem!.i)
			hasCollisions = collisions.length > 0

			// If we're colliding, we need adjust the placeholder.
			if (hasCollisions) {
				// adjust w && h to maximum allowed space
				let leastX = Infinity,
					leastY = Infinity
				collisions.forEach((layoutItem) => {
					if (layoutItem.x > currentResizeLayoutItem!.x)
						leastX = Math.min(leastX, layoutItem.x)
					if (layoutItem.y > currentResizeLayoutItem!.y)
						leastY = Math.min(leastY, layoutItem.y)
				})

				if (Number.isFinite(leastX))
					currentResizeLayoutItem.w = leastX - currentResizeLayoutItem.x
				if (Number.isFinite(leastY))
					currentResizeLayoutItem.h = leastY - currentResizeLayoutItem.y
			}
		}

		if (!hasCollisions) {
			// Set new width and height.
			currentResizeLayoutItem.w = w
			currentResizeLayoutItem.h = h
		}

		if (eventName === 'resizestart' || eventName === 'resizemove') {
			placeholder.value = {
				i,
				x,
				y,
				w: currentResizeLayoutItem.w,
				h: currentResizeLayoutItem.h
			}
			nextTick(() => {
				isDragging.value = true
			})
			emit('layout:updateWidth', width.value??0)
		} else {
			nextTick(function () {
				isDragging.value = false
			})
		}

		if (responsive) responsiveGridLayout()

		compact(layout, props.verticalCompact)
		emit('compact')
		updateHeight()

		if (eventName === 'resizeend') vueEmits('layout-updated', layout)
	}
	function handleDragEvent(data?: ItemDragEvent) {
    const { eventName = '', i = '', x = 0, y = 0, h = 0, w = 0 } = data || {}
		debug(eventName + ' id=' + i + ', x=' + x + ', y=' + y)
		const { layout, restoreOnDrag, verticalCompact, preventCollision } = props
		let currentDragLayoutItem = getLayoutItem(layout, i)
		if (currentDragLayoutItem === undefined || currentDragLayoutItem === null) {
			currentDragLayoutItem = { x: 0, y: 0 } as LayoutItem
		}

		if (eventName === 'dragstart' && !verticalCompact) {
			positionsBeforeDrag = layout.reduce(
				(result, { i, x, y }) => ({
					...result,
					[i]: { x, y }
				}),
				{}
			)
		}

		if (eventName === 'dragmove' || eventName === 'dragstart') {
			placeholder.value = {
				i,
				w,
				h,
				x: currentDragLayoutItem.x,
				y: currentDragLayoutItem.y
			}
			nextTick(() => {
				isDragging.value = true
			})
			emit('layout:updateWidth', width.value??0)
		} else {
			nextTick(function () {
				isDragging.value = false
			})
		}

		// Move the element to the dragged location.
		const _layout = moveElement(layout, currentDragLayoutItem, x, y, true, preventCollision)

		if (restoreOnDrag) {
			// Do not compact items more than in layout before drag
			// Set moved item as static to avoid to compact it
			currentDragLayoutItem.static = true
			compact(_layout, verticalCompact, positionsBeforeDrag)
			currentDragLayoutItem.static = false
		} else {
			compact(_layout, verticalCompact)
		}

		// needed because vue can't detect changes on array element properties
		emit('compact')
		updateHeight()
		if (eventName === 'dragend') {
			positionsBeforeDrag = undefined
			vueEmits('update:layout', _layout)
			vueEmits('layout-updated', _layout)
		}
	}

  function onWindowResize() {
    if (layoutGridContainerRef.value !== null && layoutGridContainerRef.value !== undefined) {
      width.value = layoutGridContainerRef.value.offsetWidth
    }
    emit("item:resizeEvent")
  }
</script>
<script lang="ts">
	export default {
		name: 'GridLayout'
	}
</script>
