import { defineAsyncComponent } from 'vue'
import { COMPONENT_NAME } from '../constants/regexp'

const allComponentModules: Record<string, any> = import.meta.glob(['./*.vue', './**/*.vue'], {
	// eager: true
})
const entries = Object.keys(allComponentModules).map((moduleKey) => {
	const comLoader = allComponentModules[moduleKey]
	const name = moduleKey.replace(COMPONENT_NAME, (_, name) => name)
	return [name, defineAsyncComponent(comLoader)]
})
export default Object.fromEntries(entries)
