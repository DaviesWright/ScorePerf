"""Unit tests for PerformanceCycle lifecycle state machine and validation (Phase 1)."""

from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase

from horilla.testkit import make_company, make_employee, make_user
from scoreview_core.models import (
    CycleStatus,
    FrameworkCode,
    FrameworkConfiguration,
    FrameworkType,
    PerformanceAssignment,
    PerformanceCycle,
)
from scoreview_core.services import (
    ALLOWED_CYCLE_TRANSITIONS,
    CycleTransitionError,
    can_transition_cycle,
    transition_cycle_status,
)


class CycleLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company_a = make_company("Alpha Core Corp")
        cls.company_b = make_company("Beta Core Corp")
        cls.user = make_user("admin_core")
        cls.employee_a = make_employee(
            company=cls.company_a,
            email="emp_a@alpha.test",
            first_name="Emp",
            last_name="Alpha",
            phone="5000011",
        )
        cls.employee_b = make_employee(
            company=cls.company_b,
            email="emp_b@beta.test",
            first_name="Emp",
            last_name="Beta",
            phone="5000012",
        )

        cls.okr_type = FrameworkType.objects.get(code=FrameworkCode.OKR)
        cls.mbo_type = FrameworkType.objects.get(code=FrameworkCode.MBO)
        cls.bsc_type = FrameworkType.objects.get(code=FrameworkCode.BSC)

    def _create_cycle(self, company=None, framework_type=None, status=CycleStatus.DRAFT):
        company = company or self.company_a
        framework_type = framework_type or self.okr_type
        today = date.today()
        return PerformanceCycle.objects.create(
            company_id=company,
            framework_type=framework_type,
            title="Q1 2026 Strategy",
            start_date=today,
            end_date=today + timedelta(days=90),
            status=status,
        )

    def test_full_happy_path_lifecycle(self):
        """Walk through draft -> configured -> approved -> active -> review -> calibration -> approval -> certified -> published -> closed."""
        cycle = self._create_cycle()
        self.assertEqual(cycle.status, CycleStatus.DRAFT)

        path = [
            CycleStatus.CONFIGURED,
            CycleStatus.APPROVED,
            CycleStatus.ACTIVE,
            CycleStatus.REVIEW,
            CycleStatus.CALIBRATION,
            CycleStatus.APPROVAL,
            CycleStatus.CERTIFIED,
            CycleStatus.PUBLISHED,
            CycleStatus.CLOSED,
        ]

        for target in path:
            self.assertTrue(can_transition_cycle(cycle, target))
            cycle = transition_cycle_status(cycle, target, actor=self.user)
            self.assertEqual(cycle.status, target)
            self.assertEqual(cycle.modified_by, self.user)

    def test_direct_review_to_approval_without_calibration(self):
        """Review stage can transition directly to approval if calibration is skipped."""
        cycle = self._create_cycle(status=CycleStatus.REVIEW)
        self.assertTrue(can_transition_cycle(cycle, CycleStatus.APPROVAL))
        cycle = transition_cycle_status(cycle, CycleStatus.APPROVAL)
        self.assertEqual(cycle.status, CycleStatus.APPROVAL)

    def test_permitted_backward_transitions(self):
        """Configured can revert to Draft, Approved can revert to Configured, Calibration can return to Review."""
        cycle = self._create_cycle(status=CycleStatus.CONFIGURED)
        cycle = transition_cycle_status(cycle, CycleStatus.DRAFT)
        self.assertEqual(cycle.status, CycleStatus.DRAFT)

        cycle = transition_cycle_status(cycle, CycleStatus.CONFIGURED)
        cycle = transition_cycle_status(cycle, CycleStatus.APPROVED)
        cycle = transition_cycle_status(cycle, CycleStatus.CONFIGURED)
        self.assertEqual(cycle.status, CycleStatus.CONFIGURED)

        cycle = transition_cycle_status(cycle, CycleStatus.APPROVED)
        cycle = transition_cycle_status(cycle, CycleStatus.ACTIVE)
        cycle = transition_cycle_status(cycle, CycleStatus.REVIEW)
        cycle = transition_cycle_status(cycle, CycleStatus.CALIBRATION)
        cycle = transition_cycle_status(cycle, CycleStatus.REVIEW)
        self.assertEqual(cycle.status, CycleStatus.REVIEW)

    def test_disallowed_transitions_raise_cycle_transition_error(self):
        """Invalid transitions (e.g. Draft -> Active, Draft -> Closed) must raise CycleTransitionError."""
        cycle = self._create_cycle(status=CycleStatus.DRAFT)
        with self.assertRaises(CycleTransitionError):
            transition_cycle_status(cycle, CycleStatus.ACTIVE)

        with self.assertRaises(CycleTransitionError):
            transition_cycle_status(cycle, CycleStatus.CLOSED)

        cycle = self._create_cycle(status=CycleStatus.CLOSED)
        with self.assertRaises(CycleTransitionError):
            transition_cycle_status(cycle, CycleStatus.ACTIVE)

    def test_unknown_status_raises_error(self):
        cycle = self._create_cycle()
        with self.assertRaises(CycleTransitionError):
            transition_cycle_status(cycle, "non_existent_status")

    def test_date_validation_start_after_end(self):
        """End date before start date must fail full_clean validation."""
        today = date.today()
        cycle = PerformanceCycle(
            company_id=self.company_a,
            framework_type=self.okr_type,
            title="Invalid Dates Cycle",
            start_date=today,
            end_date=today - timedelta(days=5),
        )
        with self.assertRaises(ValidationError) as ctx:
            cycle.full_clean()
        self.assertIn("end_date", ctx.exception.message_dict)

    def test_framework_configuration_company_mismatch(self):
        """Framework configuration must belong to the same company as the cycle."""
        config_b = FrameworkConfiguration.objects.create(
            company_id=self.company_b,
            framework_type=self.okr_type,
            version=1,
        )
        today = date.today()
        cycle = PerformanceCycle(
            company_id=self.company_a,
            framework_type=self.okr_type,
            framework_configuration=config_b,
            title="Cross Company Config Cycle",
            start_date=today,
            end_date=today + timedelta(days=90),
        )
        with self.assertRaises(ValidationError) as ctx:
            cycle.full_clean()
        self.assertIn("framework_configuration", ctx.exception.message_dict)

    def test_framework_configuration_type_mismatch(self):
        """Framework configuration type must match the cycle framework type."""
        config_mbo = FrameworkConfiguration.objects.create(
            company_id=self.company_a,
            framework_type=self.mbo_type,
            version=1,
        )
        today = date.today()
        cycle = PerformanceCycle(
            company_id=self.company_a,
            framework_type=self.okr_type,
            framework_configuration=config_mbo,
            title="Cross Framework Config Cycle",
            start_date=today,
            end_date=today + timedelta(days=90),
        )
        with self.assertRaises(ValidationError) as ctx:
            cycle.full_clean()
        self.assertIn("framework_configuration", ctx.exception.message_dict)

    def test_assignment_company_mismatch(self):
        """PerformanceAssignment company must match cycle company."""
        cycle = self._create_cycle(company=self.company_a)
        assignment = PerformanceAssignment(
            company_id=self.company_b,
            cycle_id=cycle,
            employee_id=self.employee_b,
        )
        with self.assertRaises(ValidationError) as ctx:
            assignment.full_clean()
        self.assertIn("company_id", ctx.exception.message_dict)

