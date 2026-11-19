# MVP data model

The frozen [Architecture v1.0](https://app.notion.com/p/41935ab73db381e585e8f6102f0991fc?pvs=204) defines 16 application tables. Migration `20261115210000_profiles_auth` creates `profiles`; merged L—6 migration `20261118041954_baseline_tables` adds the remaining 15. Both are applied to the Lyfe development Supabase project. No separate production project was changed by L—6.

Every table contains an owner `user_id`. App roles can select, insert, and update only their own rows, with column limited updates that cannot change identity and ownership. The L—6 baseline grants no app-role `DELETE`; accepted ADR-002 adds owner-only attachment deletion in a later migration. Child tables use `(user_id, parent_id)` foreign keys so a row cannot link to another account's task, pet, vehicle, or custom field definition. Tasks allow one pet or vehicle link at most. All 16 tables have RLS. The only polymorphic references are attachments and custom field values; caller rights triggers check entity existence and ownership on insert and reference changes.

The migration enforces positive finite pet weights, nonnegative finite cost, nonnegative mileage, odometer, and attachment size, supported recurrence frequencies and weekdays, valid module and custom field types, and shape and type checks for custom field values. VINs are uppercased and whitespace removed before enforcing per user uniqueness. Text task status, priority, and reminder status remain nonempty but open vocabularies until feature behavior is specified. Recurrence occurrence persistence is still undecided; this migration does not add an occurrence table or completion history.

## Approved MVP delete behavior

The [owner-approved decision](DECISIONS.md) restricts individual record deletion in the MVP. The database grants no row deletion to the app role. Parent foreign keys use deferred `NO ACTION`, requiring a future delete flow to handle children explicitly. There is no in-app archive behavior. Removing an Auth user cascades through `profiles` to all owned application rows. Storage objects are outside this migration; a later account deletion flow must remove those files through the Storage API before deleting the Auth user.

Task-only soft deletion is approved in [ADR-001](decisions/ADR-001-task-soft-delete.md). Its `deleted_at` column is not part of the L—6 migration; the follow-up migration was applied to the development project on 2026-11-18. Task queries must filter marked rows before the feature is exposed. [ADR-002](decisions/ADR-002-attachment-deletion.md) permits owner deletion of attachment metadata and private files only; its L—11 migration is not yet applied to a hosted project.

## Local verification

`supabase/tests/l6_baseline.sql` uses two synthetic accounts inside a rolled back transaction. It checks table and RLS coverage, owner visibility, same owner links, polymorphic ownership, VIN normalization, custom field validation, absence of app delete privilege, and account row cascade. Run it only against a disposable local PostgreSQL database after `supabase/tests/l6_auth_stub.sql` and both Lyfe migrations. The stub contains only the Auth objects needed for these tests; this does not validate hosted Auth, the Data API, Storage policies, or the future deletion workflow.
