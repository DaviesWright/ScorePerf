"""Services for ScoReview Core domain logic (Phase 1).

Implements the PerformanceCycle lifecycle state machine (BUILD.md §5.3).
"""

from typing import Dict, Optional, Set

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from .models import CycleStatus, PerformanceCycle

User = get_user_model()


class CycleTransitionError(ValidationError):
    """Raised when an invalid performance cycle transition is attempted."""

    def __init__(self, message: str, current_status: str, target_status: str):
        super().__init__(message)
        self.current_status = current_status
        self.target_status = target_status


ALLOWED_CYCLE_TRANSITIONS: Dict[str, Set[str]] = {
    CycleStatus.DRAFT: {
        CycleStatus.CONFIGURED,
    },
    CycleStatus.CONFIGURED: {
        CycleStatus.DRAFT,
        CycleStatus.APPROVED,
    },
    CycleStatus.APPROVED: {
        CycleStatus.CONFIGURED,
        CycleStatus.ACTIVE,
    },
    CycleStatus.ACTIVE: {
        CycleStatus.REVIEW,
    },
    CycleStatus.REVIEW: {
        CycleStatus.ACTIVE,
        CycleStatus.CALIBRATION,
        CycleStatus.APPROVAL,
    },
    CycleStatus.CALIBRATION: {
        CycleStatus.REVIEW,
        CycleStatus.APPROVAL,
    },
    CycleStatus.APPROVAL: {
        CycleStatus.REVIEW,
        CycleStatus.CALIBRATION,
        CycleStatus.CERTIFIED,
    },
    CycleStatus.CERTIFIED: {
        CycleStatus.PUBLISHED,
    },
    CycleStatus.PUBLISHED: {
        CycleStatus.CLOSED,
    },
    CycleStatus.CLOSED: set(),
}


def can_transition_cycle(cycle: PerformanceCycle, target_status: str) -> bool:
    """Return whether the cycle can transition from its current status to target_status."""
    allowed = ALLOWED_CYCLE_TRANSITIONS.get(cycle.status, set())
    return target_status in allowed


def transition_cycle_status(
    cycle: PerformanceCycle,
    target_status: str,
    actor=None,
    reason: Optional[str] = None,
) -> PerformanceCycle:
    """Validate and execute a lifecycle transition on a PerformanceCycle.

    Args:
        cycle: The PerformanceCycle instance to transition.
        target_status: The target CycleStatus string.
        actor: Optional user or HorillaUser initiating the transition.
        reason: Optional text reason or audit note for the transition.

    Returns:
        The updated PerformanceCycle instance.

    Raises:
        CycleTransitionError: If the transition is disallowed by the state machine.
        ValidationError: If the model's clean() checks fail.
    """
    if target_status not in CycleStatus.values:
        raise CycleTransitionError(
            _("Unknown cycle status '%(status)s'.") % {"status": target_status},
            current_status=cycle.status,
            target_status=target_status,
        )

    if not can_transition_cycle(cycle, target_status):
        raise CycleTransitionError(
            _(
                "Cannot transition cycle from '%(current)s' to '%(target)s'. "
                "Allowed transitions from '%(current)s': %(allowed)s."
            )
            % {
                "current": cycle.status,
                "target": target_status,
                "allowed": ", ".join(sorted(ALLOWED_CYCLE_TRANSITIONS.get(cycle.status, set())))
                or "none (terminal state)",
            },
            current_status=cycle.status,
            target_status=target_status,
        )

    cycle.status = target_status
    if actor is not None:
        if hasattr(actor, "pk"):
            cycle.modified_by = actor

    cycle.full_clean()
    cycle.save()
    return cycle

