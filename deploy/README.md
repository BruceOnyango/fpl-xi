# Deploying to bruceonyango.link

| URL | What | Served by |
|---|---|---|
| `https://bruceonyango.link/fantasy-league/` | dashboard (static build) | nginx/Apache from `/var/www/fantasy-league/` |
| `https://bruceonyango.link/fpl/…` | API (single entry point) | nginx/Apache → uvicorn on `127.0.0.1:8000` |
| `https://bruceonyango.link/fpl/docs` | interactive API docs | same |

Same origin, so no CORS. The frontend calls `/fpl/...`. The API serves every route under `/fpl` itself, so the proxy forwards the path unchanged.

## Files
- `nginx.conf`: location blocks to paste into your existing `server {}`.
- `apache.conf`: the same for an Apache `<VirtualHost>` (needs `proxy`, `proxy_http`, `headers`).
- `fpl-api.service`: systemd unit that keeps uvicorn running.

## First deploy (Linux server)

```bash
# 1. Code + Python env (the API imports src/fpl for the ILP and captain rule)
sudo git clone <repo> /srv/fpl-best11 && cd /srv/fpl-best11
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# 2. Predictions: the API never trains. Export them (here or on your PC) into data/processed/
python scripts/fetch_data.py && python scripts/export_predictions.py --gw <next GW>
# …or from your PC:  scp data/processed/predictions.json server:/srv/fpl-best11/data/processed/

# 3. API service
sudo cp deploy/fpl-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now fpl-api
curl -s http://127.0.0.1:8000/fpl/meta        # should return JSON

# 4. Frontend: build anywhere with Node ≥ 22.12, then copy dist/
cd frontend && npm ci && npm run build        # production build: real API at /fpl, base /fantasy-league/
rsync -a --delete dist/ server:/var/www/fantasy-league/

# 5. Web server: paste nginx.conf (or apache.conf) into the bruceonyango.link vhost, test, reload
sudo nginx -t && sudo systemctl reload nginx
```

## Check it

```bash
curl -s https://bruceonyango.link/fpl/meta | head -c 200      # JSON with "source":"live"
curl -sI https://bruceonyango.link/fantasy-league/players      # 200 (SPA fallback), not 404
```
Then open `https://bruceonyango.link/fantasy-league/`. There should be no "Mock backend" banner. A yellow banner means the predictions on the server are missing or for an older GW.

## Weekly update (no restart needed)

```bash
python scripts/fetch_data.py
python scripts/export_predictions.py --gw <next GW>
python scripts/evaluate.py --horizon 1 --save   # optional
# if you ran these on your PC:
scp data/processed/predictions.json data/processed/backtest_h1.json server:/srv/fpl-best11/data/processed/
```
The API reloads these files when they change. Prices and injury flags are pulled live from FPL anyway, cached for up to 15 min.

## Notes
- **Permissions:** the service runs as `www-data` with the repo read-only. Make sure `data/processed/*.json` is readable by it.
- **Changing the paths:** the API prefix is `FPL_API_PREFIX` in the unit file. The frontend base is `base` in `frontend/vite.config.ts`, and its API path is `VITE_API_BASE` (default `/fpl`). Change both sides together.
- **Public API:** anyone can query any team ID, but it's all public FPL data, and the cache limits how often FPL gets hit.
