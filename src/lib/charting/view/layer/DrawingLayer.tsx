import { forwardRef, Fragment, useImperativeHandle, useRef, useState, type JSX, type SetStateAction } from "react";
import { createDrawing } from "../../drawing/drawings";
import { Drawing } from "../../drawing/Drawing";
import type { ChartXControl } from "../ChartXControl";
import type { ChartYControl } from "../ChartYControl";
import type { CallbacksToContainer } from "../KlineViewContainer";

type DrawingLayerProps = {
    x: number;
    y: number;
    width: number;
    height: number;
    xc: ChartXControl;
    yc: ChartYControl;

    isHidingDrawing: boolean;
    createDrawingId: string;

    callback: CallbacksToContainer;

    chartUpdateTicker: number;
}

export type DrawingState = {
    selectedDrawing?: number;
    mouseDownHitDrawing?: number;
    mouseMoveHitDrawing?: number;
};

// Define the API you want to expose to the parent component
export interface DrawingLayerRef {
    deleteSelected: () => void;
    unselect: () => void;
}

const DEFAULT_CURSOR = "default"
const HANDLE_CURSOR = "pointer"
const GRAB_CURSOR = "grab"
const MOVE_CURSOR = "all-scroll" // 'move' doesn't work?

export const DrawingLayer = forwardRef<DrawingLayerRef, DrawingLayerProps>(({
    x, y, width, height, xc, yc, createDrawingId, isHidingDrawing, callback
}, ref) => {

    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [sketching, setSketching] = useState<Drawing>(undefined);
    const [cursor, setCursor] = useState(DEFAULT_CURSOR);

    // selectedDrawing, mouseMoveHitDrawing are used for rendering:
    const [selectedDrawing, setSelectedDrawingNative] = useState<number>(undefined);
    const [mouseMoveHitDrawing, setMouseMoveHitDrawingNative] = useState<number>(undefined);

    const mouseDownHitDrawing = useRef<number>(undefined);

    const creatingDrawing = useRef<Drawing>(undefined)
    const isDragging = useRef(false);

    const setSelectedDrawing = (valueOrUpdater: SetStateAction<number | undefined>) => {
        const newValue = typeof valueOrUpdater === 'function'
            ? valueOrUpdater(selectedDrawing)
            : valueOrUpdater;

        setSelectedDrawingNative(newValue);
        callback.updateDrawingState({ selectedDrawing: newValue })
    }

    const setMouseMoveHitDrawing = (valueOrUpdater: SetStateAction<number | undefined>) => {
        const newValue = typeof valueOrUpdater === 'function'
            ? valueOrUpdater(selectedDrawing)
            : valueOrUpdater;

        setMouseMoveHitDrawingNative(newValue);
        callback.updateDrawingState({ mouseMoveHitDrawing: newValue })
    }

    const setMouseDownHitDrawing = (idx: number) => {
        mouseDownHitDrawing.current = idx;
        callback.updateDrawingState({ mouseDownHitDrawing: idx })
    }

    const p = (x: number, y: number) => {
        return { time: xc.tx(x), value: yc.vy(y) }
    }

    // translate offset x, y to svg to x, y to this view
    const translate = (eOnWholeSVG: React.MouseEvent) => {
        return [
            eOnWholeSVG.nativeEvent.offsetX - x,
            eOnWholeSVG.nativeEvent.offsetY - y
        ]
    }


    const deleteSelectedDrawing = () => {
        // Use the functional update form. 'currentSelected' is guaranteed to be fresh.
        setSelectedDrawing(currentSelected => {
            if (currentSelected !== undefined) {
                // Update the drawings array using its own functional update
                setDrawings((currentDrawings) => [
                    ...currentDrawings.slice(0, currentSelected),
                    ...currentDrawings.slice(currentSelected + 1)
                ]);

                setMouseMoveHitDrawing(undefined);
                setMouseDownHitDrawing(undefined);

                return undefined;
            }

            return currentSelected; // Do nothing if nothing is selected
        });
    };

    const unselectDrawing = () => {
        setSelectedDrawing(_currentSelected => {
            return undefined;
        });
    }

    const onMouseDown = (e: React.MouseEvent) => {
        // console.log('mouse down', e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (creatingDrawing.current && creatingDrawing.current.isCompleted === false) {
            return;
        }

        isDragging.current = true;

        const [x, y] = translate(e)

        // select drawing ?
        const hitDrawingIdx = drawings.findIndex(drawing => drawing.hits(x, y))
        if (hitDrawingIdx >= 0) {
            // record the mouseDownHitDrawingIdx for dragging decision
            setMouseDownHitDrawing(hitDrawingIdx);

            const selectedOne = drawings[hitDrawingIdx]

            const handleIdx = selectedOne.getHandleIdxAt(x, y)
            if (handleIdx >= 0) {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // delete handle for variable-handle drawing
                    selectedOne.deleteHandleAt(handleIdx)

                    selectedOne.setCurrHandleIdx(-1);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(DEFAULT_CURSOR);

                } else {
                    // ready to drag handle 
                    selectedOne.setCurrHandleIdx(handleIdx);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(HANDLE_CURSOR);
                }

            } else {
                if (selectedOne.nHandles === undefined && e.ctrlKey) {
                    // insert handle for variable-handle drawing
                    const newHandleIdx = selectedOne.insertHandle(p(x, y))

                    selectedOne.setCurrHandleIdx(newHandleIdx);

                    setSelectedDrawing(hitDrawingIdx);

                    setCursor(HANDLE_CURSOR);

                } else {
                    // ready to drag whole drawing
                    selectedOne.recordHandlesWhenMousePressed(p(x, y))

                    selectedOne.setCurrHandleIdx(-1);

                    setSelectedDrawing(hitDrawingIdx);
                    setCursor(GRAB_CURSOR);
                }
            }

        } else {
            // not going to drag drawing (and handle), it's ok to drag any other things if you want

            setMouseDownHitDrawing(undefined)

            if (selectedDrawing !== undefined) {
                drawings[selectedDrawing].setCurrHandleIdx(-1);
            }
        }
    }

    const onMouseMove = (e: React.MouseEvent) => {
        // console.log('mouse move', e.nativeEvent.offsetX, e.nativeEvent.offsetY, createDrawing)
        const [x, y] = translate(e)

        if (creatingDrawing.current && creatingDrawing.current?.isCompleted === false) {
            if (creatingDrawing.current.isAnchored) {
                creatingDrawing.current.stretchCurrentHandle(p(x, y))

                // also reset mouseMoveHitDrawing to avoid render with handles during updateChart()
                setMouseMoveHitDrawing(undefined);

                if (selectedDrawing !== undefined) {
                    console.log("!!!!!!!!!!!!!!!!!!!!!, will you be here ????")
                    setSelectedDrawing(undefined);
                    setCursor(DEFAULT_CURSOR);

                } else {
                    setSketching(creatingDrawing.current);
                    setCursor(DEFAULT_CURSOR);
                }
            }

            return
        }

        if (isDragging.current) {
            if (selectedDrawing !== undefined && selectedDrawing === mouseDownHitDrawing.current) {
                const selectedOne = drawings[selectedDrawing]
                if (selectedOne.currHandleIdx >= 0) {
                    // drag handle
                    selectedOne.stretchCurrentHandle(p(x, y))

                } else {
                    // drag whole drawing
                    selectedOne.dragDrawing(p(x, y))
                }

                const cursor = selectedOne.currHandleIdx >= 0
                    ? HANDLE_CURSOR
                    : GRAB_CURSOR

                setCursor(cursor);

            } else {
                setCursor(MOVE_CURSOR);
            }

        } else {
            // process drawing is hit by mouse
            const hitDrawingIdx = drawings.findIndex(drawing => drawing.hits(x, y))
            if (hitDrawingIdx >= 0) {
                // show with handles 
                setMouseMoveHitDrawing(hitDrawingIdx)
                const hitOne = drawings[hitDrawingIdx]

                const handleIdx = hitOne.getHandleIdxAt(x, y)
                const cursor = handleIdx >= 0
                    ? HANDLE_CURSOR
                    : e.ctrlKey ? HANDLE_CURSOR : GRAB_CURSOR
                // ctrl + move means going to insert handle for variable-handle drawing, use HANDLE_CURSOR

                setCursor(cursor);

            } else {
                // previously drawing marked hit? show without handles if it's not the selected one
                if (mouseMoveHitDrawing >= 0 /* && mouseMoveHitDrawingIdx !== selectedDrawing */) {
                    setMouseMoveHitDrawing(undefined);

                    setCursor(DEFAULT_CURSOR);

                } else {
                    setCursor(DEFAULT_CURSOR);
                }

            }
        }
    }

    // simulate single click only
    const onMouseUp = (e: React.MouseEvent) => {
        // console.log('mouse up', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        isDragging.current = false

        if (e.detail === 2) {
            return
        }

        const [x, y] = translate(e)

        if (creatingDrawing.current === undefined) {
            if (createDrawingId) {
                creatingDrawing.current = createDrawing(createDrawingId, xc, yc);
            }
        }

        const creating = creatingDrawing.current;

        if (creating && creating.isCompleted === false) {
            // completing new drawing
            const isCompleted = creating.anchorHandle(p(x, y))

            if (isCompleted || e.ctrlKey) {
                // is it a variable-handle drawing and ctrl + clicked? complete it 
                if (creating.nHandles === undefined && e.ctrlKey) {
                    creating.setIsCompleted(true);
                    creating.setIsAnchored(false);
                    creating.setCurrHandleIdx(-1);
                    // drop pre-created next handle, see anchorHandle(...)
                    creating.handles.pop()
                }

                const newDrawings = [...drawings, creating];
                setDrawings(newDrawings);

                callback.resetDrawingIdsToCreate();

                creatingDrawing.current = undefined;

                // set it as new selected one
                setSelectedDrawing(newDrawings.length - 1);

                setSketching(undefined);
            }
        }
    }

    const onMouseDoubleClick = (e: React.MouseEvent) => {
        //console.log('mouse doule clicked', e.detail, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
        if (e.detail === 2) {
            const [x, y] = translate(e)
        }
    }

    // Expose the internal functions to the parent via the ref
    useImperativeHandle(ref, () => ({
        deleteSelected: () => deleteSelectedDrawing(),
        unselect: () => unselectDrawing()
    }));

    const drawingLines = drawings.map((drawing, n) => selectedDrawing === n || mouseMoveHitDrawing === n
        ? drawing.renderDrawingWithHandles("drawing-" + n)
        : drawing.renderDrawing("drawing-" + n))

    const sketchingLines = sketching
        ? sketching.renderDrawingWithHandles("sketching")
        : <></>

    // console.log("DrawingLayer Render Cycle! Selected is now:", selectedDrawing, mouseMoveHitDrawing);

    return (
        <g
            onDoubleClick={onMouseDoubleClick}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            cursor={cursor}
        >
            {/* Invisible background to capture clicks in empty space */}
            <rect width={width} height={height} fill="transparent" pointerEvents="all" />

            {isHidingDrawing
                ? <></>
                : drawingLines?.map((c, n) => <Fragment key={n}>{c}</Fragment>)
            }
            {sketchingLines}
        </g>
    );
})
