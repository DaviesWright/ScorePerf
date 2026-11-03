"""
AppConfig for scoreview_performance: all ScoReview Performance-specific code lives here, not in upstream apps.
"""

from django.apps import AppConfig


class ScoreviewPerformanceConfig(AppConfig):
    """App configuration class for scoreview_performance."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "scoreview_performance"
    verbose_name = "ScoReview Performance"
