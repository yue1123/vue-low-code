<template>
	<!-- <NMessageProvider>
		<div class="container">
			<Preview v-if="isPreview" />
			<Main v-else />
		</div>
	</NMessageProvider> -->
	<GridLayout :responsive="false" :layout="layout">
		<!-- @ts-ignore -->
		<!-- <template v-slot:[com.i]  :key="com.name"> -->
		<GridItem v-for="com in layout" v-bind="com"> 123 </GridItem>
		<!-- </template> -->
	</GridLayout>
</template>

<script lang="ts" setup>
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
</script>
