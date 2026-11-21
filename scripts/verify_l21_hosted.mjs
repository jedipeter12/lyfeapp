// Run only against the named Lyfe development project with a temporary secret
// key supplied through an ignored local environment file. No credentials print.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const projectUrl = "https://cwyzeokzjbvfalvmqnhx.supabase.co";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.LYFE_TEST_SUPABASE_SECRET_KEY;

if (
  process.env.EXPO_PUBLIC_APP_ENV !== "development" ||
  url !== projectUrl ||
  !publishableKey ||
  !secretKey ||
  process.argv[2] !== "--confirm-development-project"
) {
  throw new Error(
    "Requires the Lyfe development URL, public and temporary admin keys, and --confirm-development-project",
  );
}

const options = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, secretKey, options);
const anonymous = createClient(url, publishableKey, options);
const suffix = randomBytes(8).toString("hex");
const createdUserIds = [];

function checked(label, response) {
  if (response.error) {
    throw new Error(
      `${label}: ${response.error.code ?? "API error"}: ${response.error.message}`,
    );
  }
  return response.data;
}

async function makeUser(n) {
  const email = `lyfe-l21-${suffix}-${n}@example.com`;
  const password = randomBytes(32).toString("base64url");
  const data = checked(
    `create synthetic user ${n}`,
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  assert.ok(data.user?.id);
  createdUserIds.push(data.user.id);
  const client = createClient(url, publishableKey, options);
  checked(
    `sign in synthetic user ${n}`,
    await client.auth.signInWithPassword({ email, password }),
  );
  return { id: data.user.id, client };
}

const cases = [
  {
    label: "daily spring DST",
    frequency: "daily",
    interval: 1,
    weekdays: null,
    timezone: "America/Chicago",
    due: "2027-03-13T15:30:00Z",
    next: "2027-03-14T14:30:00Z",
    localDate: "2027-03-13",
  },
  {
    label: "weekly selected weekdays",
    frequency: "weekly",
    interval: 2,
    weekdays: [1, 3],
    timezone: "America/Chicago",
    due: "2027-01-04T15:00:00Z",
    next: "2027-01-06T15:00:00Z",
    localDate: "2027-01-04",
  },
  {
    label: "monthly month end",
    frequency: "monthly",
    interval: 1,
    weekdays: null,
    timezone: "America/Chicago",
    due: "2027-01-31T15:30:00Z",
    next: "2027-02-28T15:30:00Z",
    localDate: "2027-01-31",
  },
  {
    label: "yearly leap day",
    frequency: "yearly",
    interval: 1,
    weekdays: null,
    timezone: "America/Chicago",
    due: "2028-02-29T15:30:00Z",
    next: "2029-02-28T15:30:00Z",
    localDate: "2028-02-29",
  },
  {
    label: "daily fall DST",
    frequency: "daily",
    interval: 1,
    weekdays: null,
    timezone: "America/Chicago",
    due: "2027-11-06T14:30:00Z",
    next: "2027-11-07T15:30:00Z",
    localDate: "2027-11-06",
  },
];

let outcome;
try {
  const owner = await makeUser(1);
  const other = await makeUser(2);
  const taskIds = [];

  for (const scenario of cases) {
    const task = checked(
      `${scenario.label} task insert`,
      await owner.client
        .from("tasks")
        .insert({
          user_id: owner.id,
          title: `L21 synthetic ${scenario.label}`,
          status: "pending",
          priority: "medium",
          due_at: scenario.due,
        })
        .select("id,due_at,status")
        .single(),
    );
    taskIds.push(task.id);
    const params = {
      p_task_id: task.id,
      p_frequency: scenario.frequency,
      p_interval: scenario.interval,
      p_weekdays: scenario.weekdays,
      p_timezone: scenario.timezone,
      p_end_at: null,
      p_next_at: scenario.due,
    };
    const rule = checked(
      `${scenario.label} rule save`,
      await owner.client.rpc("save_recurrence_rule", params),
    );
    assert.equal(rule.frequency, scenario.frequency);
    assert.equal(rule.timezone, scenario.timezone);
    const completed = checked(
      `${scenario.label} completion`,
      await owner.client.rpc("complete_task_occurrence", {
        p_task_id: task.id,
        p_scheduled_local_date: scenario.localDate,
        p_scheduled_at: scenario.due,
        p_next_at: scenario.next,
      }),
    );
    assert.equal(completed.task.status, "pending");
    assert.equal(
      new Date(completed.task.due_at).toISOString(),
      new Date(scenario.next).toISOString(),
    );
    assert.equal(completed.occurrence.scheduled_local_date, scenario.localDate);
    const history = checked(
      `${scenario.label} history`,
      await owner.client
        .from("task_occurrences")
        .select("id,scheduled_local_date")
        .eq("task_id", task.id),
    );
    assert.equal(history.length, 1);
    console.log(`${scenario.label}: passed`);
  }

  const firstTaskId = taskIds[0];
  const firstCase = cases[0];
  const retry = checked(
    "retry first completion",
    await owner.client.rpc("complete_task_occurrence", {
      p_task_id: firstTaskId,
      p_scheduled_local_date: firstCase.localDate,
      p_scheduled_at: firstCase.due,
      p_next_at: firstCase.next,
    }),
  );
  assert.equal(
    new Date(retry.task.due_at).toISOString(),
    new Date(firstCase.next).toISOString(),
  );
  const firstHistory = checked(
    "history after retry",
    await owner.client
      .from("task_occurrences")
      .select("id")
      .eq("task_id", firstTaskId),
  );
  assert.equal(firstHistory.length, 1);

  const edited = checked(
    "rule edit",
    await owner.client.rpc("save_recurrence_rule", {
      p_task_id: firstTaskId,
      p_frequency: "weekly",
      p_interval: 1,
      p_weekdays: [0],
      p_timezone: "America/Chicago",
      p_end_at: "2027-03-21T14:30:00Z",
      p_next_at: "2027-03-21T14:30:00Z",
    }),
  );
  assert.equal(edited.frequency, "weekly");
  const final = checked(
    "final completion",
    await owner.client.rpc("complete_task_occurrence", {
      p_task_id: firstTaskId,
      p_scheduled_local_date: "2027-03-21",
      p_scheduled_at: "2027-03-21T14:30:00Z",
      p_next_at: null,
    }),
  );
  assert.equal(final.task.status, "completed");
  assert.equal(final.task.due_at, null);
  assert.ok(final.task.completed_at);

  const foreignTasks = checked(
    "cross-owner task read",
    await other.client.from("tasks").select("id").in("id", taskIds),
  );
  const foreignHistory = checked(
    "cross-owner occurrence read",
    await other.client
      .from("task_occurrences")
      .select("id")
      .in("task_id", taskIds),
  );
  const foreignRules = checked(
    "cross-owner rule read",
    await other.client
      .from("recurrence_rules")
      .select("id")
      .in("task_id", taskIds),
  );
  assert.equal(foreignTasks.length, 0);
  assert.equal(foreignHistory.length, 0);
  assert.equal(foreignRules.length, 0);
  assert.ok(
    (
      await other.client.rpc("save_recurrence_rule", {
        p_task_id: taskIds[1],
        p_frequency: "daily",
        p_interval: 1,
        p_weekdays: null,
        p_timezone: "UTC",
        p_end_at: null,
        p_next_at: cases[1].next,
      })
    ).error,
  );
  assert.ok(
    (
      await other.client.rpc("complete_task_occurrence", {
        p_task_id: taskIds[1],
        p_scheduled_local_date: "2027-01-06",
        p_scheduled_at: cases[1].next,
        p_next_at: "2027-01-18T15:00:00Z",
      })
    ).error,
  );
  assert.ok((await anonymous.from("task_occurrences").select("id")).error);
  assert.ok(
    (
      await anonymous.rpc("save_recurrence_rule", {
        p_task_id: taskIds[1],
        p_frequency: "daily",
        p_interval: 1,
        p_weekdays: null,
        p_timezone: "UTC",
        p_end_at: null,
        p_next_at: cases[1].next,
      })
    ).error,
  );
  console.log(
    "retry, edit, final status, owner isolation, and anonymous denial: passed",
  );
  outcome = "Hosted authenticated Data API checks passed";
} catch (error) {
  outcome = `Hosted check failed: ${error.message}`;
  process.exitCode = 1;
} finally {
  const cleanupErrors = [];
  for (const id of createdUserIds) {
    try {
      const response = await admin.auth.admin.deleteUser(id);
      if (response.error)
        cleanupErrors.push(`${id}: ${response.error.message}`);
      else {
        const remaining = await admin.auth.admin.getUserById(id);
        if (!remaining.error && remaining.data.user)
          cleanupErrors.push(`${id}: Auth user remains`);
      }
    } catch (error) {
      cleanupErrors.push(`${id}: ${error.message}`);
    }
  }
  if (!cleanupErrors.length && createdUserIds.length) {
    for (const table of [
      "profiles",
      "tasks",
      "recurrence_rules",
      "task_occurrences",
    ]) {
      const response = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .in("user_id", createdUserIds);
      if (response.error || response.count !== 0) {
        cleanupErrors.push(`${table}: residual rows or audit error`);
      }
    }
  }
  if (cleanupErrors.length) {
    process.exitCode = 1;
    console.error(
      "Synthetic cleanup needs manual review:",
      cleanupErrors.join("; "),
    );
  } else if (createdUserIds.length) {
    console.log("Synthetic Auth users and application rows cleaned up");
  } else {
    console.log("No synthetic Auth users were created");
  }
  console.log(outcome);
}
