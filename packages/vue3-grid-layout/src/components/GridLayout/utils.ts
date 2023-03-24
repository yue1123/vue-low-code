import type { Layout } from '@types'
export function diffTwoLayout(layout1: Layout, layout2: Layout) {
	//Find values that are in result1 but not in result2
	let uniqueResultOne = layout1.filter(function (obj) {
		return !layout2.some(function (obj2) {
			// FIXME: id
			return obj.i === obj2.i
		})
	})

	//Find values that are in result2 but not in result1
	let uniqueResultTwo = layout2.filter(function (obj) {
		return !layout1.some(function (obj2) {
			// FIXME: id
			return obj.i === obj2.i
		})
	})

	//Combine the two arrays of unique entries#
	return uniqueResultOne.concat(uniqueResultTwo)
}
