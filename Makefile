# Content regeneration and build orchestration for personal/website

.DEFAULT_GOAL := help

.PHONY: help content-regen regen refresh build checksums verify-policy clean

help:
	@echo "Available targets:"
	@echo "  make content-regen - Run full content regeneration pipeline"
	@echo "  make regen         - Alias for content-regen"
	@echo "  make refresh    - Refresh generated content inputs"
	@echo "  make build      - Build the production site"
	@echo "  make checksums  - Recompute dist checksums"
	@echo "  make verify-policy - Fail if the drift report shows genuine drift"
	@echo "  make clean      - Remove dist output"

# Full end-to-end pipeline (refresh -> vite build -> checksums).
content-regen: refresh build checksums
	@echo "Pipeline complete."

regen: content-regen
	@true

refresh:
	npm run refresh:content
	git add -A
	git commit -a

build:
	npm exec -- vite build

checksums:
	npm run checksums

verify-policy:
	npm run verify:policy

clean:
	rm -rf dist
