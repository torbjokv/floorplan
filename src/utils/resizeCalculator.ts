import type { Anchor } from '../types';

const MIN_SIZE = 100;

export type ObjectType = 'circle' | 'square';

export interface ResizeInput {
  corner: Anchor;
  deltaX: number;
  deltaY: number;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  objectType: ObjectType;
  anchor: Anchor;
}

export interface ResizeResult {
  width: number;
  height: number | undefined;
  x: number;
  y: number;
}

/**
 * Calculate new dimensions and position after a resize operation.
 * Works for any object type - the opposite corner of the bounding box stays fixed.
 */
export function calculateResize(input: ResizeInput): ResizeResult {
  const { corner, deltaX, deltaY, startWidth, startHeight, startX, startY, objectType, anchor } =
    input;

  // Calculate raw dimension changes based on corner being dragged
  const dimensionDeltas = getDimensionDeltas(corner, deltaX, deltaY);

  // Apply object-type specific logic
  let newWidth: number;
  let newHeight: number;

  if (objectType === 'circle') {
    // Circles resize proportionally - use average of width/height deltas
    const deltaSize = (dimensionDeltas.deltaWidth + dimensionDeltas.deltaHeight) / 2;
    newWidth = Math.max(MIN_SIZE, Math.round(startWidth + deltaSize));
    newHeight = newWidth;
  } else {
    // Squares (rectangles) resize independently
    newWidth = Math.max(MIN_SIZE, Math.round(startWidth + dimensionDeltas.deltaWidth));
    newHeight = Math.max(MIN_SIZE, Math.round(startHeight + dimensionDeltas.deltaHeight));
  }

  // Calculate position adjustments to keep opposite corner fixed
  const widthDiff = newWidth - startWidth;
  const heightDiff = newHeight - startHeight;
  const positionAdjust = getPositionAdjustment(corner, anchor, widthDiff, heightDiff, objectType);

  return {
    width: newWidth,
    height: objectType === 'circle' ? undefined : newHeight,
    x: startX + positionAdjust.x,
    y: startY + positionAdjust.y,
  };
}

/**
 * Get dimension changes based on which corner is being dragged.
 * Dragging towards bottom-right increases size, towards top-left decreases.
 */
function getDimensionDeltas(
  corner: Anchor,
  deltaX: number,
  deltaY: number
): { deltaWidth: number; deltaHeight: number } {
  switch (corner) {
    case 'bottom-right':
      // Dragging right increases width, dragging down increases height
      return { deltaWidth: deltaX, deltaHeight: deltaY };
    case 'bottom-left':
      // Dragging left increases width, dragging down increases height
      return { deltaWidth: -deltaX, deltaHeight: deltaY };
    case 'top-right':
      // Dragging right increases width, dragging up increases height
      return { deltaWidth: deltaX, deltaHeight: -deltaY };
    case 'top-left':
      // Dragging left increases width, dragging up increases height
      return { deltaWidth: -deltaX, deltaHeight: -deltaY };
  }
}

/**
 * Calculate position adjustment needed to keep the opposite corner visually fixed.
 * For circles: Simple logic based only on which corner is dragged (assumes top-left anchor)
 * For squares: Anchor-aware logic that accounts for the object's anchor point
 */
function getPositionAdjustment(
  corner: Anchor,
  anchor: Anchor,
  widthDiff: number,
  heightDiff: number,
  objectType: ObjectType
): { x: number; y: number } {
  // Determine which edges the dragged corner affects
  const draggingLeft = corner === 'top-left' || corner === 'bottom-left';
  const draggingTop = corner === 'top-left' || corner === 'top-right';

  if (objectType === 'circle') {
    // Circles use simple logic: only adjust position when dragging left/top edges
    // This keeps the opposite corner (bottom-right when dragging top-left, etc.) fixed
    return {
      x: draggingLeft ? -widthDiff : 0,
      y: draggingTop ? -heightDiff : 0,
    };
  }

  // Squares use anchor-aware logic
  const anchorOnLeft = anchor === 'top-left' || anchor === 'bottom-left';
  const anchorOnTop = anchor === 'top-left' || anchor === 'top-right';

  let adjustX = 0;
  let adjustY = 0;

  // X adjustment:
  // - If dragging a left corner, the right edge should stay fixed
  //   - If anchor is on left, we need to move x by -widthDiff (anchor moves with left edge)
  // - If dragging a right corner, the left edge should stay fixed
  //   - If anchor is on right, we need to move x by +widthDiff (anchor moves with right edge)
  if (draggingLeft) {
    if (anchorOnLeft) {
      adjustX = -widthDiff;
    }
  } else {
    if (!anchorOnLeft) {
      adjustX = widthDiff;
    }
  }

  // Y adjustment (same logic for vertical)
  if (draggingTop) {
    if (anchorOnTop) {
      adjustY = -heightDiff;
    }
  } else {
    if (!anchorOnTop) {
      adjustY = heightDiff;
    }
  }

  return { x: adjustX, y: adjustY };
}
