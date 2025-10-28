interface GridRendererProps {
  gridMinX: number;
  gridMinY: number;
  gridMaxX: number;
  gridMaxY: number;
  gridStep: number;
  mm: (val: number) => number;
}

export function GridRenderer({
  gridMinX,
  gridMinY,
  gridMaxX,
  gridMaxY,
  gridStep,
  mm,
}: GridRendererProps) {
  const lines = [];

  // Vertical lines
  for (let i = gridMinX; i <= gridMaxX; i += gridStep) {
    lines.push(
      <line
        key={`v-${i}`}
        x1={mm(i)}
        y1={mm(gridMinY)}
        x2={mm(i)}
        y2={mm(gridMaxY)}
        stroke="#eee"
        data-grid-step={String(gridStep)}
      />
    );
  }

  // Horizontal lines
  for (let i = gridMinY; i <= gridMaxY; i += gridStep) {
    lines.push(
      <line
        key={`h-${i}`}
        x1={mm(gridMinX)}
        y1={mm(i)}
        x2={mm(gridMaxX)}
        y2={mm(i)}
        stroke="#eee"
        data-grid-step={String(gridStep)}
      />
    );
  }

  return <>{lines}</>;
}
