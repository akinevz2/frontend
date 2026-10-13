import { useState } from "react";
import { useWindowStore } from "./state";

/** "unhide (N)" dock listing windows that are closed or minimised. */
export function Dock() {
  const { parked, restore, restoreAll, flagsOf } = useWindowStore();
  const [open, setOpen] = useState(false);
  if (parked.length === 0) return null;

  const rootParked = parked.some((w) => w.depth === 0);
  const label = rootParked ? "unhide all" : "unhide";

  const onClick = () => {
    if (rootParked) {
      restoreAll();
      setOpen(false);
    } else {
      setOpen((value) => !value);
    }
  };

  return (
    <div className="unhide-button-container">
      <button onClick={onClick} aria-expanded={open}>
        <span className="menu-underline">u</span>
        {label.slice(1)} ({parked.length})
      </button>
      {open && (
        <ul className="unhide-dropdown">
          {parked.map((w) => (
            <li key={w.id}>
              <button
                onClick={() => {
                  restore(w.id);
                  setOpen(parked.length > 1);
                }}
              >
                {w.heading ?? w.id}
                {flagsOf(w.id).closed ? " (closed)" : " (minimised)"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
