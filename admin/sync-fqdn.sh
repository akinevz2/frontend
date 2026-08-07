#!/usr/bin/env bash
# Best-effort FQDN sync, run from `make apply` (or manually as `make sync-fqdn`).
#
# When the resolved tailnet FQDN differs from the one baked into the frontend
# repo (this admin/ directory's parent), the FQDN fragments in src/App.tsx and
# the literals in admin/appsettings.json are rewritten, committed as
# "update fqdn to <fqdn>" and pushed. Always prints what it did and exits 0 so
# `make apply` is never interrupted by this check.
#
# Usage: sync-fqdn.sh <new-fqdn>

NEW_FQDN="${1:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_TSX="$REPO_ROOT/src/App.tsx"
APPSETTINGS="$REPO_ROOT/admin/appsettings.json"

if [ -z "$NEW_FQDN" ]; then
    echo "sync-fqdn: no FQDN given - nothing to do"
    exit 0
fi

if [ ! -f "$APP_TSX" ]; then
    echo "sync-fqdn: src/App.tsx not found in $REPO_ROOT - skipping FQDN sync"
    exit 0
fi

# Reconstruct the FQDN currently baked into src/App.tsx from its fragments.
read_const() { # $1 = const name, $2 = join separator, $3 = file
    sed -n "s|^const $1 = \[\(.*\)\].join(\"$2\");|\1|p" "$3" | tr -d '"' | tr ',' ' ' | tr -s ' '
}

ts_items="$(read_const TS_DOMAIN "." "$APP_TSX")"
id_items="$(read_const TAILNET_ID "" "$APP_TSX")"
host="$(sed -n 's|^const ADMIN_FQDN = \[\([^]]*\), TAILNET_ID.*|\1|p' "$APP_TSX" | tr -d '"')"

if [ -z "$ts_items" ] || [ -z "$id_items" ] || [ -z "$host" ]; then
    echo "sync-fqdn: could not parse the FQDN fragments in src/App.tsx - skipping sync"
    exit 0
fi

ts_domain="$(echo "$ts_items" | tr ' ' '.')"
id_str="$(echo "$id_items" | tr -d ' ')"
CURRENT_FQDN="${host}.${id_str}.${ts_domain}"

if [ "$CURRENT_FQDN" = "$NEW_FQDN" ]; then
    echo "sync-fqdn: FQDN unchanged ($CURRENT_FQDN)"
    exit 0
fi

echo "sync-fqdn: FQDN changed: $CURRENT_FQDN -> $NEW_FQDN"

# Decompose the new FQDN into host | tailnet-id | tld.
IFS='.' read -r -a parts <<< "$NEW_FQDN"
n="${#parts[@]}"
if [ "$n" -lt 3 ]; then
    echo "sync-fqdn: '$NEW_FQDN' does not look like a dotted fqdn - skipping sync"
    exit 0
fi
new_host="${parts[0]}"
tld_labels=("${parts[@]:$((n-2))}")
mid_labels=("${parts[@]:1:$((n-3))}")

# Build the fragment arrays, splitting the tailnet id so it never appears as a
# contiguous literal in the bundle (same trick as src/App.tsx).
tld_items=""
for label in "${tld_labels[@]}"; do
    [ -n "$tld_items" ] && tld_items="$tld_items, "
    tld_items="$tld_items\"$label\""
done

mid_frags=()
for label in "${mid_labels[@]}"; do
    half=$(( ( ${#label} + 1 ) / 2 ))
    mid_frags+=("${label:0:$half}")
    [ -n "${label:$half}" ] && mid_frags+=("${label:$half}")
done
mid_items=""
for frag in "${mid_frags[@]}"; do
    [ -n "$mid_items" ] && mid_items="$mid_items, "
    mid_items="$mid_items\"$frag\""
done

# Rewrite the three fragment lines in src/App.tsx.
sed -i "s|^const TS_DOMAIN = .*|const TS_DOMAIN = [$tld_items].join(\".\");|" "$APP_TSX"
sed -i "s|^const TAILNET_ID = .*|const TAILNET_ID = [$mid_items].join(\"\");|" "$APP_TSX"
sed -i "s|^const ADMIN_FQDN = .*|const ADMIN_FQDN = [\"$new_host\", TAILNET_ID, TS_DOMAIN].join(\".\");|" "$APP_TSX"

# Keep the repo's default admin config consistent with the new FQDN.
if [ -f "$APPSETTINGS" ]; then
    sed -i "s|$CURRENT_FQDN|$NEW_FQDN|g" "$APPSETTINGS"
fi

# Verify the rewrite actually produces the requested FQDN before committing.
ts_items="$(read_const TS_DOMAIN "." "$APP_TSX")"
id_items="$(read_const TAILNET_ID "" "$APP_TSX")"
host="$(sed -n 's|^const ADMIN_FQDN = \[\([^]]*\), TAILNET_ID.*|\1|p' "$APP_TSX" | tr -d '"')"
rewritten="${host}.$(echo "$id_items" | tr -d ' ').$(echo "$ts_items" | tr ' ' '.')"
if [ "$rewritten" != "$NEW_FQDN" ]; then
    echo "sync-fqdn: rewrite verification failed (got $rewritten) - not committing"
    exit 0
fi

commit_paths="src/App.tsx"
if ! git -C "$REPO_ROOT" diff --quiet -- admin/appsettings.json; then
    commit_paths="$commit_paths admin/appsettings.json"
fi

echo "sync-fqdn: committing and pushing the FQDN update"
if git -C "$REPO_ROOT" commit -m "update fqdn to $NEW_FQDN" -- $commit_paths; then
    if GIT_SSH_COMMAND="ssh -o BatchMode=yes" git -C "$REPO_ROOT" push; then
        echo "sync-fqdn: pushed $(git -C "$REPO_ROOT" rev-parse --short HEAD)"
    else
        echo "sync-fqdn: commit made but git push failed - run 'git push' in $REPO_ROOT manually"
    fi
else
    echo "sync-fqdn: nothing to commit"
fi

exit 0
