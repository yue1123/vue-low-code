import path from 'node:path'
import { defineConfig } from 'rollup'
import resolve from 'rollup-plugin-node-resolve'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import vue from 'rollup-plugin-vue'
import typescript from 'rollup-plugin-typescript2'
// import pkg from './package.json'
import alias from '@rollup/plugin-alias'
// import dts from 'rollup-plugin-dts'
// import replace from '@rollup/plugin-replace'

const baseConfig = defineConfig({
	external(id) {
		if (id === 'vue') return true
		if (id === 'index.vue' || id === './components/index') return false
	},
	input: path.resolve('./src/index.ts'),
	plugins: [
		// replace({
		// 	values: {
		// 		__VERSION__: pkg.version
		// 	},
		// 	preventAssignment: true
		// }),
		alias({
			entries: [{ find: '@', replacement: path.resolve('./src/') }]
		}),
		typescript(),
		resolve(),
		vue()
	],
	output: {
		file: 'dist/index.esm.js',
		name: 'Vue3GridLayout',
		format: 'esm',
		exports: 'named',
		globals: {
			vue: 'Vue'
		}
	}
})

const cssBuild = defineConfig({
	input: path.resolve('./src/styles/index.css'),
	output: { file: 'dist/style.css' },
	plugins: [
		postcss({
			extract: true,
			plugins: [autoprefixer()]
		})
	]
})

export default [baseConfig, cssBuild]
