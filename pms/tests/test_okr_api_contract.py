"""OKR REST API contract (backlog P1-00).

Pins what ``/api/v1/pms/`` returns for the OKR resources today, so the
multi-framework build (BUILD.md) cannot change a response the mobile client or
a report depends on without a test failing.

Scope: key-result, objective, employee-objective, employee-key-result, comment.
360 feedback, meetings and ``period`` are out of scope (ADR-0001).

These are CHARACTERISATION tests: they record behaviour so a change shows up as
a failing assertion. Changing behaviour is a product and security decision:
change the assertion in the same commit as the change, and say why in the
commit message.

The first version (commit d1532ab9b) pinned six quirks. ADR-0014 fixed five of
them, and the tests below now assert the fixed behaviour (see
``AccessRuleTests``, ``CreateDefaultsTests``, ``RelationValidationTests`` and
``SafeDeleteTests``):

* detail ``GET`` now follows the same access rule as the lists (403 otherwise);
* records created through the API get the creator's company;
* ``POST employee-key-result`` without its key result or objective is a 400;
* the owner can list their own employee key results;
* a failed delete no longer returns database error text.

Still pinned (API-wide convention, out of scope): a write by a user without the
permission answers 401 "No permission", not 403.

``force_authenticate`` bypasses the JWT class, so the company ContextVar is not
set here and the managers are unscoped. Tenant scoping is tested elsewhere.
"""

from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from employee.models import EmployeeWorkInformation
from horilla.testkit import make_company, make_employee, make_user
from horilla.testkit.company import clear_selected_company
from pms.models import (
    Comment,
    EmployeeKeyResult,
    EmployeeObjective,
    KeyResult,
    Objective,
)

BASE = "/api/v1/pms/"

KEY_RESULT_FIELDS = {
    "archive",
    "company_id",
    "created_at",
    "created_by",
    "description",
    "duration",
    "id",
    "is_active",
    "modified_by",
    "progress_type",
    "target_value",
    "title",
}
OBJECTIVE_FIELDS = {
    "add_assignees",
    "archive",
    "assignees",
    "company_id",
    "created_at",
    "created_by",
    "description",
    "duration",
    "duration_unit",
    "id",
    "is_active",
    "is_template",
    "key_result_id",
    "managers",
    "modified_by",
    "self_employee_progress_update",
    "title",
}
EMPLOYEE_OBJECTIVE_FIELDS = {
    "archive",
    "created_at",
    "created_by",
    "employee_id",
    "end_date",
    "id",
    "is_active",
    "key_result_id",
    "modified_by",
    "objective",
    "objective_description",
    "objective_id",
    "progress_percentage",
    "start_date",
    "status",
    "updated_at",
}
EMPLOYEE_KEY_RESULT_FIELDS = {
    "created_at",
    "current_value",
    "employee_objective_id",
    "end_date",
    "id",
    "key_result",
    "key_result_description",
    "key_result_id",
    "progress_percentage",
    "progress_type",
    "start_date",
    "start_value",
    "status",
    "target_value",
    "updated_at",
}
COMMENT_FIELDS = {
    "comment",
    "created_at",
    "employee_id",
    "employee_objective_id",
    "id",
}
PAGE_ENVELOPE = {"count", "next", "previous", "results"}

LIST_ENDPOINTS = {
    "key-result/": KEY_RESULT_FIELDS,
    "objective/": OBJECTIVE_FIELDS,
    "employee-objective/": EMPLOYEE_OBJECTIVE_FIELDS,
    "employee-key-result/": EMPLOYEE_KEY_RESULT_FIELDS,
    "comment/": COMMENT_FIELDS,
}


