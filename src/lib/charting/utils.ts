
export function xOnLine(y: number, refX: number, refY: number, k: number) {
    return (refX + (y - refY) / k)
}

export function yOnLine(x: number, refX: number, refY: number, k: number) {
    return (refY + (x - refX) * k)
}

export function distanceToLine(x: number, y: number, refX: number, refY: number, k: number) {
    return Math.abs(k * x - y + refY - k * refX) / Math.sqrt(k * k + 1)
}

/**
 * @param x
 * @param xCenter center point x of arc
 * @param yCenter center point y of arc
 * @return y or Null.Double
 */
export function yOfCircle(x: number, xCenter: number, yCenter: number, radius: number, positiveSide: boolean): number {
    const dx = x - xCenter;
    const dy = Math.sqrt(radius * radius - dx * dx);
    return positiveSide ? yCenter + dy : yCenter - dy;
}

// export function yOfCircle(x: number, circle: Arc2D, positiveSide: Boolean): number {
//   const xCenter = circle.getCenterX
//   const yCenter = circle.getCenterY
//   const radius  = circle.getHeight / 2.0
//   return yOfCircle(x, xCenter, yCenter, radius, positiveSide)
// }

// export function distanceToCircle(x: number, y: number, circle: Arc2D): number  {
//   const xCenter = circle.getCenterX
//   const yCenter = circle.getCenterY
//   const radius  = circle.getHeight / 2.0
//   const dx = x - xCenter
//   const dy = y - yCenter
//   return (Math.sqrt(dx * dx + dy * dy) - radius)
// }