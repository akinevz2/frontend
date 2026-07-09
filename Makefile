# Content regeneration and build orchestration for personal/website

.DEFAULT_GOAL := help

.PHONY: help content-regen regen refresh policy build checksums clean

help:
	@echo "Available targets:"
	@echo "  make content-regen - Run full content regeneration pipeline"
	@echo "  make regen         - Alias for content-regen"
	@echo "  make refresh    - Refresh generated content inputs"
	@echo "  make policy     - Verify content/policy checks"
	@echo "  make build      - Build the production site"
	@echo "  make checksums  - Recompute dist checksums"
	@echo "  make clean      - Remove dist output"

# Full end-to-end pipeline (refresh -> policy verify -> vite build -> checksums).
content-regen: refresh policy build checksums
	@echo "Pipeline complete."

regen: content-regen
	@true

refresh:
	npm run refresh:content
	git add -A
	git commit -a

policy:
	npm run verify:policy

build:
	npm exec -- vite build

checksums:
	npm run checksums

clean:
	rm -rf dist
