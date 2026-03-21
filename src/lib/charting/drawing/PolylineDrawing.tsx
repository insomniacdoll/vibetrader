import { Path } from "../../svg/Path"
import { distanceToLine, distanceToSegment } from "../utils";
import { Drawing, type TPoint } from "./Drawing"

export class PolylineDrawing extends Drawing {
    isExtended: boolean = true

    override init() {
        this.nHandles = undefined;
    }

    override hits(x: number, y: number): boolean {
        let i = 0
        while (i < this.handles.length - 1) {
            const x0 = this.xt(this.handles[i])
            const x1 = this.xt(this.handles[i + 1])
            const y0 = this.yv(this.handles[i])
            const y1 = this.yv(this.handles[i + 1])

            // The vector math automatically handles the bounding box
            if (distanceToSegment(x, y, x0, y0, x1, y1) <= 4) {
                return true
            }
            i++
        }
        return false
    }

    override insertHandle(point: TPoint) {
        const x = this.xc.xb(this.xc.bt(point.time))
        const y = this.yc.yv(point.value)

        let i = 0
        while (i < this.handles.length - 1) {
            const x0 = this.xt(this.handles[i])
            const x1 = this.xt(this.handles[i + 1])
            const y0 = this.yv(this.handles[i])
            const y1 = this.yv(this.handles[i + 1])

            if (distanceToSegment(x, y, x0, y0, x1, y1) <= 4) {
                this.handles.splice(i + 1, 0, this.newHandle(point))
                return i + 1
            }
            i++
        }
        return -1
    }

    override plotDrawing() {
        const path = new Path()

        let i = 0
        while (i < this.handles.length - 1) {
            const x0 = this.xt(this.handles[i])
            const x1 = this.xt(this.handles[i + 1])

            const y0 = this.yv(this.handles[i])
            const y1 = this.yv(this.handles[i + 1])

            path.moveto(x0, y0);
            path.lineto(x1, y1);

            i++
        }

        return [path];
    }

}

