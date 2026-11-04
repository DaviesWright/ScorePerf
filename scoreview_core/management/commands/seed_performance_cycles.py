"""Seed sample performance cycles, framework configurations, assignments, and OKR links.

Generates deterministic sample data for development and manual testing.
All created records are prefixed with "[Sample]" so they can be identified
and cleaned up with --reset.

Usage:
    python manage.py seed_performance_cycles
    python manage.py seed_performance_cycles --reset
"""

from datetime import date
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from base.models import Company
from employee.models import Employee
from pms.models import (
    EmployeeKeyResult,
    EmployeeObjective,
    KeyResult,
    Objective,
)
from scoreview_core.models import (
    CycleStatus,
    FrameworkCode,
    FrameworkConfiguration,
    FrameworkType,
    OKRCycleLink,
    PerformanceAssignment,
    PerformanceCycle,
)

SAMPLE_TAG = "[Sample]"


class Command(BaseCommand):
    help = "Seed sample performance cycles, framework configurations, and OKR cycle links."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove previously generated [Sample] performance cycles, configurations, and links.",
        )
        parser.add_argument(
            "--company-id",
            type=int,
            help="Target company ID (defaults to HQ company or first available).",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self._handle_reset()
            return

        self._handle_seed(company_id=options.get("company_id"))

    def _handle_reset(self):
        self.stdout.write("Removing sample performance cycles and associated test records...")
        with transaction.atomic():
            links_deleted = OKRCycleLink.objects.filter(
                cycle_id__title__startswith=SAMPLE_TAG
            ).delete()[0]

            assignments_deleted = PerformanceAssignment.objects.filter(
                cycle_id__title__startswith=SAMPLE_TAG
            ).delete()[0]

            cycles_deleted = PerformanceCycle.objects.filter(
                title__startswith=SAMPLE_TAG
            ).delete()[0]

            configs_deleted = FrameworkConfiguration.objects.filter(
                settings__sample_seed=True
            ).delete()[0]

            # Also delete sample objectives created by this seeder
            sample_emp_objs = EmployeeObjective.objects.filter(
                objective__startswith=SAMPLE_TAG
            )
            EmployeeKeyResult.objects.filter(
                employee_objective_id__in=sample_emp_objs
            ).delete()
            sample_emp_objs.delete()
            Objective.objects.filter(title__startswith=SAMPLE_TAG).delete()
            KeyResult.objects.filter(title__startswith=SAMPLE_TAG).delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Reset complete. Deleted {cycles_deleted} cycles, {assignments_deleted} assignments, "
                f"{links_deleted} OKR links, and {configs_deleted} framework configurations."
            )
        )

    def _handle_seed(self, company_id=None):
        if company_id:
            company = Company.objects.filter(pk=company_id).first()
            if not company:
                raise CommandError(f"Company with ID {company_id} does not exist.")
        else:
            company = Company.objects.filter(hq=True).first() or Company.objects.first()
            if not company:
                raise CommandError("No company found in database. Please create a company first.")

        self.stdout.write(f"Target company: {company.company} (ID: {company.id})")

        # Get FrameworkTypes
        okr_type = FrameworkType.objects.get(code=FrameworkCode.OKR)
        mbo_type = FrameworkType.objects.get(code=FrameworkCode.MBO)
        bsc_type = FrameworkType.objects.get(code=FrameworkCode.BSC)

        with transaction.atomic():
            # 1. Framework Configurations
            okr_config, _ = FrameworkConfiguration.objects.update_or_create(
                company_id=company,
                framework_type=okr_type,
                version=1,
                defaults={
                    "settings": {
                        "cadence": "quarterly",
                        "scoring_scale": "0.0-1.0",
                        "max_objectives": 5,
                        "check_in_frequency_days": 14,
                        "sample_seed": True,
                    }
                },
            )
            mbo_config, _ = FrameworkConfiguration.objects.update_or_create(
                company_id=company,
                framework_type=mbo_type,
                version=1,
                defaults={
                    "settings": {
                        "cadence": "annual",
                        "weights_enabled": True,
                        "manager_approval_required": True,
                        "sample_seed": True,
                    }
                },
            )
            bsc_config, _ = FrameworkConfiguration.objects.update_or_create(
                company_id=company,
                framework_type=bsc_type,
                version=1,
                defaults={
                    "settings": {
                        "perspectives": [
                            "Financial",
                            "Customer",
                            "Internal Processes",
                            "Learning & Growth",
                        ],
                        "sample_seed": True,
                    }
                },
            )

            # 2. Performance Cycles in various lifecycle states
            cycles_data = [
                {
                    "title": f"{SAMPLE_TAG} Q1 2026 OKR Execution",
                    "description": "Active quarterly execution cycle for company-wide outcome delivery.",
                    "framework_type": okr_type,
                    "framework_configuration": okr_config,
                    "start_date": date(2026, 1, 1),
                    "end_date": date(2026, 3, 31),
                    "status": CycleStatus.ACTIVE,
                },
                {
                    "title": f"{SAMPLE_TAG} Q4 2025 OKR Retrospective",
                    "description": "Closed cycle for historical reporting and audit verification.",
                    "framework_type": okr_type,
                    "framework_configuration": okr_config,
                    "start_date": date(2025, 10, 1),
                    "end_date": date(2025, 12, 31),
                    "status": CycleStatus.CLOSED,
                },
                {
                    "title": f"{SAMPLE_TAG} Q2 2026 OKR Planning",
                    "description": "Draft stage cycle for upcoming quarterly planning.",
                    "framework_type": okr_type,
                    "framework_configuration": okr_config,
                    "start_date": date(2026, 4, 1),
                    "end_date": date(2026, 6, 30),
                    "status": CycleStatus.DRAFT,
                },
                {
                    "title": f"{SAMPLE_TAG} FY2026 MBO Strategic Goals",
                    "description": "Configured annual management by objectives cycle.",
                    "framework_type": mbo_type,
                    "framework_configuration": mbo_config,
                    "start_date": date(2026, 1, 1),
                    "end_date": date(2026, 12, 31),
                    "status": CycleStatus.CONFIGURED,
                },
                {
                    "title": f"{SAMPLE_TAG} FY2026 Balanced Scorecard",
                    "description": "Approved corporate four-perspective scorecard cycle.",
                    "framework_type": bsc_type,
                    "framework_configuration": bsc_config,
                    "start_date": date(2026, 1, 1),
                    "end_date": date(2026, 12, 31),
                    "status": CycleStatus.APPROVED,
                },
            ]

            created_cycles = []
            for c_data in cycles_data:
                cycle, _ = PerformanceCycle.objects.update_or_create(
                    company_id=company,
                    title=c_data["title"],
                    defaults={
                        "description": c_data["description"],
                        "framework_type": c_data["framework_type"],
                        "framework_configuration": c_data["framework_configuration"],
                        "start_date": c_data["start_date"],
                        "end_date": c_data["end_date"],
                        "status": c_data["status"],
                    },
                )
                created_cycles.append(cycle)

            # 3. Performance Assignments
            employees = list(
                Employee.objects.filter(employee_work_info__company_id=company)[:10]
            )
            if not employees:
                employees = list(Employee.objects.all()[:10])

            assignments_count = 0
            # Assign employees to active and configured cycles
            for cycle in created_cycles:
                if cycle.status in (CycleStatus.ACTIVE, CycleStatus.CONFIGURED, CycleStatus.APPROVED):
                    for emp in employees:
                        _, created = PerformanceAssignment.objects.get_or_create(
                            company_id=company,
                            cycle_id=cycle,
                            employee_id=emp,
                            defaults={"status": "assigned"},
                        )
                        if created:
                            assignments_count += 1

            # 4. Sample OKR Objectives and OKRCycleLinks
            active_okr_cycle = next(
                c for c in created_cycles if c.framework_type == okr_type and c.status == CycleStatus.ACTIVE
            )

            links_count = 0
            if employees:
                primary_emp = employees[0]
                sample_parent_obj, _ = Objective.objects.get_or_create(
                    title=f"{SAMPLE_TAG} Accelerate Enterprise Growth",
                    company_id=company,
                    defaults={
                        "description": "Achieve robust recurring revenue and customer retention.",
                        "duration": 90,
                    },
                )

                sample_kr, _ = KeyResult.objects.get_or_create(
                    title=f"{SAMPLE_TAG} Achieve $500k ARR Expansion",
                    company_id=company,
                    defaults={
                        "description": "Net new enterprise ARR bookings.",
                        "progress_type": "percentage",
                        "target_value": 100,
                        "duration": 90,
                    },
                )
                sample_parent_obj.key_result_id.add(sample_kr)

                sample_emp_obj, _ = EmployeeObjective.objects.get_or_create(
                    objective_id=sample_parent_obj,
                    employee_id=primary_emp,
                    defaults={
                        "objective": f"{SAMPLE_TAG} Enterprise Expansion Delivery",
                        "objective_description": "Drive mid-market and enterprise expansion.",
                        "start_date": date(2026, 1, 1),
                        "end_date": date(2026, 3, 31),
                        "status": "On Track",
                        "progress_percentage": 50,
                    },
                )
                sample_emp_obj.key_result_id.add(sample_kr)

                sample_emp_kr, _ = EmployeeKeyResult.objects.get_or_create(
                    employee_objective_id=sample_emp_obj,
                    key_result_id=sample_kr,
                    defaults={
                        "start_value": 0,
                        "current_value": 50,
                        "target_value": 100,
                        "start_date": date(2026, 1, 1),
                        "status": "On Track",
                        "progress_percentage": 50,
                    },
                )

                # Link EmployeeObjective to the active OKR PerformanceCycle
                link, link_created = OKRCycleLink.objects.update_or_create(
                    employee_objective_id=sample_emp_obj,
                    defaults={
                        "company_id": company,
                        "cycle_id": active_okr_cycle,
                    },
                )
                if link_created:
                    links_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded sample performance data:\n"
                f"  - Framework Configurations: 3 (OKR, MBO, BSC)\n"
                f"  - Performance Cycles: {len(created_cycles)} (Active, Closed, Draft, Configured, Approved)\n"
                f"  - Performance Assignments: {assignments_count}\n"
                f"  - OKR Objectives & Key Results created\n"
                f"  - OKRCycleLink created connecting sample OKR to '{active_okr_cycle.title}'"
            )
        )

