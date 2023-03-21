<template>
  <div
    ref="item"
    class="vue-grid-item"
    :class="classObj"
    :style="style"
  >
    <slot />
    <span v-if="resizableAndNotStatic" ref="handle" :class="resizableHandleClass" />
    <!--<span v-if="draggable" ref="dragHandle" class="vue-draggable-handle"></span>-->
  </div>
</template>
<script setup lang="ts">
import { ref, inject, computed, useSlots } from 'vue'
import { setTopLeft, setTopRight, setTransformRtl, setTransform } from '@/helpers/utils'
import { getControlPosition, createCoreData } from '@/helpers/draggableUtils'
import { getColsFromBreakpoint } from '@/helpers/responsiveUtils'
import { getDocumentDir } from '@/helpers/DOM'
//    var eventBus = require('./eventBus');

import '@interactjs/auto-start'
import '@interactjs/auto-scroll'
import '@interactjs/actions/drag'
import '@interactjs/actions/resize'
import '@interactjs/modifiers'
import '@interactjs/dev-tools'
import interact from '@interactjs/interact'

const props = withDefaults(defineProps<{
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
  i: string,
  dragIgnoreFrom?: string
  dragAllowFrom?: string | null
  resizeIgnoreFrom?: string
  preserveAspectRatio?: boolean
  dragOption?: Record<string, any>
  resizeOption?: Record<string, any>
}>(), {
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

const eventBus = inject('eventBus')
const layout = inject<Layout>('layout')

const slots = useSlots()

const emits = defineEmits<{
  (e: 'containerResized', i: string, h: number, w: number, h2: number, w2: number): void
  (e: 'resize', i: string, h: number, w: number, h2: number, w2: number): void
  (e: 'resized', i: string, h: number, w: number, h2: number, w2: number): void
}>()

let interactObj

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
const dragging = ref<{ top: number, left: number }>({ top: 0, left: 0 })
const isResizing = ref<boolean>(false)
const resizing = ref<{ width: number, height: number } | null>(null)
const lastX = ref<number>(NaN)
const lastY = ref<number>(NaN)
const lastW = ref<number>(NaN)
const lastH = ref<number>(NaN)
const style = ref<Record<string, any>>({})
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
const isAndroid = computed(() => navigator.userAgent.toLowerCase().indexOf("android") !== -1)
const renderRtl = computed(() => {
  return (layout.isMirrored) ? !rtl.value : rtl.value
})
const resizableHandleClass = computed(() => {
  let baseClassname = 'vue-resizable-handle'

  if (renderRtl.value) {
    baseClassname += ' vue-rtl-resizable-handle'
  }

  return baseClassname
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

// #region Methods
function createStyle() {
  if (props.x + props.w > cols.value) {
    innerX.value = 0
    innerW.value = (props.w > cols.value) ? cols.value : props.w
  } else {
    innerX.value = props.x
    innerW.value = props.w
  }

  let pos = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value)

  if (isDragging.value) {
    pos.top = dragging.value.top

    if (renderRtl.value) {
      pos.right = dragging.value.left
    } else {
      pos.left = dragging.value.left
    }
  }

  if (isResizing.value) {
    pos.width = resizing.value.width
    pos.height = resizing.value.height
  }

  let style

  if (useCssTransforms.value) {
    if (renderRtl.value) {
      style = setTransformRtl(pos.top,pos.right, pos.width, pos.height)
    } else {
      style = setTransform(pos.top, pos.left, pos.width, pos.height)
    }
  } else {
    if (renderRtl.value) {
      style = setTopRight(pos.top, pos.right, pos.width, pos.height);
    } else {
      style = setTopLeft(pos.top, pos.left, pos.width, pos.height);
    }
  }

  style.value = style
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
    let val: string = style.value[prop]
    let matches = val.match(/^(\d+)px$/)

    if (!matches) return
    styleProps[prop] = matches[1]
  }

  emits('containerResized', props.i, props.h, props.w, styleProps.height, styleProps.width)
}
function handleResize (event: MouseEvent) {
  if (props.static) return

  const position = getControlPosition(event)

  if (position == null) return

  const { x, y} = position
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
        newSize.width = resizing.value.width - coreEvent.deltaX / transformScale.value
      } else {
        newSize.width = resizing.value.width + coreEvent.deltaX / transformScale.value
      }

      newSize.height = resizing.value.height + coreEvent.deltaY / transformScale.value
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
    emits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
  }
  if (event.type === "resizeend" && (previousW.value !== innerW.value || previousH.value !== innerH.value)) {
    emits("resized", props.i, pos.h, pos.w, newSize.height, newSize.width)
  }

  eventBus.$emit("resizeEvent", event.type, this.i, this.innerX, this.innerY, pos.h, pos.w);
}
function handleDrag (event: MouseEvent) {
  if (props.static || isResizing.value) return

  const position = getControlPosition(event)

  if (position === null) return
  const { x, y } = position
  let newPosition = { top: 0, left: 0 }

  switch (event.type) {
                    case "dragstart": {
                        this.previousX = this.innerX;
                        this.previousY = this.innerY;

                        let parentRect = event.target.offsetParent.getBoundingClientRect();
                        let clientRect = event.target.getBoundingClientRect();

                        const cLeft = clientRect.left / this.transformScale;
                        const pLeft = parentRect.left / this.transformScale;
                        const cRight = clientRect.right / this.transformScale;
                        const pRight = parentRect.right / this.transformScale;
                        const cTop = clientRect.top / this.transformScale;
                        const pTop = parentRect.top / this.transformScale;

                        if (this.renderRtl) {
                          newPosition.left = (cRight - pRight) * -1;
                        } else {
                          newPosition.left = cLeft - pLeft;
                        }
                        newPosition.top = cTop - pTop;
                        this.dragging = newPosition;
                        this.isDragging = true;
                        break;
                    }
                    case "dragend": {
                        if (!this.isDragging) return;
                        let parentRect = event.target.offsetParent.getBoundingClientRect();
                        let clientRect = event.target.getBoundingClientRect();

                        const cLeft = clientRect.left / this.transformScale;
                        const pLeft = parentRect.left / this.transformScale;
                        const cRight = clientRect.right / this.transformScale;
                        const pRight = parentRect.right / this.transformScale;
                        const cTop = clientRect.top / this.transformScale;
                        const pTop = parentRect.top / this.transformScale;

//                        Add rtl support
                        if (this.renderRtl) {
                            newPosition.left = (cRight - pRight) * -1;
                        } else {
                            newPosition.left = cLeft - pLeft;
                        }
                        newPosition.top = cTop - pTop;
//                        console.log("### drag end => " + JSON.stringify(newPosition));
//                        console.log("### DROP: " + JSON.stringify(newPosition));
                        this.dragging = null;
                        this.isDragging = false;
                        // shouldUpdate = true;
                        break;
                    }
                    case "dragmove": {
                        const coreEvent = createCoreData(this.lastX, this.lastY, x, y);
//                        Add rtl support
                        if (this.renderRtl) {
                            newPosition.left = this.dragging.left - coreEvent.deltaX / this.transformScale;
                        } else {
                            newPosition.left = this.dragging.left + coreEvent.deltaX / this.transformScale;
                        }
                        newPosition.top = this.dragging.top + coreEvent.deltaY / this.transformScale;
                        if(this.bounded){
                            const bottomBoundary = event.target.offsetParent.clientHeight - this.calcGridItemWHPx(this.h, this.rowHeight, this.margin[1]);
                            newPosition.top = this.clamp(newPosition.top, 0, bottomBoundary);
                            const colWidth = this.calcColWidth();
                            const rightBoundary = this.containerWidth - this.calcGridItemWHPx(this.w, colWidth, this.margin[0]);
                            newPosition.left = this.clamp(newPosition.left, 0, rightBoundary);
                        }
//                        console.log("### drag => " + event.type + ", x=" + x + ", y=" + y);
//                        console.log("### drag => " + event.type + ", deltaX=" + coreEvent.deltaX + ", deltaY=" + coreEvent.deltaY);
//                        console.log("### drag end => " + JSON.stringify(newPosition));
                        this.dragging = newPosition;
                        break;
                    }
                }

                // Get new XY
                let pos;
                if (this.renderRtl) {
                    pos = this.calcXY(newPosition.top, newPosition.left);
                } else {
                    pos = this.calcXY(newPosition.top, newPosition.left);
                }

                this.lastX = x;
                this.lastY = y;

                if (this.innerX !== pos.x || this.innerY !== pos.y) {
                    this.$emit("move", this.i, pos.x, pos.y);
                }
                if (event.type === "dragend" && (this.previousX !== this.innerX || this.previousY !== this.innerY)) {
                    this.$emit("moved", this.i, pos.x, pos.y);
                }
                this.eventBus.$emit("dragEvent", event.type, this.i, pos.x, pos.y, this.innerH, this.innerW)
}
function calcPosition (x: number, y: number, w: number, h: number) {
  const colWidth = calcColWidth()
  let out: {
    top: number
    right: number
    width: number
    height: number
  } = {
    top: 0,
    right: 0,
    width: 0,
    height: 0
  }

  if (renderRtl.value) {
    out = {
      right: Math.round(colWidth * x + (x + 1) * margin.value[0]),
      top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
      width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
      height: h === Infinity ? y : Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin.value[1])
    }
  }

  return out
}
function calcXY (top: number, left: number) {
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
function calcColWidth () {
  return (containerWidth.value - (margin.value[0] * (cols.value + 1))) / cols.value
}
function calcGridItemWHPx (gridUnits: number, colOrRowSize: number, marginPx: number) {
  if (!Number.isFinite(gridUnits)) return gridUnits
  return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx)
}
function clamp (num: number, lowerBound, upperBound) {
  return Math.max(Math.min(num, upperBound), lowerBound)
}
function calcWH (height: number, width: number, autoSizeFlag = false) {
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
function updateWidth (width: number, colNum: number) {
  containerWidth.value = width
  if (colNum !== undefined && colNum !== null) {
    cols.value = colNum
  }
}
function compact () {
  createStyle()
}
function tryMakeDraggable () {
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
function tryMakeResizable () {
  if (interactObj === null || interactObj === undefined) {
    interactObj = interact(itemRef.value)

    if (!useStyleCursor.value) {
      interactObj.styleCursor(false)
    }
  }

  if  (resizable.value && props.static) {
    let maximum = calcPosition(0, 0, props.maxW, props.maxH)
    let minimum = calcPosition(0, 0, props.minW, props.minH)
    const opts = {
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
      opts.modifiers = [
        interact.modifiers.aspectRatio({ ratio: 'preserve' })
      ]
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
function autoSize () {
  previousW.value = innerW.value
  previousH.value = innerH.value

  let newSize = slots.defaults[0].elm.getBoundingClientRect()
  let pos = calcWH(newSize.height, newSize.width, true)

  if (pos.w < props.minW) pos.w = props.minW
  if (pos.w > props.maxW) pos.w = props.maxW
  if (pos.h < props.minH) pos.h = props.minH
  if (pos.h > props.maxH) pos.h = props.maxH
  if (pos.h < 1) pos.h = 1
  if (pos.w < 1) pos.w = 1

  if (innerW.value !== pos.w || innerH.value !== pos.h) {
    emits('resize', props.i, pos.h, pos.w, newSize.height, newSize.width)
  }

  if (previousW.value !== pos.w || previousH.value !== pos.h) {
    emits('resized', props.i, pos.h, pos.w, newSize.height, newSize.width)
    eventBus.$emit('resizeEvent', 'resizeend', props.i, innerX.value, innerY.value, pos.h, pos.w)
  }
}
// #endregion
</script>
<style>
.vue-grid-item {
  transition: all 200ms ease;
  transition-property: left, top, right;
  /* add right for rtl */
}

.vue-grid-item.no-touch {
  -ms-touch-action: none;
  touch-action: none;
}

.vue-grid-item.cssTransforms {
  transition-property: transform;
  left: 0;
  right: auto;
}

.vue-grid-item.cssTransforms.render-rtl {
  left: auto;
  right: 0;
}

.vue-grid-item.resizing {
  opacity: 0.6;
  z-index: 3;
}

.vue-grid-item.vue-draggable-dragging {
  transition:none;
  z-index: 3;
}

.vue-grid-item.vue-grid-placeholder {
  background: red;
  opacity: 0.2;
  transition-duration: 100ms;
  z-index: 2;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -o-user-select: none;
  user-select: none;
}

.vue-grid-item > .vue-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
  background-position: bottom right;
  padding: 0 3px 3px 0;
  background-repeat: no-repeat;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: se-resize;
}

.vue-grid-item > .vue-rtl-resizable-handle {
  bottom: 0;
  left: 0;
  background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAuMDAwMDAwMDAwMDAwMDAyIiBoZWlnaHQ9IjEwLjAwMDAwMDAwMDAwMDAwMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5jb20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgogPGc+CiAgPHRpdGxlPmJhY2tncm91bmQ8L3RpdGxlPgogIDxyZWN0IGZpbGw9Im5vbmUiIGlkPSJjYW52YXNfYmFja2dyb3VuZCIgaGVpZ2h0PSIxMiIgd2lkdGg9IjEyIiB5PSItMSIgeD0iLTEiLz4KICA8ZyBkaXNwbGF5PSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgeT0iMCIgeD0iMCIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgaWQ9ImNhbnZhc0dyaWQiPgogICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIi8+CiAgPC9nPgogPC9nPgogPGc+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPgogIDxsaW5lIGNhbnZhcz0iI2ZmZmZmZiIgY2FudmFzLW9wYWNpdHk9IjEiIHN0cm9rZS1saW5lY2FwPSJ1bmRlZmluZWQiIHN0cm9rZS1saW5lam9pbj0idW5kZWZpbmVkIiBpZD0ic3ZnXzEiIHkyPSItNzAuMTc4NDA3IiB4Mj0iMTI0LjQ2NDE3NSIgeTE9Ii0zOC4zOTI3MzciIHgxPSIxNDQuODIxMjg5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlPSIjMDAwIiBmaWxsPSJub25lIi8+CiAgPGxpbmUgc3Ryb2tlPSIjNjY2NjY2IiBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z181IiB5Mj0iOS4xMDY5NTciIHgyPSIwLjk0NzI0NyIgeTE9Ii0wLjAxODEyOCIgeDE9IjAuOTQ3MjQ3IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z183IiB5Mj0iOSIgeDI9IjEwLjA3MzUyOSIgeTE9IjkiIHgxPSItMC42NTU2NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiM2NjY2NjYiIGZpbGw9Im5vbmUiLz4KIDwvZz4KPC9zdmc+);
  background-position: bottom left;
  padding-left: 3px;
  background-repeat: no-repeat;
  background-origin: content-box;
  cursor: sw-resize;
  right: auto;
}

.vue-grid-item.disable-userselect {
  user-select: none;
}
</style>
