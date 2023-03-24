export interface LayoutItemREquired {
	w: number
	h: number
	x: number
	y: number
	i: string
}

export interface LayoutItem extends LayoutItemREquired {
	minW?: number
	minH?: number
	maxW?: number
	maxH?: number
	moved?: boolean
	static?: boolean
	isDraggable?: boolean
	isREsizable?: boolean
}

export type Layout = LayoutItem[]

export type Size = { width: number; height: number }


export type BreakPointsType = 'xxs' | 'xs' | 'sm' | 'md' | 'lg'
export type BreakPoints = Record<BreakPointsType, number>
export type Col = Record<BreakPointsType, number>

// placeholder
export interface Placeholder {
	x: number
	y: number
	w: number
	h: number
	i: string
}

// css style interface
export type CssStyle = {
	[key in keyof CSSStyleDeclaration]?: any
}
