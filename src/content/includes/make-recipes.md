| Recipe                                                | Effect                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `install`                                             | full host setup: `stow`, then `system`                                                                   |
| `stow`                                                | `bash` + `wm`                                                                                            |
| `bash`                                                | stows `shell` (bashrc hook), `git` (`load-credentials`), `llms`, `task`                                  |
| `wm` -> `herbst`                                      | stows `herbst` + `herbstclient reload`, then `alacritty`, `dunst`, `compton`                             |
| `stow-wm`                                             | `status`, then stows every package in `wm.packages`                                                      |
| `services`                                            | stows the `services` package (units land in the systemd user config)                                     |
| `system`                                              | `status`, `add-packages-system`, `add-packages`                                                          |
| `add-packages`                                        | stows `shell`, `on.deploy` preflight, verifies every `wm.requires` binary                                |
| `add-packages-system`                                 | starts the service units, previews + confirms `sudo stow -t /` for `system-*` packages (skips when none) |
| `status`                                              | read-only: prints repo `*.service` states, flags missing `service.order` units                           |
| `reload-systemd`                                      | stows `services`, `daemon-reload`, enables + starts every `service.order` unit                           |
| `start-services`, `stop-services`, `restart-services` | `reload-systemd`, a y/N prompt, then the requested action per unit                                       |
| `update`                                              | safe pull: fast-forward, merge, `$EDITOR` on conflicts or a dirty tree                                   |
| `push`                                                | `update`; commits staged/untracked work (via `$EDITOR`) and pushes                                       |
| `sync`                                                | `update` + `push`                                                                                        |
| `depends`                                             | deploys `wm`, checks the manifests exist, then `sync`                                                    |
