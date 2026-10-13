import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { playLayeredAudio } from "@/lib/audio";
import {
  CLIPPY_LINK,
  createBurstCounter,
  createWordMatcher,
} from "@/lib/clippy";

const SUMMON_SOUND = "/yooh.mp3";
const BUBBLE_MS = 8_000;
const HINT =
  "It looks like you're trying to close something. Try clicking one of the ✕ close buttons on the page!";

/** Hidden mascot: summoned by typing the word or by repeatedly clicking its link. */
export function Clippy() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [bubble, setBubble] = useState(false);

  useEffect(() => {
    const matchesWord = createWordMatcher();
    const isBurst = createBurstCounter();
    const summon = () => {
      setVisible(true);
      setBubble(true);
    };
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (matchesWord(event.key)) summon();
    };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (link?.getAttribute("href") !== CLIPPY_LINK) return;
      event.preventDefault();
      playLayeredAudio(SUMMON_SOUND);
      if (isBurst()) summon();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(false), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  if (!visible || pathname === "/blog") return null;

  return (
    <div className="clippy">
      {bubble && (
        <div className="clippy-bubble" role="status">
          {HINT}
        </div>
      )}
      <img
        className="clippy-image"
        src="/Clippy.png"
        alt="Clippy"
        onClick={() => setBubble(true)}
        onDoubleClick={() => setVisible(false)}
      />
    </div>
  );
}
