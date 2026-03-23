import { Path } from "../../svg/Path";
import type { Seg } from "../../svg/Seg";
import type { PlotProps } from "./Plot";

const PlotHline = (props: PlotProps) => {
    const { xc, yc, tvar, atIndex, options } = props;

    let strokeDasharray: string
    switch (options.linestyle) {
        case 'dashed':
            strokeDasharray = "4 3"
            break

        case 'dotted':
            strokeDasharray = "1 2"
            break

        case "solid":
        default:
    }

    function plot() {
        const segs = plotLine();

        return { segs }
    }

    function plotLine(): Seg[] {
        const path = new Path()
        const segs: Seg[] = [path]

        // For those need connect from one bar to the next, use bar++ instead of 
        // bar += xc.nBarsCompressed to avoid uncontinuted line.
        let value: number;
        for (let bar = 1; bar <= xc.nBars; bar++) {
            const time = xc.tb(bar)
            if (tvar.occurred(time)) {
                const datas = tvar.getByTime(time);
                const data = datas ? datas[atIndex] : undefined;
                const v = data ? data.value : NaN
                if (typeof v === "number" && !isNaN(v)) {
                    value = v;
                    break;
                }
            }
        }

        const y = yc.yv(value)
        path.moveto(0, y)
            .lineto(xc.wChart, y);

        return segs
    }

    const { segs } = plot();

    return (
        segs.map((seg, n) => seg.render({ key: 'seg-' + n, style: { stroke: options.color, fill: 'none', strokeDasharray } }))
    )
}

export default PlotHline;