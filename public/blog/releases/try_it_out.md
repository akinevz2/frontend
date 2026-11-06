# try it out - installing doftiles

> glm-5.3-flash says:
> the whole system deploys from one repository with one chain of recipes.
> what follows is the complete path from an empty machine to a running
> window manager session.

## prerequisites

- **git** - to fetch the repository and its submodules
- **make** - the recipes are plain Make targets; nothing else is needed
  to drive them
- **GNU stow** - every package is a stow tree; the recipes restow for you
- **a systemd user session** - the window manager, the compositor and the
  notification daemon run as user units
- **an X server** - the session waits for one: a real display, or VcXsrv
  on Windows when the machine is WSL2

## the four recipes

```sh
git clone https://github.com/akinevz2/doftiles ~/dots && cd ~/dots
make bootstrap    # the on-deploy binary, submodule checkouts, bun trust
make toolchain    # the language toolchains the packages build with
make deps         # build and install every submodule artifact
make install      # stow the packages, apply the recorded config
```

- `bootstrap` seeds the delegation: it materializes the submodule checkouts
  at their recorded pins, builds the on-deploy binary when missing, stows
  the `depends` package, and runs the bun-trust steps. nothing else is
  touched - it is safe on a machine with no running window manager.
- `toolchain` installs what the per-package Makefiles build with (bun for
  the JS packages, rust for bat). `YES=1 make toolchain` runs it
  non-interactively; `on-deploy toolchain --check` verifies without
  installing.
- `deps` is the build-and-install walk: `on-deploy depends --install`
  syncs the checkouts and drives every package's
  `dots/<pkg>/.local/state/depends/<pkg>.Makefile`. each package owns its
  own recipes - build, link, install - so the walk only discovers and
  delegates.
- `install` restows the recorded package set, applies the recorded
  configuration, and opens the configure wizard only on a clean install
  or when the manifests actually changed. everything else is preserved.

## interactive or headless

the same chain works both ways. in a terminal, `make deploy` walks the
deployment profile (distro target, session model, features, units) and
then provisions. without a tty, run the chain with `YES=1` - every step
is non-gated and a required-file conflict fails loudly instead of
hanging. the only true external requirement is passwordless sudo (or an
interactive prompt) for platform package installation.

## keeping it current

once deployed, updating is two recipes:

```sh
make update          # fetch, fast-forward, materialize the pinned submodules
make update install  # ...and run the install step exactly once
```

`make update` never rebuilds what it does not need to: artifacts stay
untouched, and a fresh submodule pin lands its binary through the
unconditional on-deploy rebuild. `make status` reports the systemd user
units at any time.

## the session

when the recipes finish, the window manager is a user unit gated by
`check-x-server.service`: the display is resolved once, persisted into
the systemd user environment, and every WM-side unit requires it. start
the session with `systemctl --user start herbst`, or reboot - the units
are wired into the default target.

> written by glm-5.3-flash with very full context window
>
> - akinevz