class OkrApiBase(TestCase):
    """Synthetic fixtures (test data only): one company, an owner, another employee."""

    @classmethod
    def setUpTestData(cls):
        cls.company = make_company("OKR API Test Co")
        cls.admin_user = make_user("okr_api_admin", is_superuser=True)
        cls.owner_user = make_user("okr_api_owner")
        cls.owner = make_employee(
            company=cls.company,
            email="okr_api_owner@test.horilla",
            user=cls.owner_user,
            phone="5000001",
        )
        cls.other_user = make_user("okr_api_other")
        cls.other = make_employee(
            company=cls.company,
            email="okr_api_other@test.horilla",
            user=cls.other_user,
            phone="5000002",
        )
        cls.boss_user = make_user("okr_api_boss")
        cls.boss = make_employee(
            company=cls.company,
            email="okr_api_boss@test.horilla",
            user=cls.boss_user,
            phone="5000003",
        )
        cls.obj_manager_user = make_user("okr_api_objmgr")
        cls.obj_manager = make_employee(
            company=cls.company,
            email="okr_api_objmgr@test.horilla",
            user=cls.obj_manager_user,
            phone="5000004",
        )
        cls.admin_employee = make_employee(
            company=cls.company,
            email="okr_api_admin@test.horilla",
            user=cls.admin_user,
            phone="5000005",
        )
        EmployeeWorkInformation.objects.filter(employee_id=cls.owner).update(
            reporting_manager_id=cls.boss
        )
        # make_employee() sets the company with a queryset update(), which leaves
        # the employee cached on the user stale (company still empty). In
        # production request.user.employee_get is read fresh, so drop the cache.
        cls.admin_user.refresh_from_db()
        cls.objective = Objective.objects.create(
            title="API objective",
            description="d",
            duration=30,
            company_id=cls.company,
        )
        cls.objective.managers.add(cls.obj_manager)
        cls.key_result = KeyResult.objects.create(
            title="API key result",
            description="d",
            target_value=100,
            duration=30,
            company_id=cls.company,
        )
        cls.objective.key_result_id.add(cls.key_result)
        cls.emp_objective = EmployeeObjective.objects.create(
            objective_id=cls.objective,
            employee_id=cls.owner,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
        )
        cls.emp_kr = EmployeeKeyResult.objects.create(
            employee_objective_id=cls.emp_objective,
            key_result_id=cls.key_result,
            start_value=0,
            current_value=50,
            target_value=100,
            start_date=date(2026, 1, 1),
        )
        cls.comment = Comment.objects.create(
            comment="hello",
            employee_id=cls.owner,
            employee_objective_id=cls.emp_objective,
        )

    def setUp(self):
        self.admin = APIClient(raise_request_exception=False)
        self.admin.force_authenticate(user=self.admin_user)
        self.owner_client = APIClient(raise_request_exception=False)
        self.owner_client.force_authenticate(user=self.owner_user)
        self.other_client = APIClient(raise_request_exception=False)
        self.other_client.force_authenticate(user=self.other_user)
        self.boss_client = APIClient(raise_request_exception=False)
        self.boss_client.force_authenticate(user=self.boss_user)
        self.objmgr_client = APIClient(raise_request_exception=False)
        self.objmgr_client.force_authenticate(user=self.obj_manager_user)
        self.anon = APIClient(raise_request_exception=False)

    def tearDown(self):
        clear_selected_company()
        super().tearDown()

    def results(self, response):
        self.assertEqual(response.status_code, 200, response.content[:300])
        self.assertEqual(set(response.json()), PAGE_ENVELOPE)
        return response.json()["results"]


class AuthenticationTests(OkrApiBase):
    def test_anonymous_requests_are_rejected_with_401(self):
        urls = [BASE + p for p in LIST_ENDPOINTS] + [
            f"{BASE}key-result/{self.key_result.pk}/",
            f"{BASE}objective/{self.objective.pk}/",
            f"{BASE}employee-objective/{self.emp_objective.pk}/",
            f"{BASE}employee-key-result/{self.emp_kr.pk}/",
            f"{BASE}comment/{self.comment.pk}/",
        ]
        for url in urls:
            with self.subTest(url=url):
                response = self.anon.get(url)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(
                    response.json(),
                    {"detail": "Authentication credentials were not provided."},
                )


class ListContractTests(OkrApiBase):
    def test_lists_are_paginated_with_the_documented_envelope_and_fields(self):
        for path, fields in LIST_ENDPOINTS.items():
            with self.subTest(path=path):
                rows = self.results(self.admin.get(BASE + path))
                self.assertEqual(len(rows), 1)
                self.assertEqual(set(rows[0]), fields)

    def test_detail_responses_have_the_same_fields_as_list_rows(self):
        details = {
            f"key-result/{self.key_result.pk}/": KEY_RESULT_FIELDS,
            f"objective/{self.objective.pk}/": OBJECTIVE_FIELDS,
            f"employee-objective/{self.emp_objective.pk}/": EMPLOYEE_OBJECTIVE_FIELDS,
            f"employee-key-result/{self.emp_kr.pk}/": EMPLOYEE_KEY_RESULT_FIELDS,
            f"comment/{self.comment.pk}/": COMMENT_FIELDS,
        }
        for path, fields in details.items():
            with self.subTest(path=path):
                response = self.admin.get(BASE + path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(set(response.json()), fields)

    def test_related_objects_are_returned_nested_not_as_bare_ids(self):
        row = self.results(self.admin.get(BASE + "employee-objective/"))[0]
        self.assertEqual(
            row["objective_id"], {"id": self.objective.pk, "title": "API objective"}
        )
        self.assertEqual(
            set(row["employee_id"]),
            {"id", "employee_first_name", "employee_last_name", "get_full_name"},
        )

    def test_missing_record_is_404_with_an_error_message(self):
        response = self.admin.get(BASE + "key-result/999999/")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"error": "KeyResult not found"})

    def test_nested_list_routes_filter_by_parent(self):
        owner_rows = self.results(
            self.admin.get(f"{BASE}employee/{self.owner.pk}/employee-objective/")
        )
        other_rows = self.results(
            self.admin.get(f"{BASE}employee/{self.other.pk}/employee-objective/")
        )
        self.assertEqual([r["id"] for r in owner_rows], [self.emp_objective.pk])
        self.assertEqual(other_rows, [])
        by_objective = self.results(
            self.admin.get(f"{BASE}objective/{self.objective.pk}/employee-objective/")
        )
        self.assertEqual(len(by_objective), 1)
        krs = self.results(
            self.admin.get(
                f"{BASE}employee-objective/{self.emp_objective.pk}/employee-key-result/"
            )
        )
        self.assertEqual([r["id"] for r in krs], [self.emp_kr.pk])


