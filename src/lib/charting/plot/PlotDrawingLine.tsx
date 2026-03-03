import { TVar } from "../../timeseris/TVar";
import { Path } from "../../svg/Path";
import type { ChartYControl } from "../view/ChartYControl";
import type { ChartXControl } from "../view/ChartXControl";
import type { PlotOptions } from "./Plot";
import type { LinePoint, PineData } from "../../domain/PineData";

type Props = {
    xc: ChartXControl,
    yc: ChartYControl,
    tvar: TVar<PineData[]>,
    name: string,
    atIndex: number,
    options: PlotOptions;
    depth?: number;
}

const PlotDrawingLine = (props: Props) => {
    const { xc, yc, tvar, name, atIndex, depth, options } = props

    function plot() {
        const path = new Path()

        const points = collectPoints();

        let prevY: number
        for (let m = 0; m < points.length; m++) {
            const [x, y] = points[m]

            if (y !== undefined) {
                if (prevY === undefined) {
                    // new segment
                    path.moveto(x, y)

                } else {
                    path.lineto(x, y)
                }
            }

            prevY = y
        }

        return { path }
    }

    function collectPoints() {
        const points: number[][] = []

        const datas = tvar.getByIndex(0);
        const data = datas ? datas[atIndex] : undefined;
        const coordinates = data ? data.value as LinePoint[] : undefined;
        if (coordinates !== undefined) {
            for (let i = 0; i < coordinates.length; i++) {
                const { x1, y1 } = coordinates[i]
                const bar = xc.br(x1);
                const xPos = xc.xb(bar)
                const yPos = yc.yv(y1)
                console.log(bar, x1, y1)

                if (xPos !== undefined && yPos !== undefined) {
                    points.push([xPos, yPos])
                }
            }

        }

        return points
    }

    const { path } = plot();

    return (
        path.render({ style: { stroke: 'red', fill: 'none' } })
    )
}

export default PlotDrawingLine;