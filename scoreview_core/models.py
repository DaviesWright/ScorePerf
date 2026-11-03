"""ScoReview Performance Core domain models (Phase 1).

Implements common entities required by BUILD.md §5 and ADRs 0001, 0005, 0011:
- FrameworkType: Methodologies supported (OKR, MBO, BSC)
- FrameworkConfiguration: Company-scoped, versioned methodology settings
- PerformanceCycle: Period and state machine with strict company ownership
- PerformanceAssignment: Links cycle to employees
- OKRCycleLink: Ties existing pms.EmployeeObjective to cycles without altering pms
"""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from base.horilla_company_manager import HorillaCompanyManager
from base.models import Company
from employee.models import Employee
from horilla.models import HorillaModel


class FrameworkCode(models.TextChoices):
    OKR = "OKR", _("Objectives and Key Results")
    MBO = "MBO", _("Management by Objectives")
    BSC = "BSC", _("Balanced Scorecard")


class CycleStatus(models.TextChoices):
    DRAFT = "draft", _("Draft")
    CONFIGURED = "configured", _("Configured")
    APPROVED = "approved", _("Approved")
    ACTIVE = "active", _("Active")
    REVIEW = "review", _("Review")
    CALIBRATION = "calibration", _("Calibration")
    APPROVAL = "approval", _("Approval")
    CERTIFIED = "certified", _("Certified")
    PUBLISHED = "published", _("Published")
    CLOSED = "closed", _("Closed")


class FrameworkType(models.Model):
    """Supported performance methodology identifier."""

    code = models.CharField(
        max_length=20,
        unique=True,
        choices=FrameworkCode.choices,
        verbose_name=_("Framework Code"),
    )
    name = models.CharField(max_length=100, verbose_name=_("Framework Name"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    is_active = models.BooleanField(default=True, verbose_name=_("Is Active"))

    class Meta:
        verbose_name = _("Framework Type")
        verbose_name_plural = _("Framework Types")
        ordering = ["code"]

    def __str__(self):
        return self.name


class FrameworkConfiguration(HorillaModel):
    """Company-scoped, versioned configuration for a performance framework."""

    company_id = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="framework_configurations",
        verbose_name=_("Company"),
    )
    framework_type = models.ForeignKey(
        FrameworkType,
        on_delete=models.PROTECT,
        related_name="configurations",
        verbose_name=_("Framework Type"),
    )
    version = models.PositiveIntegerField(default=1, verbose_name=_("Version"))
    settings = models.JSONField(default=dict, blank=True, verbose_name=_("Settings"))

    objects = HorillaCompanyManager("company_id")

    class Meta:
        verbose_name = _("Framework Configuration")
        verbose_name_plural = _("Framework Configurations")
        unique_together = ("company_id", "framework_type", "version")
        ordering = ["company_id", "framework_type", "-version"]

    def __str__(self):
        return f"{self.company_id} - {self.framework_type.code} v{self.version}"


class PerformanceCycle(HorillaModel):
    """Performance period and lifecycle state machine (BUILD.md §5.3).

    Strictly scoped to a company (ADR-0005). Supports exactly one framework per
    cycle (BUILD.md §2.1).
    """

    company_id = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_cycles",
        verbose_name=_("Company"),
    )
    title = models.CharField(max_length=255, verbose_name=_("Title"))
    description = models.TextField(blank=True, verbose_name=_("Description"))
    framework_type = models.ForeignKey(
        FrameworkType,
        on_delete=models.PROTECT,
        related_name="performance_cycles",
        verbose_name=_("Framework Type"),
    )
    framework_configuration = models.ForeignKey(
        FrameworkConfiguration,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="performance_cycles",
        verbose_name=_("Framework Configuration"),
    )
    start_date = models.DateField(verbose_name=_("Start Date"))
    end_date = models.DateField(verbose_name=_("End Date"))
    status = models.CharField(
        max_length=20,
        choices=CycleStatus.choices,
        default=CycleStatus.DRAFT,
        db_index=True,
        verbose_name=_("Status"),
    )

    objects = HorillaCompanyManager("company_id")

    class Meta:
        verbose_name = _("Performance Cycle")
        verbose_name_plural = _("Performance Cycles")
        ordering = ["-start_date", "title"]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError(
                {"end_date": _("End date must be greater than or equal to start date.")}
            )

        if hasattr(self, "framework_configuration") and self.framework_configuration_id:
            if (
                self.company_id_id
                and self.framework_configuration.company_id_id != self.company_id_id
            ):
                raise ValidationError(
                    {
                        "framework_configuration": _(
                            "Framework configuration company must match cycle company."
                        )
                    }
                )
            if (
                self.framework_type_id
                and self.framework_configuration.framework_type_id != self.framework_type_id
            ):
                raise ValidationError(
                    {
                        "framework_configuration": _(
                            "Framework configuration type must match cycle framework type."
                        )
                    }
                )


