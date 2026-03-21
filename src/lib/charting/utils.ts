
export function xOnLine(y: number, refX: number, refY: number, k: number) {
    return (refX + (y - refY) / k)
}

export function yOnLine(x: number, refX: number, refY: number, k: number) {
    return (refY + (x - refX) * k)
}

export function distanceToLine(
    px: number, py: number, // Mouse coordinates
    x0: number, y0: number, // Segment start
    x1: number, y1: number  // Segment end
): number {
    const dx = x1 - x0;
    const dy = y1 - y0;

    // Calculate the squared length of the line segment
    const lengthSquared = dx * dx + dy * dy;

    // If the segment is actually just a single point (length 0)
    if (lengthSquared === 0) {
        return Math.sqrt(Math.pow(px - x0, 2) + Math.pow(py - y0, 2));
    }

    // Calculate the projection scalar 't'
    // This tells us where the closest point falls on the infinite line
    let t = ((px - x0) * dx + (py - y0) * dy) / lengthSquared;

    // Constrain 't' to be between 0 and 1 so the point stays ON the segment
    t = Math.max(0, Math.min(1, t));

    // Find the exact X and Y of the closest point on the segment
    const closestX = x0 + t * dx;
    const closestY = y0 + t * dy;

    // Return the Euclidean distance from the mouse to that closest point
    return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
}

/**
 * Distance from a point to a finite line segment (x0, y0) -> (x1, y1)
 */
export function distanceToSegment(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.sqrt(Math.pow(px - x0, 2) + Math.pow(py - y0, 2));

    let t = ((px - x0) * dx + (py - y0) * dy) / l2;
    t = Math.max(0, Math.min(1, t)); // Constrain to segment

    return Math.sqrt(Math.pow(px - (x0 + t * dx), 2) + Math.pow(py - (y0 + t * dy), 2));
}

/**
 * Distance from a point to an infinite line passing through (x0, y0) and (x1, y1)
 */
export function distanceToInfiniteLine(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.sqrt(Math.pow(px - x0, 2) + Math.pow(py - y0, 2));

    // Area of triangle / base length = height (distance)
    return Math.abs(dy * px - dx * py + x1 * y0 - y1 * x0) / Math.sqrt(l2);
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