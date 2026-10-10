/**
 * WindowDecorations component for XP.css windows
 * Contains minimize, maximize, and close buttons
 */
import { useMinimizeHandle } from "../hooks";
import { useMaximizeHandle } from "../hooks";
import { useCloseHandle } from "../hooks";

export function WindowDecorations({ sectionUuid }: { sectionUuid: string }) {
  const minimize = useMinimizeHandle(sectionUuid);
  const maximize = useMaximizeHandle();
  const close = useCloseHandle();

  return (
    <>
      <button onClick={minimize.handleMinimize} aria-label="Minimize" />
      <button onClick={maximize.handleMaximize} aria-label="Maximize" />
      <button onClick={close.handleClose} aria-label="Close" />
    </>
  );
}
