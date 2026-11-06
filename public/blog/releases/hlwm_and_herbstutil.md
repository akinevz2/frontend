# herbstluftwm, and the tools around it

> glm-5.3-flash says:
> one [dotfiles repo](https://github.com/akinevz2/doftiles) - GNU Stow packages, deployed with `make deploy` (a tui that walks the deployment profile, then stows what you pick) or, headless, with the `make bootstrap toolchain deps install` chain. herbstluftwm is the window manager; everything else exists to keep it from becoming a shell-script museum.

**[herbstutil](https://github.com/akinevz2/herbstutil)** - the pure layer. herbstclient's `attr` output as clean typed JSON: rectangles become objects, types become real types. it is a proper bunli cli with a small set of subcommands - read an attribute, parse its output, generate shell completions - terse help throughout. it changes nothing in the wm; it is the reading half. published on npm.

**[herbctl](https://github.com/akinevz2/herbctl)** - the imperative layer. every composite mod-binding is a `herbctl <verb>` subcommand (built with bunli), each issuing the exact hlwm chains the binding expresses. verbs are named by what they do: `split-right-cycle`, `shift-up`, `minimize-toggle`, `explode-frame`. the float-register state machines (mod-f / mod-x / mod-ctrl-f) live here too. fail-soft throughout: a vanished window resolves null instead of wedging the keybind. 53 tests pin the argv.

**[polyframes](https://github.com/akinevz2/polyframes)** - the frames. renders the polybar center module (one label per frame+class group, state-decorated), hosts the rofi menus (`tags`, `windows`, `launch`, `hidden`), the tile/center/resize frame surgery, and the one-shot window rules. a native bun binary - no node, no nvm path, no shims; it re-executes itself in the bar's click actions.

**[on-deploy](https://github.com/akinevz2/on-deploy)** - the deployment orchestrator. its commands cover everything from checking requirements and stowing packages to driving the per-distro installers (ubuntu.deploy, manjaro.deploy - pacman, apt, whatever the machine speaks), walking the per-package makefiles that deploy the submodules, editing the four manifest files, managing the systemd user services, detecting the x server, and preserving or archiving state. everything the doftiles makefile delegates, it delegates here.

## the session

the x server is resolved exactly once: check-x-server.service runs first, probes for the display (VcXsrv on the Windows side, or an Xvfb in the nested profile) and exports it to the systemd user manager; herbst requires it and comes up when the server does. the nested profile shares the same framebuffer over VNC and browser noVNC, with an RDP surface layered on top. compton, polybar, dunst ride along as user units.

## why

because the config file accretes `herbstclient chain ...` one-liners, and the only way to keep the keybinds testable is to give them names, mock the binary, and pin the argv. 53 tests, one binary per layer, one repo to stow.

## installing

the deployment is a four-recipe chain - clone the repo, bootstrap the deployer, run the toolchain and the per-package builds, then stow. the full walkthrough, including the headless variant and the update path, lives in [try it out](/blog/releases/try_it_out).

> this entire post was mostly written by GLM-5.3-Flash, he's really friendly!
>
> - akinevz

_P.S.:_ in cases your session is managed and the X server is not a free and  
unoccupied concept, that is - you're running an actual operating system, fear  
not, I will soon develop a legitimate deployment and initialisation process  
that will launch via a greeter
