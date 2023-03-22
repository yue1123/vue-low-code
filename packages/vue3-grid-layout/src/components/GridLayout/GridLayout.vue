<template>
	<div ref="layoutGridContainerRef" class="vue_grid-layout" :style="mergedStyle">
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
		ref,
		shallowRef,
		onBeforeMount,
		onBeforeUnmount,
		onMounted,
		nextTick,
		defineEmits,
		provide,
		getCurrentInstance
	} from 'vue'
	import elementResizeDetector from 'element-resize-detector'
	import _debug from 'debug'
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
	} from '@utils'
	import { usePubSub, useEventListener } from '@hooks'
	import type {
		Layout,
		BreakPoints,
		Col,
		Placeholder,
		CssStyle,
		LayoutItem,
		BreakPointsType
	} from '../../types/index'
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
		cols: () => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }),
		preventCollision: false,
		useStyleCursor: true
	})

	// debug
	const debug = _debug('vue-grid-layout:layout')

	// resize listen
	let elementResizeDetectorInstance: any = null
	// layout container ref
	const layoutGridContainerRef = ref<HTMLDivElement>()
	// pub sub center
	const { off, on, emit } = usePubSub()
	const vueEmits = defineEmits(['layout-updated', 'breakpoint-changed', 'update:layout'])
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
	let originalLayout: Layout | null = null
	// window width
	let width = 0
	// responsive layouts
	// FIXME: rename
	let layouts: any = null
	let positionsBeforeDrag: Record<string, LayoutItem> | undefined = undefined
	// elementResizeDetector
	// window resize event handler
	function resizeEventHandler() {}
	// sub item drag event handler
	function dragEventHandler() {}
	// FIXME: rename
	function initResponsiveFeatures() {
		// clear layouts
		layouts = Object.assign({}, props.responsiveLayouts)
	}
	// init
	function init() {
		on('resizeEvent', resizeEventHandler)
		on('dragEvent', dragEventHandler)
		emit('layout-created', props.layout)
	}
	// window resize handler
	function handleWindowResize() {}
	function updateHeight() {
		if (!props.autoResize) return
		let { rowHeight, margin, layout } = props
		mergedStyle = Object.assign(mergedStyle, {
			// FIXME: bottom function
			// FIXME: handle margin row value case
			// FIXME: Layout type
			height: bottom(layout) * (rowHeight + margin[1]) + margin[1] + 'px'
		})
	}
	// finds or generates new layouts for set breakpoints
	function responsiveGridLayout() {
		const { breakpoints, cols, layout: userLayout, verticalCompact } = props
		let newBreakpoint = getBreakpointFromWidth(breakpoints, width)
		let newCols = getColsFromBreakpoint(newBreakpoint, cols)

		// save actual layout in layouts
		if (lastBreakpoint != null && !layouts[lastBreakpoint])
			// FIXME: Layout type
			layouts[lastBreakpoint] = cloneLayout(userLayout)

		// Find or generate a new layout.
		let layout = findOrGenerateResponsiveLayout(
			// @ts-ignore
			originalLayout!,
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
		if (layout !== undefined && originalLayout !== null) {
			if (layout.length !== originalLayout.length) {
				debug('### LAYOUT UPDATE!', layout.length, originalLayout.length)

				let diff = diffTwoLayout(layout, originalLayout)
				if (diff.length > 0) {
					if (layout.length > originalLayout.length) {
						originalLayout = originalLayout.concat(diff)
					} else {
						originalLayout = originalLayout.filter((obj) => {
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
			emit('updateWidth', width)
			updateHeight()

			vueEmits('layout-updated', layout)
		}
	}
	function resizeEvent(
		eventName: string,
		id: string,
		x: number,
		y: number,
		h: number,
		w: number
	) {
		const { layout, preventCollision, responsive } = props
		// FIXME: layout type
		let currentResizeLayoutItem = getLayoutItem(layout, id)
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
				i: id,
				x,
				y,
				w: currentResizeLayoutItem.w,
				h: currentResizeLayoutItem.h
			}
			nextTick(() => {
				isDragging.value = true
			})
			emit('updateWidth', width)
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
	function dragEvent(eventName: string, id: string, x: number, y: number, h: number, w: number) {
		debug(eventName + ' id=' + id + ', x=' + x + ', y=' + y)
		const { layout, restoreOnDrag, verticalCompact, preventCollision } = props
		let currentDragLayoutItem = getLayoutItem(layout, id)
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
				i: id,
				w,
				h,
				x: currentDragLayoutItem.x,
				y: currentDragLayoutItem.y
			}
			nextTick(() => {
				isDragging.value = true
			})
			emit('updateWidth', width)
		} else {
			nextTick(function () {
				isDragging.value = false
			})
		}

		// Move the element to the dragged location.
		// FIXME: emit layout value change
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
	init()
	useEventListener(self, 'resize', handleWindowResize)
	onBeforeMount(() => {
		emit('layout-before-mount', props.layout)
	})
	onMounted(() => {
		emit('layout-mounted', props.layout)

		// init
		nextTick(function () {
			// FIXME: ???
			// validateLayout(props.layout)

			originalLayout = props.layout
			nextTick(function () {
				initResponsiveFeatures()

				handleWindowResize()

				//self.width = self.$el.offsetWidth;
				// addWindowEventListener('resize', self.onWindowResize)

				compact(props.layout, props.verticalCompact)

				emit('layout-updated', props.layout)

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
		off('resizeEvent', resizeEventHandler)
		off('dragEvent', dragEventHandler)
		emit('layout-created', props.layout)
		if (elementResizeDetectorInstance) {
			elementResizeDetectorInstance.uninstall(layoutGridContainerRef.value)
		}
	})
	provide('parentLayoutPropsGetter', () => props)
	provide('parentLayoutInstanceGetter', ((instance) => instance)(getCurrentInstance()))
</script>
<script lang="ts">
	export default {
		name: 'GridLayout'
	}
</script>
