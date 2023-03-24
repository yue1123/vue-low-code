import type { App } from 'vue'
// import componentsList from './components'

export * from './components'
export * from './types'
const vue3GridLayout = {
	install: (app: App) => {
		// for (const component of componentsList) {
		// 	const name = component.name
		// 	app.component(name, component)
		// }
	},
	version: '__VERSION__'
}
// for umd
export const install = vue3GridLayout.install
export const version = vue3GridLayout.version

export default vue3GridLayout
