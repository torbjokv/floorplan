/**
 * Geometry utilities for calculating composite room outlines.
 *
 * This module provides functions to compute the outer boundary of a composite room
 * (a room with parts) by finding edges that are not shared between adjacent rectangles.
 * The result is an SVG path that traces only the external boundary.
 */

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  depth: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A directed edge segment. Direction matters for determining inside/outside.
 * Edges are oriented so the "inside" of the shape is to the right of the edge direction.
 */
interface DirectedEdge {
  start: Point;
  end: Point;
  // Is this a horizontal or vertical edge?
  isHorizontal: boolean;
  // The fixed coordinate (x for vertical, y for horizontal)
  fixedCoord: number;
}

/**
 * Creates a unique key for a line (infinite line that an edge lies on).
 * Used to group colinear edges for overlap detection.
 */
function createLineKey(isHorizontal: boolean, fixedCoord: number): string {
  return `${isHorizontal ? 'H' : 'V'}:${fixedCoord}`;
}

/**
 * Generate the 4 directed edges of a rectangle.
 * Edges are oriented clockwise, so the interior is to the right.
 */
function rectangleToEdges(rect: Rectangle): DirectedEdge[] {
  const { x, y, width, depth } = rect;
  const right = x + width;
  const bottom = y + depth;

  return [
    // Top edge: left to right
    {
      start: { x, y },
      end: { x: right, y },
      isHorizontal: true,
      fixedCoord: y,
    },
    // Right edge: top to bottom
    {
      start: { x: right, y },
      end: { x: right, y: bottom },
      isHorizontal: false,
      fixedCoord: right,
    },
    // Bottom edge: right to left
    {
      start: { x: right, y: bottom },
      end: { x, y: bottom },
      isHorizontal: true,
      fixedCoord: bottom,
    },
    // Left edge: bottom to top
    {
      start: { x, y: bottom },
      end: { x, y },
      isHorizontal: false,
      fixedCoord: x,
    },
  ];
}

/**
 * Represents a segment on a 1D line with a direction.
 */
interface Segment1D {
  min: number;
  max: number;
  direction: 1 | -1; // +1 for min->max, -1 for max->min
}

/**
 * Convert a directed edge to a 1D segment along its line.
 */
function edgeToSegment1D(edge: DirectedEdge): Segment1D {
  if (edge.isHorizontal) {
    const min = Math.min(edge.start.x, edge.end.x);
    const max = Math.max(edge.start.x, edge.end.x);
    const direction: 1 | -1 = edge.start.x < edge.end.x ? 1 : -1;
    return { min, max, direction };
  } else {
    const min = Math.min(edge.start.y, edge.end.y);
    const max = Math.max(edge.start.y, edge.end.y);
    const direction: 1 | -1 = edge.start.y < edge.end.y ? 1 : -1;
    return { min, max, direction };
  }
}

/**
 * Convert a 1D segment back to a directed edge.
 */
function segment1DToEdge(seg: Segment1D, isHorizontal: boolean, fixedCoord: number): DirectedEdge {
  if (isHorizontal) {
    const startX = seg.direction === 1 ? seg.min : seg.max;
    const endX = seg.direction === 1 ? seg.max : seg.min;
    return {
      start: { x: startX, y: fixedCoord },
      end: { x: endX, y: fixedCoord },
      isHorizontal: true,
      fixedCoord,
    };
  } else {
    const startY = seg.direction === 1 ? seg.min : seg.max;
    const endY = seg.direction === 1 ? seg.max : seg.min;
    return {
      start: { x: fixedCoord, y: startY },
      end: { x: fixedCoord, y: endY },
      isHorizontal: false,
      fixedCoord,
    };
  }
}

/**
 * Process colinear segments to find non-overlapping portions.
 *
 * When two rectangles share an edge, one will have the edge going in one direction
 * and the other in the opposite direction. These cancel out.
 *
 * Algorithm:
 * 1. Collect all unique positions (start and end points of segments)
 * 2. For each interval between consecutive positions, sum up the direction
 *    contributions from all segments that cover that interval
 * 3. If the net direction is non-zero, output a segment for that interval
 */
function processColinearSegments(segments: Segment1D[]): Segment1D[] {
  if (segments.length === 0) return [];

  // Collect all unique positions
  const positions = new Set<number>();
  for (const seg of segments) {
    positions.add(seg.min);
    positions.add(seg.max);
  }

  // Sort positions
  const sortedPositions = Array.from(positions).sort((a, b) => a - b);

  // For each interval, calculate the net direction
  const result: Segment1D[] = [];

  for (let i = 0; i < sortedPositions.length - 1; i++) {
    const intervalStart = sortedPositions[i];
    const intervalEnd = sortedPositions[i + 1];

    // Sum up directions of all segments that cover this interval
    let netDirection = 0;
    for (const seg of segments) {
      if (seg.min <= intervalStart && seg.max >= intervalEnd) {
        netDirection += seg.direction;
      }
    }

    // If net direction is non-zero, we have a visible edge in this interval
    if (netDirection !== 0) {
      const direction: 1 | -1 = netDirection > 0 ? 1 : -1;

      // Try to merge with the previous segment if directions match
      if (result.length > 0) {
        const prev = result[result.length - 1];
        if (prev.max === intervalStart && prev.direction === direction) {
          prev.max = intervalEnd;
          continue;
        }
      }

      result.push({
        min: intervalStart,
        max: intervalEnd,
        direction,
      });
    }
  }

  return result;
}

