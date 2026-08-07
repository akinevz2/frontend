# Admin panel — operations Makefile.
#
#     make help      # (default) read this file in a pager (less)
#
# Edit the allow-list, then apply:
#
#     make edit      # open .allowed-users in $EDITOR
#     make apply      # rebuild image from .allowed-users + restart container
#
# Other:
#     make add ID=kine-phone      # append a user ID, then apply
#     make remove ID=kine-phone   # remove a user ID, then apply
#     make pull                   # git pull, then quick redeploy (make apply)
#     make sync-fqdn              # resolve FQDN, commit + push it into the frontend repo if changed
#     make logs | status | stop | start | shell

ADMIN_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
ALLOWED   := $(ADMIN_DIR).allowed-users
IMAGE     := admin-panel
CONTAINER := admin
DATA_VOL  := admin-data
DevPassword ?= test123
FQDN_SYNC  := $(ADMIN_DIR)sync-fqdn.sh

# Recursive (not :=) so $(FQDN) is expanded at recipe time, after the
# `apply` target resolves it via Resolve-DnsName.
# Set PASSKEY_DEBUG=1 on the make invocation to enable passkey debug logging.
RUN_ARGS = -d --name $(CONTAINER) -p 8080:8080 -p 80:1337 \
          -v $(DATA_VOL):/app/data -e DevPassword=$(DevPassword) \
          -e Origin=https://$(FQDN):8443 \
          -e RpId=$(FQDN) \
          -e LoginRedirectTarget=https://$(FQDN):8443/login \
          $(if $(PASSKEY_DEBUG),-e PASSKEY_DEBUG=1) \
          --restart unless-stopped $(IMAGE)

.PHONY: help edit apply pull sync-fqdn add remove logs status stop start shell

# Default target: `make` shows this file in a pager.
help:
	@less $(MAKEFILE_LIST)

edit:
	$${EDITOR:-nano} $(ALLOWED)

# Rebuild image from current .allowed-users and restart container.
# Resolves the ws-vision CNAME to its Tailscale FQDN via PowerShell's
# Resolve-DnsName (-Type CNAME is deterministic; the default query sometimes
# returns A records with no NameHost field). Fails loudly if resolution
# fails — no silent fallbacks.
apply:
	@echo "Resolving ws-vision FQDN via Resolve-DnsName -Type CNAME..."
	@$(eval FQDN := $(shell powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "(Resolve-DnsName -Name ws-vision -Type CNAME -ErrorAction SilentlyContinue).NameHost.TrimEnd('.')" 2>/dev/null | tr -d '\r\n'))
	@if [ -z "$(FQDN)" ]; then \
		echo "ERROR: Resolve-DnsName -Type CNAME failed to resolve 'ws-vision'. Aborting."; exit 2; \
	fi
	@echo "  ws-vision -> $(FQDN)"
	@echo "  sync frontend FQDN copy (commit + push if changed)..."
	@$(FQDN_SYNC) "$(FQDN)"
	docker build -t $(IMAGE) $(ADMIN_DIR)
	-docker rm -f $(CONTAINER)
	docker run $(RUN_ARGS) >/dev/null
	@echo "✓ http://localhost:8080  (behind tailscale serve: https://$(FQDN):8443)"
	@echo "✓ http://ws-vision/login  -> https://$(FQDN):8443/login  (via host port 80)"
	@cd $(ADMIN_DIR) && git add -A
	@echo "✓ staged admin changes (git add -A)"

# Pull the latest frontend repo changes, then quick redeploy (runs make apply).
pull:
	@cd $(ADMIN_DIR) && git pull
	@$(MAKE) --no-print-directory apply

# Re-resolve the FQDN and sync it into the frontend repo (commit + push if
# changed), without rebuilding/restarting the container.
sync-fqdn:
	@echo "Resolving ws-vision FQDN via Resolve-DnsName -Type CNAME..."
	@$(eval FQDN := $(shell powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "(Resolve-DnsName -Name ws-vision -Type CNAME -ErrorAction SilentlyContinue).NameHost.TrimEnd('.')" 2>/dev/null | tr -d '\r\n'))
	@if [ -z "$(FQDN)" ]; then \
		echo "ERROR: Resolve-DnsName -Type CNAME failed to resolve 'ws-vision'. Aborting."; exit 2; \
	fi
	@echo "  ws-vision -> $(FQDN)"
	@$(FQDN_SYNC) "$(FQDN)"

# Append a user ID (if not already present) and apply.
add:
	@if [ -z "$(ID)" ]; then echo "Usage: make add ID=kine-phone"; exit 2; fi
	@touch $(ALLOWED)
	@if grep -qxF "$(ID)" $(ALLOWED); then \
		echo "Already present: $(ID)"; \
	else \
		printf '%s\n' "$(ID)" >> $(ALLOWED); \
		echo "Added: $(ID)"; \
	fi
	@$(MAKE) --no-print-directory apply

# Remove a user ID and apply.
remove:
	@if [ -z "$(ID)" ]; then echo "Usage: make remove ID=kine-phone"; exit 2; fi
	@tmp=$$(mktemp); grep -vxF "$(ID)" $(ALLOWED) > $$tmp || true; mv $$tmp $(ALLOWED)
	@echo "Removed: $(ID)"
	@$(MAKE) --no-print-directory apply

logs:
	docker logs -f $(CONTAINER)

status:
	@docker ps --filter name=$(CONTAINER) --format '{{.Names}}: {{.Status}}'

stop:
	docker stop $(CONTAINER)

start:
	docker start $(CONTAINER)

shell:
	docker exec -it $(CONTAINER) /bin/sh