-- L--14 keeps one active reminder per task. The existing reminders table is
-- the shared opt-in record; each device schedules its own local notification.
do $$
begin
  if exists (
    select 1 from public.reminders
    where status = 'pending'
    group by user_id, task_id
    having count(*) > 1
  ) then
    raise exception 'Resolve duplicate pending reminders before L--14 migration';
  end if;
end;
$$;

create unique index reminders_one_pending_per_task
  on public.reminders (user_id, task_id)
  where status = 'pending';

create function public.sync_task_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null or new.completed_at is not null or new.due_at is null then
    update public.reminders
      set status = 'cancelled'
      where user_id = new.user_id and task_id = new.id and status = 'pending';
  elsif new.due_at is distinct from old.due_at then
    update public.reminders
      set remind_at = new.due_at
      where user_id = new.user_id and task_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger tasks_sync_reminder
after update of due_at, completed_at, deleted_at on public.tasks
for each row
when (
  old.due_at is distinct from new.due_at or
  old.completed_at is distinct from new.completed_at or
  old.deleted_at is distinct from new.deleted_at
)
execute function public.sync_task_reminder();

revoke all on function public.sync_task_reminder() from public, anon, authenticated;
