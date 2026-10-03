/**
 * WindowDecorations component for XP.css windows
 * Contains minimize, maximize, and close buttons
 */
import { useMinimizeHandle } from "../../hooks";
import { useMaximizeHandle } from "../../hooks";
import { useCloseHandle } from "../../hooks";

export function WindowDecorations() {
  const minimize = useMinimizeHandle();
  const maximize = useMaximizeHandle();
  const close = useCloseHandle();

  return (
    <div className="window-decoration">
      <button
        className="window-minimize"
        onClick={minimize.handleMinimize}
        aria-label="Minimize window"
      />
      <button
        className="window-maximize"
        onClick={maximize.handleMaximize}
        aria-label="Maximize window"
      />
      <button
        className="window-close"
        onClick={close.handleClose}
        aria-label="Close window"
      />
    </div>
  );
}
