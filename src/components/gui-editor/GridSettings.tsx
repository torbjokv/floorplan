import './GridSettings.css';

interface GridSettingsProps {
  gridStep: number;
  onGridStepChange: (gridStep: number) => void;
}

export function GridSettings({ gridStep, onGridStepChange }: GridSettingsProps) {
  return (
    <div className="gui-section" data-testid="grid-settings">
      <h3>📐 Grid Settings</h3>
      <div className="form-row">
        <label>
          Grid Step (mm):
          <input
            type="number"
            value={gridStep}
            onChange={(e) => onGridStepChange(Number(e.target.value))}
            data-testid="grid-step-input"
          />
        </label>
      </div>
    </div>
  );
}
