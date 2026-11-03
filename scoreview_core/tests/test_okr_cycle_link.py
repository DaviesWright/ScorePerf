"""Unit tests for OKRCycleLink bridging pms.EmployeeObjective with PerformanceCycle (Phase 1)."""

from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from horilla.testkit import make_company, make_employee
from pms.models import EmployeeObjective, Objective
from scoreview_core.models import (
    CycleStatus,
    FrameworkCode,
    FrameworkType,
    OKRCycleLink,
    PerformanceCycle,
)


class OKRCycleLinkTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company_a = make_company("Alpha OKR Corp")
        cls.company_b = make_company("Beta OKR Corp")

        cls.emp_a = make_employee(
            company=cls.company_a,
            email="emp_okr_a@alpha.test",
            first_name="Emp",
            last_name="A",
            phone="5000021",
        )
        cls.emp_b = make_employee(
            company=cls.company_b,
            email="emp_okr_b@beta.test",
            first_name="Emp",
            last_name="B",
            phone="5000022",
        )

        cls.okr_type = FrameworkType.objects.get(code=FrameworkCode.OKR)
        cls.mbo_type = FrameworkType.objects.get(code=FrameworkCode.MBO)

        today = date.today()
        cls.okr_cycle_a = PerformanceCycle.objects.create(
            company_id=cls.company_a,
            framework_type=cls.okr_type,
            title="Q1 OKR Cycle",
            start_date=today,
            end_date=today + timedelta(days=90),
            status=CycleStatus.DRAFT,
        )
        cls.mbo_cycle_a = PerformanceCycle.objects.create(
            company_id=cls.company_a,
            framework_type=cls.mbo_type,
            title="2026 MBO Cycle",
            start_date=today,
            end_date=today + timedelta(days=365),
            status=CycleStatus.DRAFT,
        )

        cls.parent_obj_a = Objective.objects.create(
            title="Grow Revenue A",
            company_id=cls.company_a,
        )
        cls.emp_objective_a = EmployeeObjective.objects.create(
            objective_id=cls.parent_obj_a,
            employee_id=cls.emp_a,
            start_date=today,
            end_date=today + timedelta(days=90),
        )

        cls.parent_obj_b = Objective.objects.create(
            title="Grow Revenue B",
            company_id=cls.company_b,
        )
        cls.emp_objective_b = EmployeeObjective.objects.create(
            objective_id=cls.parent_obj_b,
            employee_id=cls.emp_b,
            start_date=today,
            end_date=today + timedelta(days=90),
        )

    def test_create_valid_okr_cycle_link(self):
        """Link an EmployeeObjective to an OKR PerformanceCycle successfully."""
        link = OKRCycleLink.objects.create(
            company_id=self.company_a,
            cycle_id=self.okr_cycle_a,
            employee_objective_id=self.emp_objective_a,
        )
        link.full_clean()

        self.assertEqual(link.cycle_id, self.okr_cycle_a)
        self.assertEqual(link.employee_objective_id, self.emp_objective_a)
        self.assertEqual(self.emp_objective_a.cycle_link, link)
        self.assertIn(link, self.okr_cycle_a.okr_links.all())

    def test_company_auto_populated_from_cycle_if_omitted_in_clean(self):
        """If company_id is omitted when building the model instance, clean() defaults it to cycle's company."""
        link = OKRCycleLink(
            cycle_id=self.okr_cycle_a,
            employee_objective_id=self.emp_objective_a,
        )
        link.clean()
        self.assertEqual(link.company_id, self.okr_cycle_a.company_id)

    def test_linking_to_non_okr_cycle_raises_validation_error(self):
        """Attaching an OKR objective to an MBO or BSC cycle must fail validation."""
        link = OKRCycleLink(
            company_id=self.company_a,
            cycle_id=self.mbo_cycle_a,
            employee_objective_id=self.emp_objective_a,
        )
        with self.assertRaises(ValidationError) as ctx:
            link.full_clean()
        self.assertIn("cycle_id", ctx.exception.message_dict)

    def test_company_mismatch_raises_validation_error(self):
        """Link company must match the cycle's company."""
        link = OKRCycleLink(
            company_id=self.company_b,
            cycle_id=self.okr_cycle_a,
            employee_objective_id=self.emp_objective_a,
        )
        with self.assertRaises(ValidationError) as ctx:
            link.full_clean()
        self.assertIn("company_id", ctx.exception.message_dict)

    def test_objective_company_mismatch_raises_validation_error(self):
        """Employee objective employee company must match link/cycle company."""
        link = OKRCycleLink(
            company_id=self.company_a,
            cycle_id=self.okr_cycle_a,
            employee_objective_id=self.emp_objective_b,
        )
        with self.assertRaises(ValidationError) as ctx:
            link.full_clean()
        self.assertIn("employee_objective_id", ctx.exception.message_dict)

    def test_one_to_one_uniqueness_on_employee_objective(self):
        """An EmployeeObjective cannot be linked to more than one cycle."""
        OKRCycleLink.objects.create(
            company_id=self.company_a,
            cycle_id=self.okr_cycle_a,
            employee_objective_id=self.emp_objective_a,
        )
        another_cycle = PerformanceCycle.objects.create(
            company_id=self.company_a,
            framework_type=self.okr_type,
            title="Q2 OKR Cycle",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            status=CycleStatus.DRAFT,
        )
        duplicate_link = OKRCycleLink(
            company_id=self.company_a,
            cycle_id=another_cycle,
            employee_objective_id=self.emp_objective_a,
        )
        with self.assertRaises((IntegrityError, ValidationError)):
            duplicate_link.save()