class PermissionTests(OkrApiBase):
    def test_user_without_permission_sees_a_restricted_list(self):
        """No view permission: definitions are hidden, own records are shown."""
        self.assertEqual(self.results(self.owner_client.get(BASE + "key-result/")), [])
        self.assertEqual(self.results(self.owner_client.get(BASE + "objective/")), [])
        own = self.results(self.owner_client.get(BASE + "employee-objective/"))
        self.assertEqual([r["id"] for r in own], [self.emp_objective.pk])
        comments = self.results(self.owner_client.get(BASE + "comment/"))
        self.assertEqual([r["id"] for r in comments], [self.comment.pk])

    def test_other_employee_does_not_see_the_owners_records_in_lists(self):
        for path in ("employee-objective/", "comment/"):
            with self.subTest(path=path):
                self.assertEqual(self.results(self.other_client.get(BASE + path)), [])

    def test_writes_without_permission_answer_401_not_403(self):
        calls = [
            self.owner_client.post(
                BASE + "key-result/", {"title": "x", "description": "d"}, format="json"
            ),
            self.owner_client.put(
                f"{BASE}objective/{self.objective.pk}/",
                {"title": "hack"},
                format="json",
            ),
            self.owner_client.delete(f"{BASE}key-result/{self.key_result.pk}/"),
            self.owner_client.delete(f"{BASE}comment/{self.comment.pk}/"),
        ]
        for response in calls:
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json(), {"message": "No permission"})
        self.objective.refresh_from_db()
        self.assertEqual(self.objective.title, "API objective")
        self.assertTrue(KeyResult.objects.filter(pk=self.key_result.pk).exists())


