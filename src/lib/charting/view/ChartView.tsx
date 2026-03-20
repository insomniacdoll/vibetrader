import { TVar } from "../../timeseris/TVar";
import { ChartXControl } from "./ChartXControl";
import { ChartYControl } from "./ChartYControl";
import { Component, type JSX, type RefObject } from "react";

import type { Drawing, TPoint } from "../drawing/Drawing";
import { createDrawing } from "../drawing/Drawings";
import { type Selection } from "@react-spectrum/s2"
import React from "react";

import type { PlotOptions } from "../plot/Plot";
import type { PineData } from "../../domain/PineData";
import type { ColorScheme } from "../../../App";

export type UpdateEvent = {
    chartTicker?: number,
    crosshairTicker?: number,

    xyMouse?: { who: string, x: number, y: number }
    deltaMouse?: { dx: number, dy: number }
    yScalar?: boolean
}

export type Indicator = {
    scriptName: string,
    tvar: TVar<PineData[]>,
    outputs: Output[],
    overlay?: boolean
}

export type Output = {
    atIndex: number,
    title: string,
    options: PlotOptions
}

export type UpdateDrawing = {
    action?: 'create' | 'delete' | 'hide' | 'unselect'
    createDrawingId?: string
    isHidingDrawing: boolean;
}

export interface ViewProps {
    name: string;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    tvar: TVar<unknown>;
    colorScheme: ColorScheme;

    updateEvent: UpdateEvent;
    updateDrawing?: UpdateDrawing;

    // for indicator chart view's main indicator outputs
    mainIndicatorOutputs?: Output[]

    overlayIndicators?: Indicator[];

    callbacksToContainer?: CallbacksToContainer;
}

export interface ViewState {
    mouseCrosshair?: JSX.Element
    referCrosshair?: JSX.Element
}

export type ChartElements = {

    drawingLines?: JSX.Element[];

    sketching?: JSX.Element

    cursor?: string;

}

export type Crosshairs = {
    mouseCrosshair?: JSX.Element;
    referCrosshair?: JSX.Element;
}

export type CallbacksToContainer = {
    updateDrawingIdsToCreate: (ids?: Selection) => void;
}

const DEFAULT_CURSOR = "default"
const HANDLE_CURSOR = "pointer"
const GRAB_CURSOR = "grab"
const MOVE_CURSOR = "all-scroll" // 'move' doesn't work?

/**
 * All ChartViews shares the same x-control, have the same cursor behaves.
 *
 */
export abstract class ChartView<P extends ViewProps, S extends ViewState> extends Component<P, S> {
    protected prevProps: P;

    protected chartElements: ChartElements = {};
    protected crosshairs: Crosshairs = {};

    static readonly AXISY_WIDTH = 55
    static readonly CONTROL_HEIGHT = 12
    static readonly TITLE_HEIGHT_PER_LINE = 14

    yc: ChartYControl;

    ref: RefObject<SVGAElement>;
    font: string;


    // share same xc through all views that are in the same viewcontainer.
    constructor(props: P) {
        super(props)

        this.yc = new ChartYControl(props.xc.baseSer, props.height);

        this.ref = React.createRef();

        this.onDrawingMouseDoubleClick = this.onDrawingMouseDoubleClick.bind(this)
        this.onDrawingMouseDown = this.onDrawingMouseDown.bind(this)
        this.onDrawingMouseMove = this.onDrawingMouseMove.bind(this)
        this.onDrawingMouseUp = this.onDrawingMouseUp.bind(this)

        console.log(`ChartView created`)
    }

    /**
     * What may affect the geometry:
     * 1. the size of this component changed;
     * 3. the ser's value changed or items added, which need computeMaxMin();
     *
     * The control only define wBar (the width of each bar), this component
     * will calculate number of bars according to its size. If you need more
     * bars to display, such as an appointed newNBars, you should compute the size of
     * this's container, and call container.setBounds() to proper size, then, the
     * layout manager will layout the size of its ChartView instances automatically,
     * and if success, the newNBars computed here will equals the newNBars you want.
     */
    protected computeGeometry(atleastMinValue?: number) {
        const [maxValue, minValue] = this.computeMaxValueMinValue();

        // compute y-geometry according to maxmin
        this.yc.computeGeometry(maxValue, atleastMinValue !== undefined ? Math.min(minValue, atleastMinValue) : minValue)
    }

