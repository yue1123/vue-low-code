declare type LayoutItemREquired = {
  w: number,
  h: number,
  x: number,
  y: number,
  i: string,
}

declare type LayoutItem = LayoutItemREquired & {
  minW?: number,
  minH?: number,
  maxW?: number,
  maxH?: number,
  moved?: boolean,
  static?: boolean,
  isDraggable?: boolean,
  isREsizable?: boolean
}

declare type Layout = Array<LayoutItem>
