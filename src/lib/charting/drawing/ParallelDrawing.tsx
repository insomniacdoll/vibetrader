import { Drawing } from "./Drawing"
import { Path } from "../../svg/Path";
import { distanceToInfiniteLine, distanceToLine, distanceToSegment } from "../utils";


export class ParallelDrawing extends Drawing {
    isExtended: boolean = true;

    override init() {
        this.nHandles = 3;
    }

    override hits(x: number, y: number): boolean {
        if (x > this.xc.wChart) return false

        const x0 = this.xt(this.handles[0]), x1 = this.xt(this.handles[1]), x2 = this.xt(this.handles[2])
        const y0 = this.yv(this.handles[0]), y1 = this.yv(this.handles[1]), y2 = this.yv(this.handles[2])

        // Create a virtual second point for the parallel line using the first line's vector
        const dx = x1 - x0, dy = y1 - y0;
        const x3 = x2 + dx, y3 = y2 + dy;

        const distFunc = this.isExtended ? distanceToInfiniteLine : distanceToSegment;

        const distance1 = distFunc(x, y, x0, y0, x1, y1)
        const distance2 = distFunc(x, y, x2, y2, x3, y3)

        return distance1 <= 4 || distance2 <= 4
    }

    override plotDrawing() {
        const path = new Path()
        const x0 = this.xt(this.handles[0]), x1 = this.xt(this.handles[1]), x2 = this.xt(this.handles[2])
        const y0 = this.yv(this.handles[0]), y1 = this.yv(this.handles[1]), y2 = this.yv(this.handles[2])

        const dx = x1 - x0, dy = y1 - y0;
        const k = dx === 0 ? 1 : dy / dx; // Still needed for plotLine helper

        // Use distanceToInfiniteLine to see if the parallel offset is significant
        const distance = distanceToInfiniteLine(x2, y2, x0, y0, x1, y1)

        if (this.isExtended) {
            this.plotLine(x0, y0, k, path);
            if (distance >= 1) this.plotLine(x2, y2, k, path);
        } else {
            path.moveto(x0, y0); path.lineto(x1, y1);
            if (distance > 1) {
                const x3 = x2 + dx, y3 = y2 + dy;
                path.moveto(x2, y2); path.lineto(x3, y3);
            }
        }
        return [path];
    }


}


