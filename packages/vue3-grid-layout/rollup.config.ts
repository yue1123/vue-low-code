/* eslint-disable @typescript-eslint/no-var-requires */
import path from 'node:path'
// import merge from 'deepmerge'
import { defineConfig } from 'rollup'
import resolve from 'rollup-plugin-node-resolve'
// const babel = require('@rollup/plugin-babel').default
// import replace from '@rollup/plugin-replace'
// import { terser } from 'rollup-plugin-terser'
import vue from 'rollup-plugin-vue'
import typescript from 'rollup-plugin-typescript'
import pkg from './package.json'

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
		typescript(),
		vue(),
		resolve()
		// babel({
		// 	exclude: 'node_modules/**',
		// 	babelHelpers: 'bundled'
		// })
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

export default baseConfig
