"""
Client-specific overrides.

Imported last from horilla.settings.__init__ (after base + addons).
Override settings here; do NOT use ``from .base import *`` — that re-exports
base MEDIA_* values and wipes AWS S3 paths set by addons.py.

Examples:

    DEBUG = False
    ALLOWED_HOSTS = ["client.example.com"]
    WHITE_LABELLING = True
    DOC_BASE_URL = "https://www.horilla.com"

    # Extend lists via selective import (same list object as base):
    from .base import INSTALLED_APPS, MIDDLEWARE

    INSTALLED_APPS += ["client_portal"]
    MIDDLEWARE += ["client_portal.middleware.ClientTrackingMiddleware"]
"""

# CUSTOM: ScoReview Performance. See CUSTOMIZATIONS.md.
from pathlib import Path

from .base import _TEMPLATE_LOADERS, BASE_DIR, INSTALLED_APPS, STATICFILES_DIRS

INSTALLED_APPS += ["scoreview_performance"]

# Show the HQ company's name and logo instead of "Horilla" (base/context_processors.py).
WHITE_LABELLING = True

# Slot 1, right after the DB template loader and ahead of horilla_theme's dir
# and every app dir: scoreview_performance/templates/<same path> overrides upstream.
_TEMPLATE_LOADERS.insert(
    1,
    (
        "django.template.loaders.filesystem.Loader",
        [Path(BASE_DIR) / "scoreview_performance" / "templates"],
    ),
)

# FileSystemFinder runs before AppDirectoriesFinder and checks these in order,
# so files here override same-path upstream static files (e.g. logo, css).
STATICFILES_DIRS.insert(0, Path(BASE_DIR) / "scoreview_performance" / "static_overrides")