class PerformanceAssignment(HorillaModel):
    """Assigns an employee or unit to a performance cycle (BUILD.md §5.4)."""

    company_id = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_assignments",
        verbose_name=_("Company"),
    )
    cycle_id = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name="assignments",
        verbose_name=_("Performance Cycle"),
    )
    employee_id = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="performance_assignments",
        verbose_name=_("Employee"),
    )
    status = models.CharField(
        max_length=30,
        default="assigned",
        db_index=True,
        verbose_name=_("Status"),
    )

    objects = HorillaCompanyManager("company_id")

    class Meta:
        verbose_name = _("Performance Assignment")
        verbose_name_plural = _("Performance Assignments")
        unique_together = ("cycle_id", "employee_id")

    def __str__(self):
        return f"{self.employee_id} in {self.cycle_id.title}"

    def clean(self):
        super().clean()
        if hasattr(self, "cycle_id") and self.cycle_id_id and self.company_id_id:
            if self.cycle_id.company_id_id != self.company_id_id:
                raise ValidationError(
                    {"company_id": _("Assignment company must match cycle company.")}
                )


class OKRCycleLink(HorillaModel):
    """Maps existing pms.EmployeeObjective to a cycle (ADR-0001, BUILD.md §22.2).

    Preserves pms data and IDs completely without altering the upstream model.
    """

    company_id = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="okr_cycle_links",
        verbose_name=_("Company"),
    )
    cycle_id = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.CASCADE,
        related_name="okr_links",
        verbose_name=_("Performance Cycle"),
    )
    employee_objective_id = models.OneToOneField(
        "pms.EmployeeObjective",
        on_delete=models.CASCADE,
        related_name="cycle_link",
        verbose_name=_("Employee Objective"),
    )

    objects = HorillaCompanyManager("company_id")

    class Meta:
        verbose_name = _("OKR Cycle Link")
        verbose_name_plural = _("OKR Cycle Links")

    def __str__(self):
        return f"Link: {self.employee_objective_id_id} -> {self.cycle_id.title}"

    def clean(self):
        super().clean()
        if hasattr(self, "cycle_id") and self.cycle_id_id:
            if self.cycle_id.framework_type.code != FrameworkCode.OKR:
                raise ValidationError(
                    {"cycle_id": _("OKR links can only be attached to OKR cycles.")}
                )
            if self.company_id_id and self.cycle_id.company_id_id != self.company_id_id:
                raise ValidationError(
                    {"company_id": _("Link company must match cycle company.")}
                )
            if not self.company_id_id:
                self.company_id = self.cycle_id.company_id

        if (
            hasattr(self, "employee_objective_id")
            and self.employee_objective_id_id
            and self.company_id_id
        ):
            emp = self.employee_objective_id.employee_id
            if emp:
                work_info = getattr(emp, "employee_work_info", None)
                if work_info and work_info.company_id_id:
                    if work_info.company_id_id != self.company_id_id:
                        raise ValidationError(
                            {
                                "employee_objective_id": _(
                                    "Employee objective belongs to a different company."
                                )
                            }
                        )
