"""Rate limiting for the verbel-ai API using slowapi.

This module exposes a per-client-IP ``Limiter`` instance plus a custom
exception handler that renders :class:`RateLimitExceeded` errors as HTTP 429
JSON responses shaped like the rest of the API::

    {"success": false, "error": "...", "detail": "..."}

New dependency (add to backend/requirements.txt)::

    slowapi>=0.1.9

--------------------------------------------------------------------------------
WIRING SNIPPETS (the coordinator applies these; this file only provides them)
--------------------------------------------------------------------------------

(a) + (b)  In ``backend/app/main.py`` -- attach the limiter to app.state and
register the 429 handler. Add the import near the other imports and the two
wiring lines *after* ``app = FastAPI(...)`` is created::

    from slowapi.errors import RateLimitExceeded
    from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

(NOTE: slowapi reads the limiter from ``app.state.limiter``, so that assignment
is required -- the decorator alone is not enough.)

(c)  In ``backend/app/routers/tts.py`` -- rate-limit ``POST /api/tts`` at
20 requests/minute per IP. slowapi's decorator REQUIRES the endpoint to accept
a ``request: Request`` parameter (it inspects it to derive the client IP), so
the signature must be widened::

    from fastapi import Request
    from app.middleware.rate_limit import limiter

    @router.post("/tts", response_model=TTSResponse)
    @limiter.limit("20/minute")
    def create_tts(request: Request, payload: TTSRequest) -> TTSResponse:
        ...

Keep ``@limiter.limit(...)`` directly above the function (below the router
decorator). If ``request: Request`` is missing, slowapi raises at call time.
"""
from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Limiter keyed by the client's remote IP address. No default limits are set
# globally; routes opt in via the ``@limiter.limit(...)`` decorator.
limiter = Limiter(key_func=get_remote_address)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a 429 JSON error matching the API's ``success/error/detail`` shape."""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "Rate limit exceeded.",
            "detail": f"Too many requests. Limit: {exc.detail}.",
        },
    )
