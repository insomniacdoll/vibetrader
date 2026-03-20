import { Fragment, memo, type JSX } from "react";

type DrawingLayerProps = {
    drawingLines: JSX.Element[];
    sketching: JSX.Element;
    isHidingDrawing: boolean;
    updateChart: number;
}

export const DrawingLayer = memo(function Layer({ drawingLines, sketching, isHidingDrawing }: DrawingLayerProps) {
    this.drawings.map((drawing, n) => this.props.xc.selectedDrawingIdx === n || this.props.xc.mouseMoveHitDrawingIdx === n
        ? drawing.renderDrawingWithHandles("drawing-" + n)
        : drawing.renderDrawing("drawing-" + n))

    return (
        <g>
            {isHidingDrawing
                ? <></>
                : drawingLines?.map((c, n) => <Fragment key={n}>{c}</Fragment>)
            }
            {sketching}
        </g>
    );
})
