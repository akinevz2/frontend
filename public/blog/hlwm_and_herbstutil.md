# herbstluftwm, and the tools around it

so it turns out "writing an operating system" was really "writing one
window manager config and six small tools around it". fair. the rabbit
hole is the same rabbit hole.

## the stack

one [dotfiles repo](https://github.com/akinevz2/doftiles) — GNU Stow
packages, deployed with `make deploy` (a TUI that walks the deployment
profile, then stows what you pick). herbstluftwm is the window manager;
everything else exists to keep it from becoming a shell-script museum.

**[herbstutil](https://github.com/akinevz2/herbstutil)** — the pure
layer. herbstclient's `attr` output as clean typed JSON: rectangles
become objects, types become real types. It ships no commands, it
changes nothing in the WM — it is the reading half. Published on npm.

**[herbctl](https://github.com/akinevz2/herbctl)** — the imperative
layer. every composite mod-binding is a `herbctl <verb>` subcommand
(built with bunli), each issuing the exact hlwm chains the binding
expresses. the verbs are named by what they do: `split-right-cycle`,
`shift-up`, `minimize-toggle`, `explode-frame` — no more whimsy. the
float-register state machines (mod-f / mod-x / mod-ctrl-f) live here
too. fail-soft throughout: a vanished window resolves null instead of
wedging the keybind.

**[polyframes](https://github.com/akinevz2/polyframes)** — the frames.
renders the polybar center module (one label per
frame+class group, state-decorated), hosts the rofi menus
(`tags`, `windows`, `launch`, `hidden`), the tile/center/resize
frame surgery, and the one-shot window rules. no node, no nvm PATH,
no shims — it re-executes itself in the bar's click actions.

**[on-deploy](https://github.com/akinevz2/on-deploy)** — the
deployment orchestrator. `check`/`deploy` walk the required binaries
through per-distro resolvers (`ubuntu.deploy`, `manjaro.deploy` —
pacman, apt, whatever the machine speaks); `provision` reads the
declarative profile (session model: wsl-systemd, greetd, xinit,
nested — the nested Xvfb + noVNC + xrdp stack is co-installable);
`toolchain` runs the install assurances (bun, postinstall trust,
the herbctl binary); `deps` deploys the polyframes artifact.

## the session

herbstluftwm runs as a systemd user unit (`herbst.service`) waiting
for the Windows-side X server (VcXsrv) to be reachable — the WSL2
bypass, no display manager. the nested profile shares the same
framebuffer over VNC and browser noVNC, with an RDP surface layered
on top. compton, polybar, dunst ride along as user units.

## why

because the config file kept accreting `herbstclient chain ...` one
-liners, and the only way to keep the keybinds testable was to give
them names, mock the binary, and pin the argv. 53 tests, one binary
per layer, one repo to stow.

```bash
 glm-5.3-flash says:
if you are on a fresh machine: `make deploy`, pick the profile, let
the toolchain pass, and the window manager comes up when X does.
```

> this entire post was mostly written by GLM-5.3-Flash, he's really friendly!
> I'll add corrections, details and screenshots when time allows it
>
> - akinevz
