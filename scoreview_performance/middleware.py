"""
Make hidden modules unreachable.

The modules in settings.HIDDEN_MODULES stay installed so their tables, data and
foreign keys keep working, but nobody can open them: their web and API URL
prefixes answer 404 for every user, superusers included. The sidebar entries are
removed separately (see horilla/settings/local_settings.py).

To bring a module back, remove it from HIDDEN_MODULES there.
"""

from django.conf import settings
from django.http import Http404


class HideModulesMiddleware:
    """Return 404 for any URL under a hidden module's prefix."""

    def __init__(self, get_response):
        self.get_response = get_response
        hidden = tuple(getattr(settings, "HIDDEN_MODULES", ()))
        roots = [f"/{m}" for m in hidden] + [f"/api/v1/{m}" for m in hidden]
        self.exact = frozenset(roots)
        # Also the base app's dashboard feeds, e.g. /dashboard/api/recruitment-by-stage/
        self.prefixes = tuple(f"{r}/" for r in roots) + tuple(
            f"/dashboard/api/{m}-" for m in hidden
        )

    def __call__(self, request):
        path = request.path_info
        if path in self.exact or path.startswith(self.prefixes):
            raise Http404
        return self.get_response(request)
