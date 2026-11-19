# ADR-002: Individual attachment deletion for L—11

**Status:** Accepted by the owner, 2026-11-19. Implementation, merge, and deployment remain separate steps.

## Context

The frozen Architecture v1.0 includes private Storage, owner-scoped policies, signed access, and attachment records. L—11 requires upload, read, and delete of image and PDF attachments for tasks, pets, and vehicles. The accepted L—6 deletion decision denies authenticated `DELETE` on every application table, including `attachments`, and does not provide individual child-record deletion. [ADR-001](ADR-001-task-soft-delete.md) amends that rule only for tasks. The current `attachments` table has no deletion marker. Deleting a Storage object alone would leave a visible metadata row; deleting metadata alone would leave a private file consuming storage. Upload error recovery also needs permission to remove a file when its metadata insert fails.

The owner accepted this narrow exception for attachments after confirming that child records do not become parent records. Task, pet, and vehicle deletion still requires a separate decision about their dependants.

## Decision

Allow an authenticated owner to physically delete only their own `attachments` metadata row and corresponding private Storage object. Keep physical deletion of tasks, pets, vehicles, and all other child records restricted. Preserve task soft deletion as defined by ADR-001.

- Add an additive migration granting authenticated `DELETE` on `public.attachments` with an owner-scoped `USING ((select auth.uid()) = user_id)` policy. Keep its existing owner-scoped `SELECT` and `INSERT` policies. No service-role key enters the app.
- Create one private `lyfe-attachments` bucket with a 10 MiB per-file limit and allowed MIME types `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. The client will accept these types only and check file size and recognizable file signatures before upload. Bucket limits and Storage policies remain the server-side boundary for size, declared MIME, and ownership; file-signature checks in the client are not a malware scanner.
- Use object keys under `<user UUID>/<attachment UUID>` and owner-scoped Storage `INSERT`, `SELECT`, and `DELETE` policies. Do not enable overwrite (`upsert`) or public access. Validate that new attachment metadata uses the same owner prefix. The L—11 client will accept only owned task, pet, or vehicle targets; retain the existing baseline's broader server-side polymorphic ownership validation for already modeled child entities.
- Upload the object, then insert metadata. If metadata insertion fails, attempt to remove the uploaded object and report a cleanup failure if that compensation also fails. Do not expose an incomplete upload as a successful attachment.
- Read metadata through owner-scoped queries and issue a short-lived signed URL only after finding that metadata. Do not persist or long-cache signed URLs.
- For user deletion, remove the Storage object first, then the metadata row. If metadata deletion fails after object removal, report an incomplete deletion so it can be retried or repaired. Account deletion must still remove all owned Storage objects before deleting the Auth user; that workflow remains separate.

The 10 MiB and four MIME types are the accepted L—11 limits; the ticket did not specify numbers or formats beyond images and PDFs.

## Alternatives considered

1. **Keep the L—6 restriction.** Implement upload and read only and defer deletion. This fails L—11's stated acceptance criteria and prevents reliable upload compensation.
2. **Soft-delete attachment metadata.** Add a `deleted_at` column and filter reads. This hides the row but still needs a decision about removing the file, restoration, retention, and signed links. It adds state without resolving file cleanup.
3. **Physical owner deletion (selected).** Narrowly amends the restriction for attachment records and makes cleanup possible. The operation is irreversible to the user, so UI must present a clear confirmation.

## Consequences and verification required

This decision is a narrow amendment to L—6. Storage and Postgres cannot share a transaction, so partial failures require explicit retry/repair behavior. Signed URLs may remain usable until their short expiry if a client has already received one; URLs must never be logged or stored in the query cache.

L—11 verification must include local SQL tests for owner and cross-user metadata deletion, Storage policy tests for upload/read/delete and rejected foreign paths, type/size rejection, upload compensation, and signed URL expiry handling. Hosted development migration or bucket provisioning is a separate step and does not authorize production changes.
