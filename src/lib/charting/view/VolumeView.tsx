import { AXISY_WIDTH, type ViewProps, type ViewState } from "./chartviews";
import { TVar } from "../../timeseris/TVar";
import { LINEAR_SCALAR } from "../scalar/LinearScala";
import { LG_SCALAR } from "../scalar/LgScalar";
import { Kline } from "../../domain/Kline";
import AxisYLayer from "./layer/AxisYLayer";
import VolumeLayer from "./layer/VolumeLayer";
import CrosshairLayer from "./layer/CrosshairLayer";
import { Component } from "react";
import { ChartYControl } from "./ChartYControl";

export class VolumeView extends Component<ViewProps, ViewState> {

    yc: ChartYControl;

    constructor(props: ViewProps) {
        super(props);
        this.yc = new ChartYControl(props.xc.baseSer, props.height);

        this.state = {}
    }

    private calcGeometry(atleastMinValue?: number) {
        const [maxValue, minValue] = this.computeMaxMinValue();
        this.yc.calcGeometry(maxValue, atleastMinValue !== undefined ? Math.min(minValue, atleastMinValue) : minValue);
    }

    private computeMaxMinValue() {
        let max = Number.NEGATIVE_INFINITY;
        const min = 0// Number.POSITIVE_INFINITY;

        const xc = this.props.xc;

        for (let i = 1; i <= xc.nBars; i++) {
            const time = xc.tb(i)
            if (xc.occurred(time)) {
                const kline = this.props.tvar.getByTime(time) as Kline;
                if (kline.close > 0) {
                    max = Math.max(max, kline.volume)
                }
            }
        }

        if (max === 0) {
            max = 1
        }

        // if (max === min) {
        //   max *= 1.05
        //   min *= 0.95
        // }

        return [max, min]
    }

    swithScalarType() {
        switch (this.yc.valueScalar.kind) {
            case LINEAR_SCALAR.kind:
                this.yc.valueScalar = LG_SCALAR;
                break;

            default:
                this.yc.valueScalar = LINEAR_SCALAR;
        }
    }

    valueAtTime(time: number) {
        return (this.props.tvar.getByTime(time) as Kline).volume
    }

    render() {
        // update gemoetry
        this.calcGeometry();

        // console.log(`VolumeView render`)

        const transform = `translate(${this.props.x} ${this.props.y})`;
        return (
            <g transform={transform}>
                <VolumeLayer
                    kvar={this.props.tvar as TVar<Kline>}
                    xc={this.props.xc}
                    yc={this.yc}
                    colorScheme={this.props.colorScheme}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <AxisYLayer
                    x={this.props.width - AXISY_WIDTH}
                    y={0}
                    height={this.props.height}
                    xc={this.props.xc}
                    yc={this.yc}
                    tvar={this.props.tvar}
                    colorScheme={this.props.colorScheme}
                    font={this.props.axisFont}
                    chartUpdateTicker={this.props.updateEvent.chartUpdateTicker}
                />

                <CrosshairLayer
                    id={this.props.id}
                    xc={this.props.xc}
                    yc={this.yc}
                    width={this.props.width}
                    colorScheme={this.props.colorScheme}
                    font={this.props.axisFont}
                    valueAtTime={(time) => (this.props.tvar.getByTime(time) as Kline).volume}
                    mouseWho={this.props.updateEvent.xyMouse?.who}
                    mouseX={this.props.updateEvent.xyMouse?.x}
                    mouseY={this.props.updateEvent.xyMouse?.y}
                    crosshairUpdateTicker={this.props.updateEvent.crosshairUpdateTicker}
                    isCreateDrawing={this.props.updateDrawing && this.props.updateDrawing.createDrawingId !== undefined}
                />

            </g>
        )
    }
}
