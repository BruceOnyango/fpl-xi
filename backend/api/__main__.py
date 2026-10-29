"""`python -m api` — run the API with host/port from the environment.

    API_HOST (default 127.0.0.1)  API_PORT (default 8011)

PM2 runs this (see ecosystem.config.js); locally `cd backend && python -m api`.
Bound to localhost by default: nginx/Apache is the public entry point.
"""

from __future__ import annotations
import os

import uvicorn


def main() -> None:
    uvicorn.run(
        "api.main:app",
        host=os.environ.get("API_HOST", "127.0.0.1"),
        port=int(os.environ.get("API_PORT", "8011")),
        # Trust X-Forwarded-* only from the local reverse proxy.
        proxy_headers=True,
        forwarded_allow_ips=os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1"),
        reload=os.environ.get("API_RELOAD") == "1",
    )


if __name__ == "__main__":
    main()
