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
```
