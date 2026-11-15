"""Reference date arithmetic only; not an approved production rule engine.

Assumptions are documented in docs/DOMAIN_MODEL.md. This module deliberately
does not decide which fixed occurrence a completion satisfies.
"""

from calendar import monthrange
from datetime import date, timedelta
from typing import Literal


Unit = Literal["days", "weeks", "months", "years"]


def _valid_date(value: date) -> None:
    if type(value) is not date:
        raise TypeError("expected a date without a time")


def calendar_occurrence(anchor: date, every: int, unit: Unit, index: int) -> date:
    """Return occurrence at zero-based index, anchored to the original date.

    A missing day in a target month is clamped to that month's last day.
    Repeated calls always use the original anchor, avoiding month-end drift.
    """
    _valid_date(anchor)
    if type(every) is not int or every < 1:
        raise ValueError("every must be a positive integer")
    if type(index) is not int or index < 0:
        raise ValueError("index must be a nonnegative integer")
    if unit == "days":
        return anchor + timedelta(days=every * index)
    if unit == "weeks":
        return anchor + timedelta(weeks=every * index)
    if unit == "months":
        month_number = anchor.year * 12 + anchor.month - 1 + every * index
        year, month_zero = divmod(month_number, 12)
        month = month_zero + 1
    elif unit == "years":
        year, month = anchor.year + every * index, anchor.month
    else:
        raise ValueError(f"unsupported unit: {unit}")
    day = min(anchor.day, monthrange(year, month)[1])
    return date(year, month, day)


def after_completion_due(
    initial_due: date, last_completed: date | None, every: int, unit: Unit
) -> date:
    """Return first due date or an interval after the last effective completion."""
    _valid_date(initial_due)
    if last_completed is None:
        # Validate the rule even without history.
        calendar_occurrence(initial_due, every, unit, 0)
        return initial_due
    _valid_date(last_completed)
    return calendar_occurrence(last_completed, every, unit, 1)


def due_state(due: date, today: date) -> str:
    """Classify a local calendar date without converting to an instant."""
    _valid_date(due)
    _valid_date(today)
    if due < today:
        return "overdue"
    if due == today:
        return "due_today"
    return "upcoming"
