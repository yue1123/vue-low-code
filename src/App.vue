<template>
	<!-- <NMessageProvider>
		<div class="container">
			<Preview v-if="isPreview" />
			<Main v-else />
		</div>
	</NMessageProvider> -->
	<GridLayout
    style="height: 1850px;"
    id="grid-layout"
    :margin="[parseInt(marginX), parseInt(marginY)]"
    :layout.sync="layout"
    :col-num="parseInt(colNum)"
    :row-height="rowHeight"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :is-mirrored="mirrored"
    :is-bounded="bounded"
    :prevent-collision="preventCollision"
    :vertical-compact="compact"
    :restore-on-drag="restoreOnDrag"
    :use-css-transforms="true"
    :responsive="responsive"
    :transformScale="transformScale"
    @layout-created="layoutCreatedEvent"
    @layout-before-mount="layoutBeforeMountEvent"
    @layout-mounted="layoutMountedEvent"
    @layout-ready="layoutReadyEvent"
    @layout-updated="layoutUpdatedEvent"
    @breakpoint-changed="breakpointChangedEvent"
  >
		<!-- @ts-ignore -->
		<!-- <template v-slot:[com.i]  :key="com.name"> -->
		<GridItem
      v-for="item in layout"
      :static="item.static"
      :x="item.x"
      :y="item.y"
      :w="item.w"
      :h="item.h"
      :i="item.i"
      :min-w="item.minW"
      :max-w="item.maxW"
      :min-x="item.minX"
      :max-x="item.maxX"
      :min-y="item.minY"
      :max-y="item.maxY"
      :preserve-aspect-ratio="item.preserveAspectRatio"
      @resize="resize"
      @move="move"
      @resized="resized"
      @container-resized="containerResized"
      @moved="moved"
    > 123 </GridItem>
		<!-- </template> -->
	</GridLayout>
</template>

<script>
  import {GridItem, GridLayout} from "vue3-grid-layout";

  let testLayout = [
    {"x":0,"y":0,"w":2,"h":2,"i":"0", resizable: true, draggable: true, static: false, minY: 0, maxY: 2},
    {"x":2,"y":0,"w":2,"h":4,"i":"1", resizable: null, draggable: null, static: true},
    {"x":4,"y":0,"w":2,"h":5,"i":"2", resizable: false, draggable: false, static: false, minX: 4, maxX: 4, minW: 2, maxW: 2, preserveAspectRatio: true},
    {"x":6,"y":0,"w":2,"h":3,"i":"3", resizable: false, draggable: false, static: false, preserveAspectRatio: true},
    {"x":8,"y":0,"w":2,"h":3,"i":"4", resizable: false, draggable: false, static: false},
    {"x":10,"y":0,"w":2,"h":3,"i":"5", resizable: false, draggable: false, static: false},
    {"x":0,"y":5,"w":2,"h":5,"i":"6", resizable: false, draggable: false, static: false},
    {"x":2,"y":5,"w":2,"h":5,"i":"7", resizable: false, draggable: false, static: false},
    {"x":4,"y":5,"w":2,"h":5,"i":"8", resizable: false, draggable: false, static: false},
    {"x":6,"y":3,"w":2,"h":4,"i":"9", resizable: false, draggable: false, static: true},
    {"x":8,"y":4,"w":2,"h":4,"i":"10", resizable: false, draggable: false, static: false},
    {"x":10,"y":4,"w":2,"h":4,"i":"11", resizable: false, draggable: false, static: false, minY: 4},
    {"x":0,"y":10,"w":2,"h":5,"i":"12", resizable: false, draggable: false, static: false},
    {"x":2,"y":10,"w":2,"h":5,"i":"13", resizable: false, draggable: false, static: false},
    {"x":4,"y":8,"w":2,"h":4,"i":"14", resizable: false, draggable: false, static: false},
    {"x":6,"y":8,"w":2,"h":4,"i":"15", resizable: false, draggable: false, static: false},
    {"x":8,"y":10,"w":2,"h":5,"i":"16", resizable: false, draggable: false, static: false},
    {"x":10,"y":4,"w":2,"h":2,"i":"17", resizable: false, draggable: false, static: false},
    {"x":0,"y":9,"w":2,"h":3,"i":"18", resizable: false, draggable: false, static: false},
    {"x":2,"y":6,"w":2,"h":2,"i":"19", resizable: false, draggable: false, static: false}
  ];

  export default {
    name: 'app',
    components: {
      GridLayout,
      GridItem,
    },
    data () {
      return {
        layout: JSON.parse(JSON.stringify(testLayout)),
        layout2: JSON.parse(JSON.stringify(testLayout)),
        draggable: true,
        resizable: true,
        mirrored: false,
        responsive: true,
        bounded: false,
        transformScale: 1,
        preventCollision: false,
        compact: true,
        restoreOnDrag: true,
        rowHeight: 30,
        colNum: 12,
        index: 0,
        marginX: 10,
        marginY: 10,
      }
    },
    mounted: function () {
      this.index = this.layout.length;
    },
    methods: {
      clicked: function() {
        window.alert("CLICK!");
      },
      increaseWidth: function() {
        let width = document.getElementById("content").offsetWidth;
        width += 20;
        document.getElementById("content").style.width = width+"px";
      },
      decreaseWidth: function() {
        let width = document.getElementById("content").offsetWidth;
        width -= 20;
        document.getElementById("content").style.width = width+"px";
      },
      scaleHalf: function() {
        this.transformScale = 0.5
        document.getElementById("grid-layout").style.transform = "scale(0.5)";
      },
      scaleThreeQuarters: function() {
        this.transformScale = 0.75
        document.getElementById("grid-layout").style.transform = "scale(0.75)";
      },
      scaleIdentity: function() {
        this.transformScale = 1
        document.getElementById("grid-layout").style.transform = "scale(1)";
      },
      removeItem: function(i) {
        console.log("### REMOVE " + i);
        const index = this.layout.map(item => item.i).indexOf(i);
        this.layout.splice(index, 1);
      },
      addItem: function() {
        // let self = this;
        //console.log("### LENGTH: " + this.layout.length);
        let item = {"x":0,"y":0,"w":2,"h":2,"i":this.index+"", whatever: "bbb"};
        this.index++;
        this.layout.push(item);
      },
      addItemDynamically: function() {
        const x = (this.layout.length * 2) % (this.colNum || 12);
        const y = this.layout.length + (this.colNum || 12);
        console.log("X=" + x + " Y=" + y)
        let item = {
          x: x,
          y: y,
          w: 2,
          h: 2,
          i: this.index+"",
        }
        this.index++;
        this.layout.push(item);
      },
      move: function(i, newX, newY){
        console.log("MOVE i=" + i + ", X=" + newX + ", Y=" + newY);
      },
      resize: function(i, newH, newW, newHPx, newWPx){
        console.log("RESIZE i=" + i + ", H=" + newH + ", W=" + newW + ", H(px)=" + newHPx + ", W(px)=" + newWPx);
      },
      moved: function(i, newX, newY){
        console.log("### MOVED i=" + i + ", X=" + newX + ", Y=" + newY);
      },
      resized: function(i, newH, newW, newHPx, newWPx){
        console.log("### RESIZED i=" + i + ", H=" + newH + ", W=" + newW + ", H(px)=" + newHPx + ", W(px)=" + newWPx);
      },
      containerResized: function(i, newH, newW, newHPx, newWPx){
        console.log("### CONTAINER RESIZED i=" + i + ", H=" + newH + ", W=" + newW + ", H(px)=" + newHPx + ", W(px)=" + newWPx);
      },
      /**
       * Add change direction button
       */
      changeDirection() {
        let documentDirection = getDocumentDir();
        let toggle = "";
        if (documentDirection === "rtl") {
          toggle = "ltr"
        } else {
          toggle = "rtl"
        }
        setDocumentDir(toggle);
        //eventBus.$emit('directionchange');
      },

      layoutCreatedEvent: function(newLayout){
        console.log("Created layout: ", newLayout)
      },
      layoutBeforeMountEvent: function(newLayout){
        console.log("beforeMount layout: ", newLayout)
      },
      layoutMountedEvent: function(newLayout){
        console.log("Mounted layout: ", newLayout)
      },
      layoutReadyEvent: function(newLayout){
        console.log("Ready layout: ", newLayout)
      },
      layoutUpdatedEvent: function(newLayout){
        console.log("Updated layout: ", newLayout)
      },
      breakpointChangedEvent: function(newBreakpoint, newLayout){
        console.log("breakpoint changed breakpoint=", newBreakpoint, ", layout: ", newLayout );
      }

    },
  }
