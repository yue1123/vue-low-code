<template>
	<NMessageProvider>
		<div class="container">
			<Preview v-if="isPreview" />
			<Main v-else />
		</div>
	</NMessageProvider>
</template>

<script lang="ts" setup>
	import { NMessageProvider } from 'naive-ui'
	import Main from './views/Main.vue'
	import Preview from './views/Preview.vue'
	let isPreview = /preview/.test(window.location.href)
</script>
