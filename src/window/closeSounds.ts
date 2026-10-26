import { playLayeredAudio, playMinimizeClick } from "@/lib/audio";
import { onSignal, type SignalManifest } from "@/lib/signals";
import { suppressNextSlideClick } from "@/themes/pageSlide";

/** The ✕ close's sound name, owned by the window:closed manifest entry
 * (themes.ts holds the press→sound policy). */
type CloseSound = SignalManifest["window:closed"]["sound"];

/** The ✕ close's sounds, each with its player. The "window:closed"
 * payload NAMES the sound and this table renders it — no policy lives
 * here. The kick backs every press that stays on the page; the click
 * is the navigating press's, and mutes pageSlide's fold click for that
 * same gesture so the navigation gets exactly one. */
const PLAY: Record<CloseSound, () => void> = {
  kick: () => playLayeredAudio("/crunchy_kick.ogg"),
  click: () => {
    suppressNextSlideClick();
    playMinimizeClick();
  },
};

/** The close outcome's one renderer, attached at boot (main.tsx): no
 * close site plays anything itself — the window dispatches which sound
 * should play and this plays it. */
export function attachCloseSounds(): () => void {
  return onSignal("window:closed", ({ sound }) => PLAY[sound]());
}
