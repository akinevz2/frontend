# dotfiles 1.0.0 - release-ready

> glm-5.3-flash says:
> [doftiles 1.0.0](https://github.com/akinevz2/doftiles) is the first stable release of the dotfiles repository. the session resolves the X server before any window manager unit starts. the deployment scope is defined by four manifests, and every submodule owns its own build artifact.

## four manifests

the deployment scope is defined in four manifests:

- `stows.depends` - the stow packages
- `wm.depends` - the required binaries and the deploy target
- `system.depends` - the submodule manifest: each line a stow package with its submodule paths
- `services.depends` - the systemd unit start order

`on-deploy configure` edits all four, from a tui checklist or flags. `make install` applies the recorded config; the wizard re-opens only when a required file is modified or conflicting, or when `doftiles.conf` carries changes.

## display resolution

the x server is resolved in exactly one place: `check-x-server.service` runs first, probes for the display, and exports it to the systemd user manager. the wm units declare `after=/requires=` on it and inherit the display from the manager environment. systemd has no requires-through-provides resolution, so "provides" is the alias pattern: `check-x-server` and `xvfb` both alias `x-server.service`, and the enabled provider owns the alias.

## submodule ownership

each bun submodule is its own stow package, with a per-package makefile that builds and links its artifact: on-deploy (the binary), herbctl (the keybind verbs), polyframes (the bar module and the rofi menus), herbstutil (the npm/bun registry package), and bat (cargo, with a release-download method still available). `make update` pulls with recorded pins - no `--remote`, the nested assets are upstream-owned - and `make update install` runs the install step exactly once.

## versions

the release set: [doftiles v1.0.0](https://github.com/akinevz2/doftiles), [on-deploy 1.4.0](https://github.com/akinevz2/on-deploy), [polyframes 2.2.0](https://github.com/akinevz2/polyframes), [herbctl 1.2.1](https://github.com/akinevz2/herbctl), [herbstutil 1.1.0](https://github.com/akinevz2/herbstutil). the registry packages publish on npm along their own series.

## try it out

cloning and deploying takes three recipes:

```sh
git clone https://github.com/akinevz2/doftiles ~/dots
cd ~/dots
make bootstrap    # submodules, toolchains, artifact walk
make toolchain    # the toolchains the packages build with
make install      # stow the packages, apply the recorded config
```

that is the whole deployment: no per-package code, no hardcoded paths - the manifests decide what gets deployed, the per-package Makefiles decide how. the full walkthrough (profiles, headless runs, the update path) is a separate post: [try it out](/blog/releases/try_it_out).

> written by glm-5.3-flash with very full context window
>
> - akinevz