    wChart(): number {
        return this.props.width - ChartView.AXISY_WIDTH;
    }

    computeMaxValueMinValue() {
        // if no need maxValue/minValue, don't let them all equal 0, just set to 1 and 0 
        return [1, 0];
    }

    // return `value !== undefined` to show cursor value of time
    abstract valueAtTime(time: number): number

    abstract plot(): Pick<ChartElements, "drawingLines">;

    checkUpdate() {
        if (this.prevProps === undefined) {
            this.chartElements = this.plot();

            this.prevProps = this.props;
            return
        }

        let willUpdateChart = false

        if (this.props.updateEvent.chartTicker != this.prevProps.updateEvent.chartTicker) {
            willUpdateChart = true;
        }

        if (this.props.updateDrawing != this.prevProps.updateDrawing) {
            if (this.props.updateDrawing) {
                switch (this.props.updateDrawing.action) {
                    case 'delete':
                        this.deleteSelectedDrawing()
                        break;

                    case 'unselect':
                        this.unselectDrawing();
                        break;
                }
            }
        }

        if (willUpdateChart) {
            this.update(willUpdateChart)
        }

        this.prevProps = this.props;
    }

    protected update(
        willUpdateChart: boolean,
    ) {

        if (willUpdateChart) {
            const { drawingLines } = this.plot();
            this.chartElements = { ...this.chartElements, drawingLines }
        }
    }

    // translate offset x, y to svg to x, y to this view
    protected translate(eOnWholeSVG: React.MouseEvent) {
        return [
            eOnWholeSVG.nativeEvent.offsetX - this.props.x,
            eOnWholeSVG.nativeEvent.offsetY - this.props.y
        ]
    }

    override componentDidMount(): void {
        if (this.ref.current) {
            const computedStyle = window.getComputedStyle(this.ref.current);
            const fontSize = computedStyle.getPropertyValue('font-size');
            const fontFamily = computedStyle.getPropertyValue('font-family');

            this.font = fontSize + ' ' + fontFamily;
        }
    }

    // --- drawing ---

    drawings: Drawing[] = []
    creatingDrawing: Drawing
    isDragging: boolean

    protected plotDrawings() {
        return this.drawings.map((drawing, n) => this.props.xc.selectedDrawingIdx === n || this.props.xc.mouseMoveHitDrawingIdx === n
            ? drawing.renderDrawingWithHandles("drawing-" + n)
            : drawing.renderDrawing("drawing-" + n))
    }

    protected deleteSelectedDrawing() {
        const idx = this.props.xc.selectedDrawingIdx;
        if (idx !== undefined) {
            const drawingLines = [
                ...this.chartElements.drawingLines.slice(0, idx),
                ...this.chartElements.drawingLines.slice(idx + 1)
            ];

            const drawings = [
                ...this.drawings.slice(0, idx),
                ...this.drawings.slice(idx + 1)
            ]

            // should also clear hitDrawingIdx
            this.props.xc.selectedDrawingIdx = undefined
            this.props.xc.mouseMoveHitDrawingIdx = undefined

            this.drawings = drawings

            this.chartElements.drawingLines = drawingLines
        }
    }

    protected unselectDrawing(cursor?: string) {
        if (this.props.xc.selectedDrawingIdx !== undefined) {
            this.updateDrawingsWithoutHandles(this.props.xc.selectedDrawingIdx, cursor)
            this.props.xc.selectedDrawingIdx = undefined
        }
    }

    private selectAndUpdateDrawings(idx: number, cursor?: string) {
        let drawingLines = this.chartElements.drawingLines
        const prevSelectedIdx = this.props.xc.selectedDrawingIdx
        if (prevSelectedIdx !== undefined && prevSelectedIdx !== idx) {
            // there is a different prev selected, unselect at the same time 
            const unselected = this.drawings[prevSelectedIdx].renderDrawing("drawing-" + prevSelectedIdx)

            drawingLines = [
                ...drawingLines.slice(0, prevSelectedIdx),
                unselected,
                ...drawingLines.slice(prevSelectedIdx + 1)
            ];
        }

        const selected = this.drawings[idx].renderDrawingWithHandles("drawing-" + idx)
        drawingLines = [
            ...drawingLines.slice(0, idx),
            selected,
            ...drawingLines.slice(idx + 1)
        ];

        this.props.xc.selectedDrawingIdx = idx

        this.chartElements = { ...this.chartElements, drawingLines, cursor }
    }

