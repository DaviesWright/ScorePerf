"""READ-ONLY: measure how the ADR-0012 progress formula would change stored OKR progress.

Nothing is written. For every employee key result it compares:

* ``stored``  the progress_percentage currently in the database;
* ``old``     today's formula recomputed, ``int(current / target * 100)``;
* ``new``     the ADR-0012 formula,
              ``max(0, int((current - start) / (target - start) * 100))``.

Where a formula is undefined (target 0 for ``old``, target == start for ``new``)
the code leaves the stored value unchanged, and so does this report.

It then does the same for employee objectives, whose progress is the integer
mean of their key results, each capped at 100.

Run it against a protected production copy before deciding whether to
recalculate stored progress (BUILD.md §6.3 and §22: no silent changes).

    python manage.py report_okr_progress_impact --examples 10
"""

from collections import Counter, defaultdict

from django.core.management.base import BaseCommand

from pms.models import EmployeeKeyResult, EmployeeObjective


def old_progress(current, target):
    """Today's formula (EmployeeKeyResult.update_kr_progress); None means unchanged."""
    if not target:
        return None
    return int(current / target * 100)


def new_progress(start, current, target):
    """ADR-0012 formula; None means unchanged."""
    if target == start:
        return None
    return max(0, int((current - start) / (target - start) * 100))


def objective_progress(values):
    """EmployeeObjective.update_objective_progress: integer mean of capped values."""
    return int(sum(min(v, 100) for v in values) / len(values)) if values else 0


class Command(BaseCommand):
    help = "Read-only impact report for the ADR-0012 key-result progress formula."

    def add_arguments(self, parser):
        parser.add_argument("--examples", type=int, default=8)

    def handle(self, *args, **opts):
        rows = list(
            EmployeeKeyResult.objects.values_list(
                "id",
                "employee_objective_id",
                "start_value",
                "current_value",
                "target_value",
                "progress_percentage",
            )
        )
        causes, examples = Counter(), []
        per_objective = defaultdict(lambda: ([], []))
        missing = stale = changed = 0
        deltas = []
        for pk, eo_id, start, current, target, stored in rows:
            if None in (start, current, target):
                missing += 1
                continue
            old = old_progress(current, target)
            new = new_progress(start, current, target)
            old_v = stored if old is None else old
            new_v = stored if new is None else new
            if old is not None and old != stored:
                stale += 1
            if new is None:
                causes["undefined under new formula (target == start)"] += 1
            if new_v != old_v:
                changed += 1
                deltas.append(abs(new_v - old_v))
                if start > target:
                    causes["decreasing key result (start above target)"] += 1
                elif current < start:
                    causes["current below start (floored at 0)"] += 1
                elif start != 0:
                    causes["non-zero start value"] += 1
                else:
                    causes["other"] += 1
                if len(examples) < opts["examples"]:
                    examples.append((pk, start, current, target, stored, old_v, new_v))
            if eo_id is not None:
                per_objective[eo_id][0].append(old_v)
                per_objective[eo_id][1].append(new_v)

        obj_changed = 0
        stored_obj = dict(
            EmployeeObjective.objects.values_list("id", "progress_percentage")
        )
        for old_vals, new_vals in per_objective.values():
            if objective_progress(new_vals) != objective_progress(old_vals):
                obj_changed += 1

        w = self.stdout.write
        w(
            self.style.MIGRATE_HEADING(
                "OKR progress impact (read-only, nothing written)"
            )
        )
        w(
            f"  employee key results examined: {len(rows)} "
            f"(skipped, missing values: {missing})"
        )
        w(f"  stored progress already differs from today's formula: {stale}")
        pct = f"{changed / max(len(rows) - missing, 1):.1%}"
        w(
            self.style.WARNING(
                f"  key results that WOULD CHANGE under the new formula: {changed} ({pct})"
            )
        )
        for cause, n in causes.most_common():
            w(f"      {cause}: {n}")
        if deltas:
            w(
                f"  size of change (points): max {max(deltas)}, "
                f"mean {sum(deltas) / len(deltas):.1f}"
            )
        w(f"  employee objectives examined: {len(per_objective)} of {len(stored_obj)}")
        w(
            self.style.WARNING(
                f"  employee objectives whose progress WOULD CHANGE: {obj_changed}"
            )
        )
        if examples:
            w("  examples (id, start, current, target | stored, old, new):")
            for e in examples:
                w(f"      {e[0]}: {e[1]}, {e[2]}, {e[3]} | {e[4]}, {e[5]}, {e[6]}")
