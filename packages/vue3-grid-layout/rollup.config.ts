const path = require('path')
const { defineConfig } = require('rollup')
const nodeResolve = require('@rollup/plugin-node-resolve').default
const postcss = require('rollup-plugin-postcss')
const autoprefixer = require('autoprefixer')
const vue = require('rollup-plugin-vue')
const typescript = require('rollup-plugin-typescript2')
const esbuild = require('rollup-plugin-esbuild').default
// import pkg from './package.json'
const alias = require('@rollup/plugin-alias')
// import dts from 'rollup-plugin-dts'
// import replace from '@rollup/plugin-replace'

const baseConfig = defineConfig({
	external(id) {
		if (id === 'vue') return true
		// if (id === 'index.vue' || id === './components/index') return false
	},
	input: path.resolve('./src/index.ts'),
	plugins: [
		// replace({
		// 	values: {
		// 		__VERSION__: pkg.version
		// 	},
		// 	preventAssignment: true
		// }),
		// nodeResolve(),
		alias({
			entries: [{ find: '@', replacement: path.resolve('./src/') }]
		}),
		esbuild(),
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
