# dotfiles 1.0.0 — release-ready

the dotfiles repo got its first real version today: [doftiles
1.0.0](https://github.com/akinevz2/doftiles/releases/tag/v1.0.0). a dotfiles
release sounds dull until you remember what is inside it: a window manager
session that waits for the Windows-side X server, four manifest files that
decide *what* gets deployed without any of it hardcoded, and a deployer binary
that stopped freezing mid-prompt. this post is the release notes written like
a person wrote them.

## the three manifolds (plus services)

configuration used to live in brain-files: `wm.packages` read one way,
`wm.requires` read another, `service.order` a third. now:

- `stows.required` — the stow packages (what `make wm` and the sweeps touch)
- `wm.required` — the required binaries line, the deployment model, the deploy
  target (ubuntu/manjaro→); the deploy machinery's own meta deps (jq) ride here
- `system.required` — the submodule manifest: each line a stow package with its
  submodule paths; THE scope of `on-deploy depends`
- `services.required` — the unit start order

all four are editable through `on-deploy configure` (tui checklist or flags:
`--add-stows`, `--add-subs pkg:path`, `--remove-*`). `make install` re-opens
the wizard only on a clean install, when a required file is
modified/conflicting post-rebase, or when `doftiles.conf` carries changes —
otherwise it prints `skipped` and deploys the recorded config.

## DISPLAY is decided in exactly one place

every unit used to pin `DISPLAY=localhost:0.0` (and drift when vcxsrv moved to
`:1.0`). now `check-x-server.service` runs FIRST and is the only place that
resolves the x server: `on-deploy detect-server --persist-to-systemd` — the
shared probe, exported to the systemd user manager. every wm unit is
`After=/Requires=` it; the wait-for-x loop that used to be herbst's
ExecStartPre lives there as the retry. systemd has no Requires-through-
Provides resolution (verified on 259), so the "provides" is the alias pattern:
`check-x-server`/`xvfb` both alias `x-server.service`, the enabled one owns
the alias.

## each submodule owns its artifact

the depends package used to host everything; now each bun submodule is its
own stow package with a `dots/<pkg>/.local/state/depends/<pkg>.Makefile`:
`on-deploy` (the binary), `herbctl` (the keybind verbs), `polyframes` (the
bar module + rofi menus), `herbstutil` (the npm/bun global registry package,
plus the trust recipes), and `bat` (cargo, with the legacy release-download
method still reachable via `M=release`). `depends` is remnants-only (the
`on.deploy` shim + the per-distro deploy scripts). pinned submodules:
`make update` is a fast pull + recorded pins (no `--remote` — nested asset
repos are upstream-owned; remotes never re-pull sub-submodule churn), and
`make update install` runs the install step exactly once.

## versions

the release-ready set: doftiles v1.0.0 (tagged), on-deploy 1.2.0, polyframes
2.1.0, herbctl 0.2.0, herbstutil 0.4.0. the registry packages (herbstutil,
polyframes) ride their 0.x/2.x series — published on npm, never rewritten.

## the freeze story

three freezes were hunted during the push: a raw-mode terminal where `[sudo]`
passwords go blind, a line reader that only newlined (`\r` from Enter in raw
mode never terminated — the confirm promise waited for a `\n` forever), and
the install walk that went silent after `[Y/n]` with no "running:" line. all
three are fixed and breadcrumb-guarded now. the requirement walk prints the
exact command before running it and unlocks the tty before the spawn.

help caught up too: the per-verb help groups render at the real terminal
width (floor 40), usage errors for wrong ops, error groups echoing
longest-first. narrow panes flow.

onward: vision gets this on the next `make update install`.