    private updateDrawingsWithHandles(idxToAddHandles: number, cursor?: string) {
        const selected = this.drawings[idxToAddHandles].renderDrawingWithHandles("drawing-" + idxToAddHandles)
        let drawingLines = this.chartElements.drawingLines
        drawingLines = [
            ...drawingLines.slice(0, idxToAddHandles),
            selected,
            ...drawingLines.slice(idxToAddHandles + 1)
        ];

        this.chartElements = { ...this.chartElements, drawingLines, cursor }
    }

    private updateDrawingsWithoutHandles(idxToRemoveHandles: number, cursor?: string) {
        const unselected = this.drawings[idxToRemoveHandles].renderDrawing("drawing-" + idxToRemoveHandles)
        const drawingLines = [
            ...this.chartElements.drawingLines.slice(0, idxToRemoveHandles),
            unselected,
            ...this.chartElements.drawingLines.slice(idxToRemoveHandles + 1)
        ];

        this.chartElements = { ...this.chartElements, drawingLines, cursor }
    }

    private p(x: number, y: number): TPoint {
        return { time: this.props.xc.tx(x), value: this.yc.vy(y) }
    }

    onDrawingMouseDown(e: React.MouseEvent) {
        // console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        this.isDragging = true;

        const [x, y] = this.translate(e)

        // select drawing ?
        const hitDrawingIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
        if (hitDrawingIdx >= 0) {
            // record the mouseDownHitDrawingIdx for dragging decision
            this.props.xc.mouseDownHitDrawingIdx = hitDrawingIdx

            const selectedOne = this.drawings[hitDrawingIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // delete handle for variable-handle drawing
                    selectedOne.deleteHandleAt(handleIdx)

                    selectedOne.currHandleIdx = -1
                    this.selectAndUpdateDrawings(hitDrawingIdx, DEFAULT_CURSOR)

                } else {
                    // ready to drag handle 
                    selectedOne.currHandleIdx = handleIdx
                    this.selectAndUpdateDrawings(hitDrawingIdx, HANDLE_CURSOR)
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // insert handle for variable-handle drawing
                    const newHandleIdx = selectedOne.insertHandle(this.p(x, y))

                    selectedOne.currHandleIdx = newHandleIdx;
                    this.selectAndUpdateDrawings(hitDrawingIdx, HANDLE_CURSOR)

                } else {
                    // ready to drag whole drawing
                    selectedOne.recordHandlesWhenMousePressed(this.p(x, y))

                    selectedOne.currHandleIdx = -1
                    this.selectAndUpdateDrawings(hitDrawingIdx, GRAB_CURSOR)
                }
            }

        } else {
            // not going to drag drawing (and handle), it's ok to drag any other things if you want

            this.props.xc.mouseDownHitDrawingIdx = undefined

            if (this.props.xc.selectedDrawingIdx !== undefined) {
                this.drawings[this.props.xc.selectedDrawingIdx].currHandleIdx = -1
            }
        }
    }

    onDrawingMouseMove(e: React.MouseEvent) {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.target)
        const [x, y] = this.translate(e)

        if (this.creatingDrawing?.isCompleted === false) {
            if (this.creatingDrawing.isAnchored) {
                const sketching = this.creatingDrawing.stretchCurrentHandle(this.p(x, y))

                // also reset mouseMoveHitDrawing to avoid render with handles during updateChart()
                this.props.xc.mouseMoveHitDrawingIdx = undefined

                const prevSelected = this.props.xc.selectedDrawingIdx
                if (prevSelected !== undefined) {
                    // unselect prevSelected at the same time 
                    const toUnselect = this.drawings[prevSelected].renderDrawing("drawing-" + prevSelected)

                    const drawingLines = [
                        ...this.chartElements.drawingLines.slice(0, prevSelected),
                        toUnselect,
                        ...this.chartElements.drawingLines.slice(prevSelected + 1)
                    ];

                    this.props.xc.selectedDrawingIdx = undefined

                    this.chartElements.drawingLines = drawingLines;
                    this.chartElements.cursor = DEFAULT_CURSOR;

                } else {
                    this.chartElements.sketching = sketching;
                    this.chartElements.cursor = DEFAULT_CURSOR;
                }
            }

            return
        }

        if (this.isDragging) {
            if (this.props.xc.selectedDrawingIdx !== undefined &&
                this.props.xc.selectedDrawingIdx === this.props.xc.mouseDownHitDrawingIdx
            ) {
                const selectedOne = this.drawings[this.props.xc.selectedDrawingIdx]
                if (selectedOne.currHandleIdx >= 0) {
                    // drag handle
                    selectedOne.stretchCurrentHandle(this.p(x, y))

                } else {
                    // drag whole drawing
                    selectedOne.dragDrawing(this.p(x, y))
                }

                const cursor = selectedOne.currHandleIdx >= 0
                    ? HANDLE_CURSOR
                    : GRAB_CURSOR

                this.updateDrawingsWithHandles(this.props.xc.selectedDrawingIdx, cursor)

            } else {
                this.chartElements.cursor = MOVE_CURSOR;
            }

        } else {
            // process hit drawing
            const hitDrawingIdx = this.drawings.findIndex(drawing => drawing.hits(x, y))
            if (hitDrawingIdx >= 0) {
                // show with handles 
                this.props.xc.mouseMoveHitDrawingIdx = hitDrawingIdx
                const hitOne = this.drawings[hitDrawingIdx]

                const handleIdx = hitOne.getHandleIdxAt(x, y)
                const cursor = handleIdx >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey ? HANDLE_CURSOR : GRAB_CURSOR
                // ctrl + move means going to insert handle for variable-handle drawing, use HANDLE_CURSOR

                this.updateDrawingsWithHandles(hitDrawingIdx, cursor)

            } else {
                // previously hit drawing? show without handles if it's not the selected one
                if (this.props.xc.mouseMoveHitDrawingIdx >= 0 &&
                    this.props.xc.mouseMoveHitDrawingIdx !== this.props.xc.selectedDrawingIdx
                ) {
                    const tobeWithoutHandles = this.props.xc.mouseMoveHitDrawingIdx
                    this.props.xc.mouseMoveHitDrawingIdx = undefined

                    this.updateDrawingsWithoutHandles(tobeWithoutHandles, DEFAULT_CURSOR)

                } else {
                    this.chartElements.cursor = DEFAULT_CURSOR;
                }

            }
        }
    }

    // simulate single click only
    onDrawingMouseUp(e: React.MouseEvent) {
        // console.log('mouse up', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        this.isDragging = false

        if (e.detail === 2) {
            return
        }

        const [x, y] = this.translate(e)

        if (this.creatingDrawing === undefined) {
            if (this.props.updateDrawing.createDrawingId) {
                this.creatingDrawing = createDrawing(this.props.updateDrawing.createDrawingId, this.props.xc, this.yc)
            }
        }

        if (this.creatingDrawing?.isCompleted === false) {
            // completing new drawing
            const isCompleted = this.creatingDrawing.anchorHandle(this.p(x, y))

            if (isCompleted || e.ctrlKey) {
                // is it a variable-handle drawing and ctrl + clicked? complete it 
                if (this.creatingDrawing.nHandles === undefined && e.ctrlKey) {
                    this.creatingDrawing.isCompleted = true;
                    this.creatingDrawing.isAnchored = false;
                    this.creatingDrawing.currHandleIdx = -1;
                    // drop pre-created next handle, see anchorHandle(...)
                    this.creatingDrawing.handles.pop()
                }

                this.drawings.push(this.creatingDrawing)
                this.props.callbacksToContainer.updateDrawingIdsToCreate(undefined)

                const drawingLine = this.creatingDrawing.renderDrawingWithHandles("drawing-new")
                this.creatingDrawing = undefined

                let drawingLines: JSX.Element[]
                const prevSelected = this.props.xc.selectedDrawingIdx
                if (prevSelected !== undefined) {
                    // unselect it at the same time 
                    const toUnselect = this.drawings[prevSelected].renderDrawing("drawing-" + prevSelected)

                    drawingLines = [
                        ...this.chartElements.drawingLines.slice(0, prevSelected),
                        toUnselect,
                        ...this.chartElements.drawingLines.slice(prevSelected + 1),
                        drawingLine];

                } else {
                    drawingLines = [
                        ...this.chartElements.drawingLines,
                        drawingLine];
                }

                // set it as new selected one
                this.props.xc.selectedDrawingIdx = this.drawings.length - 1;

                this.chartElements.sketching = undefined;
            }
        }
    }


    onDrawingMouseDoubleClick(e: React.MouseEvent) {
        //console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            const [x, y] = this.translate(e)
        }
    }
}

