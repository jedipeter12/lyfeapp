"""Boundary tests for the proposed date arithmetic prototype."""

from datetime import date, datetime
import unittest

from prototypes.recurrence import after_completion_due, calendar_occurrence, due_state


class RecurrenceTests(unittest.TestCase):
    def test_month_end_uses_original_anchor(self):
        anchor = date(2027, 1, 31)
        self.assertEqual(calendar_occurrence(anchor, 1, "months", 1), date(2027, 2, 28))
        self.assertEqual(calendar_occurrence(anchor, 1, "months", 2), date(2027, 3, 31))

    def test_leap_day_returns_in_leap_year(self):
        anchor = date(2028, 2, 29)
        self.assertEqual(calendar_occurrence(anchor, 1, "years", 1), date(2029, 2, 28))
        self.assertEqual(calendar_occurrence(anchor, 1, "years", 4), date(2032, 2, 29))

    def test_day_and_week_intervals(self):
        self.assertEqual(calendar_occurrence(date(2027, 1, 1), 30, "days", 1), date(2027, 1, 31))
        self.assertEqual(calendar_occurrence(date(2027, 1, 1), 2, "weeks", 2), date(2027, 1, 29))

    def test_completion_early_and_late(self):
        initial = date(2027, 5, 10)
        self.assertEqual(after_completion_due(initial, date(2027, 5, 1), 30, "days"), date(2027, 5, 31))
        self.assertEqual(after_completion_due(initial, date(2027, 5, 15), 30, "days"), date(2027, 6, 14))

    def test_missing_history_uses_initial_due(self):
        self.assertEqual(after_completion_due(date(2027, 6, 1), None, 30, "days"), date(2027, 6, 1))

    def test_due_state_is_date_only(self):
        due = date(2027, 3, 14)
        self.assertEqual(due_state(due, date(2027, 3, 13)), "upcoming")
        self.assertEqual(due_state(due, date(2027, 3, 14)), "due_today")
        self.assertEqual(due_state(due, date(2027, 3, 15)), "overdue")

    def test_invalid_rules_and_datetime_rejected(self):
        with self.assertRaises(ValueError):
            calendar_occurrence(date(2027, 1, 1), 0, "days", 1)
        with self.assertRaises(ValueError):
            calendar_occurrence(date(2027, 1, 1), 1, "months", -1)
        with self.assertRaises(ValueError):
            after_completion_due(date(2027, 1, 1), None, 1, "unknown")
        with self.assertRaises(TypeError):
            due_state(datetime(2027, 1, 1), date(2027, 1, 1))


if __name__ == "__main__":
    unittest.main()
