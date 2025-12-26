import { describe, it, expect } from 'vitest';
import {
  calculateCompositeRoomOutline,
  polygonToSvgPath,
  getCompositeBounds,
  type Rectangle,
} from '../../../src/geometry/CompositeRoomGeometry';

describe('CompositeRoomGeometry', () => {
  describe('calculateCompositeRoomOutline', () => {
    it('returns a rectangle outline for a single rectangle', () => {
      const rectangles: Rectangle[] = [{ x: 0, y: 0, width: 100, depth: 50 }];

      const outline = calculateCompositeRoomOutline(rectangles);

      // Should have 4 points for a rectangle
      expect(outline).toHaveLength(4);
      // Check that the outline covers the correct area
      const xs = outline.map(p => p.x);
      const ys = outline.map(p => p.y);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(100);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(50);
    });

    it('handles two horizontally adjacent rectangles (L-shape)', () => {
      // Two rectangles side by side:
      // [A][B]
      const rectangles: Rectangle[] = [
        { x: 0, y: 0, width: 100, depth: 50 },
        { x: 100, y: 0, width: 100, depth: 50 },
      ];

      const outline = calculateCompositeRoomOutline(rectangles);

      // Should form a larger rectangle, so 4 points
      expect(outline).toHaveLength(4);
      // Check bounds
      const xs = outline.map(p => p.x);
      const ys = outline.map(p => p.y);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(200);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(50);
    });

    it('handles two vertically adjacent rectangles', () => {
      // Two rectangles stacked:
      // [A]
      // [B]
      const rectangles: Rectangle[] = [
        { x: 0, y: 0, width: 100, depth: 50 },
        { x: 0, y: 50, width: 100, depth: 50 },
      ];

      const outline = calculateCompositeRoomOutline(rectangles);

      // Should form a taller rectangle, so 4 points
      expect(outline).toHaveLength(4);
      // Check bounds
      const xs = outline.map(p => p.x);
      const ys = outline.map(p => p.y);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(100);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(100);
    });

    it('handles L-shaped composite room', () => {
      // L-shape:
      // [A]
      // [A][B]
      const rectangles: Rectangle[] = [
        { x: 0, y: 0, width: 100, depth: 100 },
        { x: 100, y: 50, width: 100, depth: 50 },
      ];

      const outline = calculateCompositeRoomOutline(rectangles);

      // L-shape should have 6 points
      expect(outline).toHaveLength(6);
      // Check bounds
      const xs = outline.map(p => p.x);
      const ys = outline.map(p => p.y);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(200);
      expect(Math.min(...ys)).toBe(0);
      expect(Math.max(...ys)).toBe(100);
    });

    it('handles T-shaped composite room', () => {
      // T-shape:
      //   [B]
      // [A][A][A]
      const rectangles: Rectangle[] = [
        { x: 0, y: 50, width: 300, depth: 50 },
        { x: 100, y: 0, width: 100, depth: 50 },
      ];

      const outline = calculateCompositeRoomOutline(rectangles);

      // T-shape should have 8 points
      expect(outline).toHaveLength(8);
    });

    it('handles three rectangles in a row', () => {
      const rectangles: Rectangle[] = [
        { x: 0, y: 0, width: 100, depth: 50 },
        { x: 100, y: 0, width: 100, depth: 50 },
        { x: 200, y: 0, width: 100, depth: 50 },
      ];

      const outline = calculateCompositeRoomOutline(rectangles);

      // Should merge into single rectangle: 4 points
      expect(outline).toHaveLength(4);
      const xs = outline.map(p => p.x);
      expect(Math.min(...xs)).toBe(0);
      expect(Math.max(...xs)).toBe(300);
    });

    it('returns empty array for no rectangles', () => {
      const outline = calculateCompositeRoomOutline([]);
      expect(outline).toEqual([]);
    });
  });

  describe('polygonToSvgPath', () => {
    it('generates correct path for a simple rectangle', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ];

      // Identity scale function
      const scale = (v: number) => v;
      const path = polygonToSvgPath(points, scale);

      expect(path).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
    });

    it('applies scale function correctly', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ];

      // Scale by 0.5
      const scale = (v: number) => v * 0.5;
      const path = polygonToSvgPath(points, scale);

      expect(path).toBe('M 0 0 L 50 0 L 50 25 L 0 25 Z');
    });

    it('returns empty string for empty points', () => {
      const scale = (v: number) => v;
      const path = polygonToSvgPath([], scale);
      expect(path).toBe('');
    });
  });

  describe('getCompositeBounds', () => {
    it('calculates bounds for a single rectangle', () => {
      const rectangles: Rectangle[] = [{ x: 10, y: 20, width: 100, depth: 50 }];

      const bounds = getCompositeBounds(rectangles);

      expect(bounds.minX).toBe(10);
      expect(bounds.minY).toBe(20);
      expect(bounds.maxX).toBe(110);
      expect(bounds.maxY).toBe(70);
      expect(bounds.width).toBe(100);
      expect(bounds.depth).toBe(50);
    });

    it('calculates bounds for multiple rectangles', () => {
      const rectangles: Rectangle[] = [
        { x: 0, y: 0, width: 100, depth: 50 },
        { x: 50, y: 25, width: 100, depth: 75 },
      ];

      const bounds = getCompositeBounds(rectangles);

      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(150);
      expect(bounds.maxY).toBe(100);
      expect(bounds.width).toBe(150);
      expect(bounds.depth).toBe(100);
    });

    it('handles negative coordinates', () => {
      const rectangles: Rectangle[] = [{ x: -50, y: -25, width: 100, depth: 50 }];

      const bounds = getCompositeBounds(rectangles);

      expect(bounds.minX).toBe(-50);
      expect(bounds.minY).toBe(-25);
      expect(bounds.maxX).toBe(50);
      expect(bounds.maxY).toBe(25);
    });
  });

  describe('real-world composite room scenarios', () => {
    it('bedroom with closet (from CLAUDE.md example)', () => {
      // Simulating:
      // room Bedroom 5000x4000
      //     part Closet 2000x1500 at Bedroom:bottom-left
      //
      // Bedroom is at origin, Closet attaches at bottom-left
      const bedroom: Rectangle = { x: 0, y: 0, width: 5000, depth: 4000 };
      const closet: Rectangle = { x: 0, y: 4000, width: 2000, depth: 1500 };

      const outline = calculateCompositeRoomOutline([bedroom, closet]);

      // Should be an L-shape: 6 points
      expect(outline).toHaveLength(6);

      // Check bounds include both
      const bounds = getCompositeBounds([bedroom, closet]);
      expect(bounds.width).toBe(5000);
      expect(bounds.depth).toBe(5500); // 4000 + 1500
    });

    it('room with multiple parts (U-shape)', () => {
      // Main room with two wings:
      //   [W1]   [W2]
      //   [  Main  ]
      const main: Rectangle = { x: 0, y: 1000, width: 3000, depth: 2000 };
      const wing1: Rectangle = { x: 0, y: 0, width: 1000, depth: 1000 };
      const wing2: Rectangle = { x: 2000, y: 0, width: 1000, depth: 1000 };

      const outline = calculateCompositeRoomOutline([main, wing1, wing2]);

      // U-shape has 8 vertices when the left and right edges are continuous:
      // (0,0) -> (1000,0) -> (1000,1000) -> (2000,1000) -> (2000,0) -> (3000,0) -> (3000,3000) -> (0,3000)
      // The vertical edges on left (0) and right (3000) merge because wing1/wing2 share x-coordinates with main
      expect(outline).toHaveLength(8);
    });
  });
});
