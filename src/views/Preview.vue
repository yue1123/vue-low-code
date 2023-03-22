<template>
	<NLayout>
		<NLayout style="height: 100vh" has-sider>
			<NLayoutContent class="previewContainer" bordered>
				<SmartWidgetGrid :draggable="false" :resizable="false" :layout="layout" :rowHeight="rowHeight">
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
		NSkeleton,
		NLayoutContent,
	} from 'naive-ui'
	import { ref } from 'vue'
	import allComponents from '../components/index'
	import { SmartWidgetGrid, SmartWidget } from 'vue-smart-widget'
	// import 'vue-smart-widget/lib/style.css'
	const rowHeight = 20
	const comList = ref(
		Object.entries(allComponents).map(([name, module]) => {
			return {
				name,
				id: name
			}
		})
	)

	const layout = ref<any[]>(JSON.parse(localStorage.getItem('dataCache') || '[]'))
</script>

<style lang="scss" scoped>
	.previewContainer {
		width: 100%;
		height: 100vh;
	}
</style>
