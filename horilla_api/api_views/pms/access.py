"""Who may read an OKR record through the API, and safe delete (ADR-0014).

The list endpoints already narrow what a user without the view permission sees.
The detail endpoints did not, so any signed-in user could read any record by
id. These helpers apply one rule to the detail endpoints:

    allowed = holds the view permission
              OR owns the record
              OR is the owner's reporting manager
              OR manages the objective.

A refusal is a 403 (DRF ``PermissionDenied``). Write denial keeps the API-wide
``permission_required`` behaviour (401 "No permission"), which is shared by the
whole API and is out of scope here.
"""

import logging

from django.db.models import ProtectedError, Q
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.response import Response

from pms.models import EmployeeKeyResult, Objective

logger = logging.getLogger(__name__)


def _employee(user):
    """The signed-in user's employee, or None (users may have no employee record)."""
    return getattr(user, "employee_get", None)


def _reports_to(employee, manager):
    """True when ``employee`` has ``manager`` as their reporting manager."""
    work = getattr(employee, "employee_work_info", None)
    return bool(manager and work and work.reporting_manager_id_id == manager.pk)


def can_view_employee_objective(user, emp_objective):
    if user.has_perm("pms.view_employeeobjective"):
        return True
    me = _employee(user)
    if me is None:
        return False
    if emp_objective.employee_id_id == me.pk:
        return True
    if _reports_to(emp_objective.employee_id, me):
        return True
    objective = emp_objective.objective_id
    return bool(objective and objective.managers.filter(pk=me.pk).exists())


def can_view_objective(user, objective):
    if user.has_perm("pms.view_objective"):
        return True
    me = _employee(user)
    if me is None:
        return False
    return (
        objective.managers.filter(pk=me.pk).exists()
        or objective.assignees.filter(pk=me.pk).exists()
    )


def can_view_key_result(user, key_result):
    if user.has_perm("pms.view_keyresult"):
        return True
    me = _employee(user)
    if me is None:
        return False
    owns = EmployeeKeyResult.objects.filter(
        key_result_id=key_result, employee_objective_id__employee_id=me
    ).exists()
    if owns:
        return True
    return (
        Objective.objects.filter(key_result_id=key_result)
        .filter(Q(managers=me) | Q(assignees=me))
        .exists()
    )


def can_view_employee_key_result(user, emp_key_result):
    if user.has_perm("pms.view_employeekeyresult"):
        return True
    parent = emp_key_result.employee_objective_id
    return bool(parent and can_view_employee_objective(user, parent))


def can_view_comment(user, comment):
    if user.has_perm("pms.view_comment"):
        return True
    me = _employee(user)
    if me is not None and comment.employee_id_id == me.pk:
        return True
    parent = comment.employee_objective_id
    return bool(parent and can_view_employee_objective(user, parent))


def restrict_employee_key_results(user, queryset):
    """List scoping for users without the view permission: own, reports', managed."""
    if user.has_perm("pms.view_employeekeyresult"):
        return queryset
    me = _employee(user)
    if me is None:
        return queryset.none()
    owner = "employee_objective_id__employee_id"
    return queryset.filter(
        Q(**{owner: me})
        | Q(**{f"{owner}__employee_work_info__reporting_manager_id": me})
        | Q(employee_objective_id__objective_id__managers=me)
    ).distinct()


def company_for_create(request, serializer):
    """Default company for a record created through the API.

    Without it the row has no company and is visible to every company. An
    explicit ``company_id_write`` is respected. If the user has no company, the
    field is left empty (never invented).
    """
    if serializer.validated_data.get("company_id") is not None:
        return {}
    me = _employee(request.user)
    company = me.get_company() if me else None
    if me and not company:
        # Check EmployeeWorkInformation directly in case relation cache on me is stale
        from employee.models import EmployeeWorkInformation

        work_info = (
            EmployeeWorkInformation.objects.filter(employee_id=me)
            .select_related("company_id")
            .first()
        )
        company = getattr(work_info, "company_id", None)
    return {"company_id": company} if company else {}


def safe_delete(instance):
    """Delete and answer with a generic message instead of database error text."""
    try:
        instance.delete()
    except ProtectedError:
        return Response(
            {"error": _("This record is in use and cannot be deleted.")},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception:
        logger.exception("OKR API delete failed for %s", type(instance).__name__)
        return Response(
            {"error": _("The record could not be deleted.")},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)
