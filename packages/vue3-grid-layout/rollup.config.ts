import path from 'node:path'
import { defineConfig } from 'rollup'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import vue from 'rollup-plugin-vue'
import typescript from 'rollup-plugin-typescript2'
// import esbuild from 'rollup-plugin-esbuild'
import pkg from './package.json'
import alias from '@rollup/plugin-alias'
// import dts from 'rollup-plugin-dts'
// import replace from '@rollup/plugin-replace'

const root = process.cwd()
const dep = Object.keys(pkg.dependencies)

const baseConfig = defineConfig({
	external: dep,
	// external(id) {
	// 	if (id === 'vue') return true
	// 	if (id === 'index.vue' || id === './components/index') return false
	// },
	input: path.resolve('./src/index.ts'),
	plugins: [
		// replace({
		// 	values: {
		// 		__VERSION__: pkg.version
		// 	},
		// 	preventAssignment: true
		// }),
		nodeResolve(),
		typescript(),
		commonjs(),
		babel({
			babelHelpers: 'runtime',
			exclude: /node_modules/,
			presets: ['@babel/preset-env'],
			plugins: [['@babel/plugin-transform-runtime', { useESModules: true }]]
		}),
		// alias({
		// 	entries: [{ find: /^@(.*)/, replacement: path.resolve('./src/$1/index.ts') }]
		// }),
		// esbuild(),
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

// const dtsBuild = defineConfig({
// 	input: path.resolve('./es/src/index.d.ts'),
// 	output: { file: 'dist/index.d.ts' },
// 	external: () => false,
// 	plugins: [
// 		nodeResolve(),
// 		dts(),
// 		alias({
// 			entries: [{ find: '@', replacement: path.resolve('./es/src/') }]
// 		})
// 	]
// })

export default [
	baseConfig,
	cssBuild
	//  dtsBuild
]