class WriteContractTests(OkrApiBase):
    def test_create_key_result(self):
        response = self.admin.post(
            BASE + "key-result/",
            {
                "title": "New KR",
                "description": "d",
                "target_value": 10,
                "progress_type": "#",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), KEY_RESULT_FIELDS)
        self.assertEqual(response.json()["title"], "New KR")

    def test_create_validation_errors_are_field_keyed_400s(self):
        response = self.admin.post(BASE + "key-result/", {"title": "x"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"description": ["This field is required."]})

    def test_partial_update_changes_only_the_sent_fields(self):
        response = self.admin.put(
            f"{BASE}key-result/{self.key_result.pk}/",
            {"title": "Renamed"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.key_result.refresh_from_db()
        self.assertEqual(self.key_result.title, "Renamed")
        self.assertEqual(self.key_result.target_value, 100)

    def test_create_objective(self):
        response = self.admin.post(
            BASE + "objective/",
            {
                "title": "New objective",
                "description": "d",
                "duration": 5,
                "duration_unit": "days",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), OBJECTIVE_FIELDS)

    def test_create_employee_objective_uses_write_suffixed_fields(self):
        body = {
            "objective_id_write": self.objective.pk,
            "employee_id_write": self.other.pk,
            "start_date": "2026-02-01",
            "end_date": "2026-04-01",
        }
        response = self.admin.post(BASE + "employee-objective/", body, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()), EMPLOYEE_OBJECTIVE_FIELDS)

    def test_plain_field_names_are_not_accepted_for_relations(self):
        """The read names (objective_id, employee_id) are nested read-only fields."""
        body = {
            "objective_id": self.objective.pk,
            "employee_id": self.other.pk,
            "start_date": "2026-02-01",
            "end_date": "2026-04-01",
        }
        response = self.admin.post(BASE + "employee-objective/", body, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "employee_id_write": ["This field is required."],
                "objective_id_write": ["This field is required."],
            },
        )

    def test_one_objective_per_employee_is_enforced(self):
        body = {
            "objective_id_write": self.objective.pk,
            "employee_id_write": self.owner.pk,
            "start_date": "2026-02-01",
            "end_date": "2026-04-01",
        }
        response = self.admin.post(BASE + "employee-objective/", body, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "non_field_errors": [
                    "The fields employee_id_write, objective_id_write must make a unique set."
                ]
            },
        )

    def test_create_employee_key_result_through_nested_route(self):
        response = self.admin.post(
            f"{BASE}employee-objective/{self.emp_objective.pk}/employee-key-result/",
            {
                "key_result_id_write": self.key_result.pk,
                "current_value": 10,
                "target_value": 20,
                "start_date": "2026-01-01",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["key_result_id"]["id"], self.key_result.pk)
        self.assertEqual(
            response.json()["employee_objective_id"]["id"], self.emp_objective.pk
        )

    def test_updating_current_value_recomputes_key_result_and_objective_progress(self):
        response = self.admin.put(
            f"{BASE}employee-key-result/{self.emp_kr.pk}/",
            {"current_value": 75},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.emp_kr.refresh_from_db()
        self.emp_objective.refresh_from_db()
        self.assertEqual(self.emp_kr.progress_percentage, 75)
        self.assertEqual(self.emp_objective.progress_percentage, 75)

    def test_key_result_progress_can_exceed_100_but_objective_progress_is_capped(self):
        self.admin.put(
            f"{BASE}employee-key-result/{self.emp_kr.pk}/",
            {"current_value": 150},
            format="json",
        )
        self.emp_kr.refresh_from_db()
        self.emp_objective.refresh_from_db()
        self.assertEqual(self.emp_kr.progress_percentage, 150)
        self.assertEqual(self.emp_objective.progress_percentage, 100)

    def test_update_employee_objective_status(self):
        response = self.admin.put(
            f"{BASE}employee-objective/{self.emp_objective.pk}/",
            {"status": "On Track"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "On Track")

    def test_comment_create_update_delete(self):
        created = self.admin.post(
            BASE + "comment/",
            {
                "comment": "second",
                "employee_id_write": self.owner.pk,
                "employee_objective_id_write": self.emp_objective.pk,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(set(created.json()), COMMENT_FIELDS)
        pk = created.json()["id"]
        edited = self.admin.put(
            f"{BASE}comment/{pk}/", {"comment": "edited"}, format="json"
        )
        self.assertEqual(edited.json()["comment"], "edited")
        self.assertEqual(self.admin.delete(f"{BASE}comment/{pk}/").status_code, 204)
        self.assertEqual(self.admin.get(f"{BASE}comment/{pk}/").status_code, 404)

    def test_objective_with_assignments_cannot_be_deleted(self):
        response = self.admin.delete(f"{BASE}objective/{self.objective.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())
        self.assertTrue(Objective.objects.filter(pk=self.objective.pk).exists())

    def test_deleting_an_employee_objective_removes_its_key_results(self):
        response = self.admin.delete(
            f"{BASE}employee-objective/{self.emp_objective.pk}/"
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(EmployeeKeyResult.objects.filter(pk=self.emp_kr.pk).exists())


class AccessRuleTests(OkrApiBase):
    """ADR-0014: a detail GET follows the same rule as the lists.

    Allowed: holds the view permission, owns the record, is the owner's
    reporting manager, or manages the objective. Anyone else gets 403.
    """

    def detail_urls(self):
        return {
            "key-result": f"{BASE}key-result/{self.key_result.pk}/",
            "objective": f"{BASE}objective/{self.objective.pk}/",
            "employee-objective": f"{BASE}employee-objective/{self.emp_objective.pk}/",
            "employee-key-result": f"{BASE}employee-key-result/{self.emp_kr.pk}/",
            "comment": f"{BASE}comment/{self.comment.pk}/",
        }

    def test_an_unrelated_employee_is_refused_everywhere_with_403(self):
        for name, url in self.detail_urls().items():
            with self.subTest(resource=name):
                response = self.other_client.get(url)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(set(response.json()), {"detail"})

    def test_the_owner_can_read_their_own_records(self):
        for name, url in self.detail_urls().items():
            with self.subTest(resource=name):
                self.assertEqual(self.owner_client.get(url).status_code, 200)

    def test_the_reporting_manager_reads_the_assignment_but_not_the_definitions(self):
        urls = self.detail_urls()
        for name in ("employee-objective", "employee-key-result", "comment"):
            with self.subTest(resource=name):
                self.assertEqual(self.boss_client.get(urls[name]).status_code, 200)
        for name in ("objective", "key-result"):
            with self.subTest(resource=name):
                self.assertEqual(self.boss_client.get(urls[name]).status_code, 403)

    def test_an_objective_manager_reads_the_objective_and_its_assignments(self):
        for name, url in self.detail_urls().items():
            with self.subTest(resource=name):
                self.assertEqual(self.objmgr_client.get(url).status_code, 200)

    def test_a_superuser_can_read_everything(self):
        for name, url in self.detail_urls().items():
            with self.subTest(resource=name):
                self.assertEqual(self.admin.get(url).status_code, 200)

    def test_the_owner_can_list_their_own_employee_key_results(self):
        rows = self.results(self.owner_client.get(BASE + "employee-key-result/"))
        self.assertEqual([r["id"] for r in rows], [self.emp_kr.pk])

    def test_the_reporting_manager_lists_the_reports_employee_key_results(self):
        rows = self.results(self.boss_client.get(BASE + "employee-key-result/"))
        self.assertEqual([r["id"] for r in rows], [self.emp_kr.pk])

    def test_an_unrelated_employee_lists_no_employee_key_results(self):
        self.assertEqual(
            self.results(self.other_client.get(BASE + "employee-key-result/")), []
        )


class CreateDefaultsTests(OkrApiBase):
    """ADR-0014: records created through the API get the creator's company."""

    def test_a_new_key_result_gets_the_creators_company(self):
        response = self.admin.post(
            BASE + "key-result/",
            {"title": "Defaulted", "description": "d"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.json()["company_id"],
            {"id": self.company.pk, "company": "OKR API Test Co"},
        )

    def test_a_new_objective_gets_the_creators_company(self):
        response = self.admin.post(
            BASE + "objective/",
            {"title": "Defaulted", "description": "d", "duration": 5},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["company_id"]["id"], self.company.pk)

    def test_an_explicit_company_is_respected(self):
        elsewhere = make_company("OKR API Other Co", hq=False)
        response = self.admin.post(
            BASE + "key-result/",
            {"title": "Explicit", "description": "d", "company_id_write": elsewhere.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["company_id"]["id"], elsewhere.pk)

    def test_a_creator_with_no_employee_record_leaves_the_company_empty(self):
        loner = APIClient(raise_request_exception=False)
        loner.force_authenticate(user=make_user("okr_api_loner", is_superuser=True))
        response = loner.post(
            BASE + "key-result/",
            {"title": "No employee", "description": "d"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(response.json()["company_id"])


class RelationValidationTests(OkrApiBase):
    """ADR-0014: an employee key result needs its objective and key result."""

    REQUIRED = ["This field is required."]

    def post(self, body):
        return self.admin.post(BASE + "employee-key-result/", body, format="json")

    def test_a_key_result_is_required_even_with_a_start_date(self):
        response = self.post(
            {
                "employee_objective_id_write": self.emp_objective.pk,
                "current_value": 1,
                "target_value": 2,
                "start_date": "2026-01-01",
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"key_result_id_write": self.REQUIRED})

    def test_a_key_result_is_required_without_a_start_date_too(self):
        response = self.post(
            {
                "employee_objective_id_write": self.emp_objective.pk,
                "current_value": 1,
                "target_value": 2,
            }
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"key_result_id_write": self.REQUIRED})

    def test_an_employee_objective_is_required(self):
        response = self.post(
            {"key_result_id_write": self.key_result.pk, "current_value": 1}
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {"employee_objective_id_write": self.REQUIRED}
        )

    def test_both_missing_are_reported_together(self):
        response = self.post({"current_value": 1})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(),
            {
                "employee_objective_id_write": self.REQUIRED,
                "key_result_id_write": self.REQUIRED,
            },
        )

    def test_updating_does_not_require_the_relations(self):
        response = self.admin.put(
            f"{BASE}employee-key-result/{self.emp_kr.pk}/",
            {"current_value": 60},
            format="json",
        )
        self.assertEqual(response.status_code, 200)


class SafeDeleteTests(OkrApiBase):
    """ADR-0014: a failed delete answers with a generic message, not database text."""

    def test_deleting_a_record_in_use_gives_a_generic_message(self):
        response = self.admin.delete(f"{BASE}objective/{self.objective.pk}/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {"error": "This record is in use and cannot be deleted."}
        )
        self.assertNotIn("protected", response.content.decode().lower())
