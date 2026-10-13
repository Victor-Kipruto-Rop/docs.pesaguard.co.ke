"""Build one route inventory from the canonical FastAPI app and its WSGI mounts.

The production entry point is FastAPI, not a Flask application. It exposes
FastAPI health routes and mounts two Flask applications through WSGIMiddleware.
This adapter is shared by the route snapshot and OpenAPI generators so they
inspect the same externally reachable path/method pairs.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, Iterable


def normalize_flask_path(path: str) -> str:
    """Convert Flask variables like /x/<string:item> to OpenAPI /x/{item}."""
    return re.sub(r"<(?:[^:>]+:)?([^>]+)>", r"{\1}", path)


@dataclass(frozen=True)
class RouteDescriptor:
    rule: str
    methods: set[str]
    endpoint: str


class RouteMap:
    def __init__(self, routes: list[RouteDescriptor]) -> None:
        self._routes = routes

    def iter_rules(self) -> Iterable[RouteDescriptor]:
        return iter(self._routes)


class RouteRegistry:
    def __init__(self, routes: list[RouteDescriptor], view_functions: dict[str, Any]) -> None:
        self.url_map = RouteMap(routes)
        self.view_functions = view_functions


def _unwrap_wsgi_app(mounted_app: Any) -> tuple[Any | None, str | None]:
    """Return the Flask app and optional prefix restored by the ASGI wrapper."""
    restore_prefix = getattr(mounted_app, "prefix", None)
    current = mounted_app
    visited: set[int] = set()
    while not hasattr(current, "url_map") and hasattr(current, "app"):
        if id(current) in visited:
            break
        visited.add(id(current))
        current = current.app
    if not hasattr(current, "url_map") or not hasattr(current, "view_functions"):
        return None, restore_prefix
    return current, restore_prefix


def _external_path(path: str, mount_path: str, restore_prefix: str | None) -> str:
    inner = normalize_flask_path(path)
    suffix = inner
    if restore_prefix:
        rp = restore_prefix.rstrip("/") or "/"
        if inner == rp:
            suffix = "/"
        elif inner.startswith(rp.rstrip("/") + "/"):
            suffix = inner[len(rp.rstrip("/")):]
    prefix = mount_path.rstrip("/")
    if prefix == "/":
        prefix = ""
    if not suffix.startswith("/"):
        suffix = "/" + suffix
    combined = (prefix + suffix) if prefix else suffix
    return combined or "/"


def collect_route_registry(asgi_app: Any) -> RouteRegistry:
    """Collect direct ASGI routes plus routes exposed through mounted Flask apps."""
    from starlette.routing import Mount

    routes: list[RouteDescriptor] = []
    view_functions: dict[str, Any] = {}
    seen: set[tuple[str, str]] = set()

    def add(path: str, methods: Iterable[str], endpoint: str, fn: Any) -> None:
        path = normalize_flask_path(path)
        usable = sorted({str(method).upper() for method in methods} - {"HEAD", "OPTIONS"})
        new_methods = {method for method in usable if (path, method) not in seen}
        if not new_methods:
            return
        for method in new_methods:
            seen.add((path, method))
        safe_endpoint = re.sub(r"[^A-Za-z0-9_.-]+", "_", endpoint)
        routes.append(RouteDescriptor(rule=path, methods=new_methods, endpoint=safe_endpoint))
        view_functions[safe_endpoint] = fn

    for route in getattr(asgi_app, "routes", []):
        if isinstance(route, Mount):
            flask_app, restore_prefix = _unwrap_wsgi_app(route.app)
            if flask_app is None:
                continue
            mount_path = route.path or "/"
            label = mount_path.strip("/").replace("/", "_") or "root"
            flask_rules = sorted(
                flask_app.url_map.iter_rules(),
                key=lambda item: (normalize_flask_path(item.rule), item.endpoint),
            )
            for rule in flask_rules:
                fn = flask_app.view_functions.get(rule.endpoint)
                if fn is None:
                    continue
                external = _external_path(rule.rule, mount_path, restore_prefix)
                add(external, rule.methods, f"{label}__{rule.endpoint}", fn)
            continue

        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        fn = getattr(route, "endpoint", None)
        if path and methods and callable(fn):
            name = getattr(route, "name", None) or getattr(fn, "__name__", "endpoint")
            add(path, methods, f"fastapi__{name}", fn)

    routes.sort(key=lambda item: (item.rule, sorted(item.methods), item.endpoint))
    return RouteRegistry(routes, view_functions)


def snapshot_routes(registry: RouteRegistry) -> list[dict[str, Any]]:
    return [
        {"path": route.rule, "methods": sorted(route.methods), "endpoint": route.endpoint}
        for route in registry.url_map.iter_rules()
    ]
