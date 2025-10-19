import type { Anchor } from '../../types';
import './AnchorSelector.css';

interface AnchorSelectorProps {
  value?: Anchor;
  onChange: (anchor: Anchor) => void;
}

export function AnchorSelector({ value, onChange }: AnchorSelectorProps) {
  const currentAnchor = value || 'top-left';

  return (
    <div className="anchor-selector">
      <button
        type="button"
        className={`anchor-corner top-left ${currentAnchor === 'top-left' ? 'active' : ''}`}
        onClick={() => onChange('top-left')}
        title="Top Left"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner top-right ${currentAnchor === 'top-right' ? 'active' : ''}`}
        onClick={() => onChange('top-right')}
        title="Top Right"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner bottom-left ${currentAnchor === 'bottom-left' ? 'active' : ''}`}
        onClick={() => onChange('bottom-left')}
        title="Bottom Left"
      >
        <div className="corner-dot" />
      </button>
      <button
        type="button"
        className={`anchor-corner bottom-right ${currentAnchor === 'bottom-right' ? 'active' : ''}`}
        onClick={() => onChange('bottom-right')}
        title="Bottom Right"
      >
        <div className="corner-dot" />
      </button>
    </div>
  );
}
