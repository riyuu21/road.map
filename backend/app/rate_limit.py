import time

WINDOW_S = 60.0
LIMIT = 10

_hits: dict[str, list[float]] = {}


def rate_limit(key: str) -> bool:
    """Sliding-window limiter: max LIMIT requests per WINDOW_S per key."""
    now = time.monotonic()
    if len(_hits) > 2000:
        for k in [k for k, times in _hits.items() if all(now - t >= WINDOW_S for t in times)]:
            del _hits[k]
    recent = [t for t in _hits.get(key, []) if now - t < WINDOW_S]
    if len(recent) >= LIMIT:
        _hits[key] = recent
        return False
    recent.append(now)
    _hits[key] = recent
    return True
