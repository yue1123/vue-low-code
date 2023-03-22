<template>
	<NLayout>
		<NLayoutHeader style="padding: 15px" bordered>
			<NButton type="primary" secondary @click="handlePreview">预览</NButton>
		</NLayoutHeader>
		<NLayout style="height: calc(100vh - 65px)" has-sider>
			<NLayoutSider :width="400" bordered>
				<NScrollbar style="max-height: calc(100vh - 65px)" content-style="padding:24px">
					<div style="margin-top: 15px" v-for="com in comList" :key="com.id">
						<NCard>
							<NButton type="primary" secondary @click="() => handleAdd(com)"
								>添加</NButton
							>
							<component :is="allComponents[com.name]"></component>
						</NCard>
					</div>
				</NScrollbar>
			</NLayoutSider>
			<NLayoutContent class="previewContainer" bordered>
				<SmartWidgetGrid :layout="layout" :rowHeight="rowHeight">
					<!-- @ts-ignore -->
					<template v-slot:[com.i] v-for="com in layout" :key="com.name">
						<SmartWidget simple :id="com.i" fullscreen>
							<Suspense>
								<div ref="addComponentsRef">
									<component :is="allComponents[com.name]" />
								</div>
								<template #fallback>
									<div>
										<n-skeleton text :repeat="2" />
										<n-skeleton text style="width: 100%"></n-skeleton>
									</div>
								</template>
							</Suspense>
						</SmartWidget>
					</template>
				</SmartWidgetGrid>
			</NLayoutContent>
		</NLayout>
	</NLayout>
</template>

<script lang="ts" setup>
	import {
		NLayout,
		NButton,
		NScrollbar,
		NSpace,
		NLayoutHeader,
		NSkeleton,
		NLayoutContent,
		NLayoutSider,
		NCard
	} from 'naive-ui'
	import { ref, nextTick, watchEffect } from 'vue'
	import allComponents from '../components/index'
	import { SmartWidgetGrid, SmartWidget } from 'vue-smart-widget'
	// import 'vue-smart-widget/lib/style.css'
	// import { VueDraggableNext } from 'vue-draggable-next'
	// const Draggable = VueDraggableNext
	const rowHeight = 20
	const comList = ref(
		Object.entries(allComponents).map(([name, module]) => {
			return {
				name,
				id: name
			}
		})
	)

	const addComponentsRef = ref()
	const layout = ref<any[]>(JSON.parse(localStorage.getItem('dataCache') || '[]'))
	const addComponentsList = ref<any>([])
	function handleAdd(item: any) {
		const res = {
			x: 0,
			y: 0,
			w: 4,
			h: 4,
			i: `${item.name}${Math.random()}`,
			name: item.name
		}
		layout.value.push(res)
		nextTick(() => {
			let height = addComponentsRef.value?.offsetHeight
			if (height !== undefined) {
				res.h = Math.ceil(height / rowHeight)
			}
		})
	}
	function handlePreview() {
		window.open('?preview')
	}
	watchEffect(() => {
		localStorage.setItem('dataCache', JSON.stringify(layout.value))
	})
</script>

<style lang="scss" scoped>
	.previewContainer {
		width: 100%;
		height: calc(100vh - 65px);
		background-image: radial-gradient(#ccc 1px, rgb(255, 255, 255) 1px);
		background-size: 20px 20px;
	}
</style>