</script>

<!--<script lang="ts" setup>
	import { ref } from 'vue'
	import { GridLayout, GridItem } from 'vue3-grid-layout'
	import 'vue3-grid-layout/dist/style.css'
	const layout = ref<any[]>([
		{
			x: 8,
			y: 11,
			w: 4,
			h: 4,
			i: 'DemoCom0.899250740309899',
			name: 'DemoCom',
			moved: false
		},
		{
			x: 8,
			y: 3,
			w: 4,
			h: 4,
			i: 'DemoCom10.8361288089125452',
			name: 'DemoCom1',
			moved: false
		},
	])
	// import { NMessageProvider } from 'naive-ui'
	// import Main from './views/Main.vue'
	// import Preview from './views/Preview.vue'
	// let isPreview = /preview/.test(window.location.href)
</script>-->

<style>
/*** EXAMPLE ***/
#content {
  width: 100%;
}

.vue-grid-layout {
  background: #eee;
}

.layoutJSON {
  background: #ddd;
  border: 1px solid black;
  margin-top: 10px;
  padding: 10px;
}

.eventsJSON {
  background: #ddd;
  border: 1px solid black;
  margin-top: 10px;
  padding: 10px;
  height: 100px;
  overflow-y: scroll;
}

.columns {
  -moz-columns: 120px;
  -webkit-columns: 120px;
  columns: 120px;
}



/*.vue-resizable-handle {
    z-index: 5000;
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
}*/

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #ccc;
  border: 1px solid black;
}

.vue-grid-item.resizing {
  opacity: 0.9;
}

.vue-grid-item.static {
  background: #cce;
}

.vue-grid-item .text {
  font-size: 24px;
  text-align: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  height: 100%;
  width: 100%;
}

.vue-grid-item .no-drag {
  height: 100%;
  width: 100%;
}

.vue-grid-item .minMax {
  font-size: 12px;
}

.vue-grid-item .add {
  cursor: pointer;
}

.vue-draggable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  top: 0;
  left: 0;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><circle cx='5' cy='5' r='5' fill='#999999'/></svg>") no-repeat;
  background-position: bottom right;
  padding: 0 8px 8px 0;
  background-repeat: no-repeat;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: pointer;
}

</style>
