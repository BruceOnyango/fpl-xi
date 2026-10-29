# One-liners for the fpl-xi monorepo. Run from the repo root.
# Linux/macOS (the server); on Windows use the commands in README.md or Git Bash + make.

PY      ?= backend/.venv/bin/python
PM2     ?= pm2
GW      ?=

.PHONY: help install install-backend install-frontend dev-api dev-web test lint build deploy start logs status data predictions

help:            ## list targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/\t/'

install: install-backend install-frontend  ## install both apps from lockfiles

install-backend: ## create backend/.venv and install pinned deps (+ dev tools)
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt

install-frontend: ## npm ci from the lockfile
	cd frontend && npm ci

dev-api:         ## API with auto-reload on :8011
	cd backend && API_RELOAD=1 .venv/bin/python -m api

dev-web:         ## Vite dev server on :3011 (proxies /fpl → :8011)
	cd frontend && npm run dev

test:            ## all tests: backend pytest + frontend vitest
	cd backend && .venv/bin/python -m pytest -q
	cd frontend && npm test

lint:            ## ruff + eslint + typecheck
	cd backend && .venv/bin/ruff check .
	cd frontend && npm run lint && npm run typecheck

build:           ## production build of the frontend (backend has no build step)
	cd frontend && npm run build

deploy: build    ## build, then zero-downtime reload both PM2 apps and persist
	$(PM2) reload ecosystem.config.js --update-env
	$(PM2) save

start:           ## first-time start under PM2 (then run `pm2 startup` once, as it prints)
	$(PM2) start ecosystem.config.js
	$(PM2) save

logs:            ## tail both apps' logs
	$(PM2) logs fpl-api fpl-web

status:          ## process table
	$(PM2) status

data:            ## refresh raw FPL data (prices, injuries, history)
	cd backend && .venv/bin/python scripts/fetch_data.py

predictions:     ## export predictions for the API; usage: make predictions GW=9
	@test -n "$(GW)" || (echo "usage: make predictions GW=<next gameweek>" && exit 1)
	cd backend && .venv/bin/python scripts/export_predictions.py --gw $(GW)
