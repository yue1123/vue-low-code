// Get {x, y} positions from event.
export function getControlPosition(e: any) {
	return offsetXYFromParentOf(e)
}

// Get from offsetParent
export function offsetXYFromParentOf(e: any) {
	const offsetParent = e.target?.offsetParent || document.body
	const offsetParentRect =
		e.offsetParent === document.body
			? { left: 0, top: 0 }
			: offsetParent.getBoundingClientRect()

	const x = e.clientX + offsetParent.scrollLeft - offsetParentRect.left
	const y = e.clientY + offsetParent.scrollTop - offsetParentRect.top

	return { x, y }
}

// Create an data object exposed by <DraggableCore>'s events
export function createCoreData(lastX: number, lastY: number, x: number, y: number) {
	// State changes are often (but not always!) async. We want the latest value.
	const isStart = !isNum(lastX)

	if (isStart) {
		// If this is our first move, use the x and y as last coords.
		return {
			deltaX: 0,
			deltaY: 0,
			lastX: x,
			lastY: y,
			x: x,
			y: y
		}
	} else {
		// Otherwise calculate proper values.
		return {
			deltaX: x - lastX,
			deltaY: y - lastY,
			lastX: lastX,
			lastY: lastY,
			x: x,
			y: y
		}
	}
}

function isNum(num: number) {
	return typeof num === 'number' && !isNaN(num)
}
