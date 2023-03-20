<template>
	<NStatistic label="你一共处理了" tabular-nums>
		<NNumberAnimation ref="numberAnimationInstRef" :from="0" :to="12039" />
		<template #suffix> 条群消息 </template>
	</NStatistic>
	<NSpace vertical>
		花时间、花精力、花心思，愿你每一份努力都不负所望
		<NButton @click="handleClick"> 播放 </NButton>
	</NSpace>
</template>

<script lang="ts" setup>
	import { defineComponent, ref } from 'vue'
	import { NumberAnimationInst, NButton, NNumberAnimation, NSpace, NStatistic } from 'naive-ui'

	const numberAnimationInstRef = ref<NumberAnimationInst | null>(null)
	function handleClick() {
		numberAnimationInstRef.value?.play()
	}
</script>
