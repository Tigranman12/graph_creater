export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface QuadtreeItem extends Rect {
  id: string
}

export class Quadtree {
  private items: QuadtreeItem[] = []
  private nodes: Quadtree[] = []
  private readonly maxItems = 10
  private readonly maxDepth = 8

  constructor(private bounds: Rect, private depth = 0) {}

  clear() {
    this.items = []
    this.nodes = []
  }

  private split() {
    const subWidth = this.bounds.width / 2
    const subHeight = this.bounds.height / 2
    const { x, y } = this.bounds

    this.nodes = [
      new Quadtree({ x: x + subWidth, y, width: subWidth, height: subHeight }, this.depth + 1), // Top-right
      new Quadtree({ x, y, width: subWidth, height: subHeight }, this.depth + 1),               // Top-left
      new Quadtree({ x, y: y + subHeight, width: subWidth, height: subHeight }, this.depth + 1), // Bottom-left
      new Quadtree({ x: x + subWidth, y: y + subHeight, width: subWidth, height: subHeight }, this.depth + 1) // Bottom-right
    ]
  }

  private getIndex(rect: Rect): number[] {
    const indexes: number[] = []
    const verticalMidpoint = this.bounds.x + this.bounds.width / 2
    const horizontalMidpoint = this.bounds.y + this.bounds.height / 2

    const startIsNorth = rect.y < horizontalMidpoint
    const startIsWest = rect.x < verticalMidpoint
    const endIsSouth = rect.y + rect.height > horizontalMidpoint
    const endIsEast = rect.x + rect.width > verticalMidpoint

    if (startIsNorth && endIsEast) indexes.push(0) // Top-right
    if (startIsNorth && startIsWest) indexes.push(1) // Top-left
    if (endIsSouth && startIsWest) indexes.push(2) // Bottom-left
    if (endIsSouth && endIsEast) indexes.push(3) // Bottom-right

    return indexes
  }

  insert(item: QuadtreeItem) {
    if (this.nodes.length > 0) {
      const indexes = this.getIndex(item)
      for (const index of indexes) {
        this.nodes[index].insert(item)
      }
      return
    }

    this.items.push(item)

    if (this.items.length > this.maxItems && this.depth < this.maxDepth) {
      this.split()
      for (const existingItem of this.items) {
        const indexes = this.getIndex(existingItem)
        for (const index of indexes) {
          this.nodes[index].insert(existingItem)
        }
      }
      this.items = []
    }
  }

  retrieve(rect: Rect): Set<string> {
    const result = new Set<string>()
    const indexes = this.getIndex(rect)

    if (this.nodes.length > 0) {
      for (const index of indexes) {
        this.nodes[index].retrieve(rect).forEach(id => result.add(id))
      }
    } else {
      for (const item of this.items) {
        if (
          rect.x < item.x + item.width &&
          rect.x + rect.width > item.x &&
          rect.y < item.y + item.height &&
          rect.y + rect.height > item.y
        ) {
          result.add(item.id)
        }
      }
    }

    return result
  }
}
