# get Usage

We begin in `/home/kine/development` and execute `get` to 
get the contents of the current directory

```console
kine @ WS-VISION :: (git branch main) /home/kine/development
> get
total 24
drwxrwxr-x 5 kine kine 4096 Nov  8 21:40 .
drwxr-xr-x 8 kine kine 4096 Nov  8 21:40 ..
-rw-rw-r-- 1 kine kine  347 Nov  8 21:53 INSTRUCTIONS.md
drwxrwxr-x 2 kine kine 4096 Nov  8 21:40 docs
drwxrwxr-x 2 kine kine 4096 Nov  8 21:40 scripts
drwxrwxr-x 4 kine kine 4096 Nov  8 21:53 src
```

From `/home/kine/development/` we execute `get docs` to
`cd` into `docs/` and view the directory contents

```console
kine @ WS-VISION :: (git branch main) /home/kine/development
> get docs
total 12
drwxrwxr-x 2 kine kine 4096 Nov  8 21:40 .
drwxrwxr-x 5 kine kine 4096 Nov  8 21:40 ..
-rw-rw-r-- 1 kine kine   91 Nov  8 21:40 README.md

kine @ WS-VISION :: (git branch main) /home/kine/development/docs
> get README.md
>
# README.md was empty
```

We then can `cd` to previous directory via `get -` to
return back to `/home/kine/development`

```console
kine @ WS-VISION :: (git branch main) /home/kine/development/docs
> get -
/home/kine/development/
total 24
drwxrwxr-x 5 kine kine 4096 Nov  8 21:40 .
drwxr-xr-x 8 kine kine 4096 Nov  8 21:40 ..
-rw-rw-r-- 1 kine kine  347 Nov  8 21:53 INSTRUCTIONS.md
drwxrwxr-x 2 kine kine 4096 Nov  8 21:40 docs
drwxrwxr-x 2 kine kine 4096 Nov  8 21:40 scripts
drwxrwxr-x 4 kine kine 4096 Nov  8 21:53 src

kine @ WS-VISION :: (git branch main) /home/kine/development/
> get src/
app.js    lib/      nested/   utils.js

kine @ WS-VISION :: (git branch main) /home/kine/development/
> get src/nested/^C

kine @ WS-VISION :: (git branch main) /home/kine/development/
> get src/lib/
total 12
drwxrwxr-x 2 kine kine 4096 Nov  8 21:54 .
drwxrwxr-x 4 kine kine 4096 Nov  8 21:53 ..
-rw-rw-r-- 1 kine kine   43 Nov  8 21:54 nested-deep.js
```

We can then open out `$EDITOR` via the `@` argument prefix

```console
kine @ WS-VISION :: (git branch main) /home/kine/development/src/lib
> get @./nested-deep.js 
# file opens in vim or your $EDITOR

The `+` prefix turns the file into a live watch instead of a one-shot
edit: `got` execs into `blitch view` — the inotify-based, colour-coded
pager — so saves to the file appear as they happen. Without `blitch`
on PATH, or for a folder target, it degrades to the `@` editor action

```console
kine @ WS-VISION :: (~/demo)
> get +draft.md
# execs into `blitch view`; edits to draft.md redraw in place,
# colour-coded (green added bytes, red deleted tokens, yellow replaced)
```

The prefixes degrade for scripts and pipes: `@` piped prints the
canonical resolved path, and `-` forces a plain stdout view of that one
argument wherever it appears — winning over the editor, the watch, and
the query split

```console
kine @ WS-VISION :: (~/demo)
> get @draft.md
/home/kine/demo/draft.md
> cat "$(get @draft.md)"
hello world
line two
> get -draft.md
hello world
line two
```
```