/**
 * Remove internal (shared) edges from a collection of edges.
 * Returns only the edges that form the outer boundary.
 */
function removeInternalEdges(allEdges: DirectedEdge[]): DirectedEdge[] {
  // Group edges by their line
  const edgesByLine = new Map<string, DirectedEdge[]>();

  for (const edge of allEdges) {
    const lineKey = createLineKey(edge.isHorizontal, edge.fixedCoord);
    const group = edgesByLine.get(lineKey) || [];
    group.push(edge);
    edgesByLine.set(lineKey, group);
  }

  // Process each group to remove overlapping opposite-direction segments
  const resultEdges: DirectedEdge[] = [];

  for (const [, edges] of edgesByLine) {
    if (edges.length === 0) continue;

    const { isHorizontal, fixedCoord } = edges[0];
    const segments = edges.map(edgeToSegment1D);
    const remainingSegments = processColinearSegments(segments);

    for (const seg of remainingSegments) {
      resultEdges.push(segment1DToEdge(seg, isHorizontal, fixedCoord));
    }
  }

  return resultEdges;
}

/**
 * Connect edges into a closed polygon by following end-to-start connections.
 * Returns an array of points forming the polygon outline.
 */
function connectEdgesToPolygon(edges: DirectedEdge[]): Point[] {
  if (edges.length === 0) return [];

  // Build a map from start point to edge
  const edgeMap = new Map<string, DirectedEdge>();
  for (const edge of edges) {
    const key = `${edge.start.x},${edge.start.y}`;
    edgeMap.set(key, edge);
  }

  // Start from the first edge and follow the chain
  const points: Point[] = [];
  const startEdge = edges[0];
  let currentEdge: DirectedEdge | undefined = startEdge;
  const visited = new Set<string>();

  while (currentEdge) {
    const key = `${currentEdge.start.x},${currentEdge.start.y}`;
    if (visited.has(key)) break; // Completed the loop
    visited.add(key);

    points.push(currentEdge.start);

    // Find the next edge that starts where this one ends
    const nextKey = `${currentEdge.end.x},${currentEdge.end.y}`;
    currentEdge = edgeMap.get(nextKey);
  }

  return points;
}

/**
 * Generate an SVG path string from a polygon.
 * @param points Array of points forming the polygon
 * @param scale Function to convert coordinates (mm to pixels)
 */
export function polygonToSvgPath(points: Point[], scale: (v: number) => number): string {
  if (points.length === 0) return '';

  const commands: string[] = [];
  const first = points[0];
  commands.push(`M ${scale(first.x)} ${scale(first.y)}`);

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    commands.push(`L ${scale(p.x)} ${scale(p.y)}`);
  }

  commands.push('Z');
  return commands.join(' ');
}

/**
 * Calculate the outer boundary polygon for a composite room.
 *
 * @param rectangles Array of rectangles (main room + parts)
 * @returns Array of points forming the outer boundary polygon
 */
export function calculateCompositeRoomOutline(rectangles: Rectangle[]): Point[] {
  if (rectangles.length === 0) return [];

  // Collect all edges from all rectangles
  const allEdges: DirectedEdge[] = [];
  for (const rect of rectangles) {
    allEdges.push(...rectangleToEdges(rect));
  }

  // Remove internal edges (shared between adjacent rectangles)
  const outerEdges = removeInternalEdges(allEdges);

  // Connect edges into a polygon
  return connectEdgesToPolygon(outerEdges);
}

/**
 * Calculate clickable regions for each part of a composite room.
 * These are used for individual part selection without showing internal borders.
 *
 * @param mainRoom The main room rectangle
 * @param parts Array of part rectangles
 * @param scale Function to convert coordinates
 * @returns Array of SVG path data for each rectangle (main room first, then parts)
 */
export function calculatePartRegions(
  mainRoom: Rectangle,
  parts: Rectangle[],
  scale: (v: number) => number
): string[] {
  const allRects = [mainRoom, ...parts];
  return allRects.map(rect => {
    const { x, y, width, depth } = rect;
    return `M ${scale(x)} ${scale(y)} L ${scale(x + width)} ${scale(y)} L ${scale(x + width)} ${scale(y + depth)} L ${scale(x)} ${scale(y + depth)} Z`;
  });
}

/**
 * Get the bounding box of a composite room.
 */
export function getCompositeBounds(rectangles: Rectangle[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  depth: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rectangles) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.depth);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    depth: maxY - minY,
  };
}
