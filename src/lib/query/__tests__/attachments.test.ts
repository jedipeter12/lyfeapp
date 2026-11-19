import { QueryClient } from "@tanstack/react-query";
import { attachmentKeys, invalidateAttachmentQueries } from "../attachments";

it("invalidates the changed owner's attachment lists for the actual entity", async () => {
  const client = new QueryClient();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const pet = "33333333-3333-4333-8333-333333333333";
  const vehicle = "44444444-4444-4444-8444-444444444444";
  client.setQueryData(attachmentKeys.list(owner, "pets", pet, 0), []);
  client.setQueryData(attachmentKeys.list(owner, "pets", pet, 1), []);
  client.setQueryData(attachmentKeys.list(owner, "vehicles", vehicle, 0), []);
  client.setQueryData(attachmentKeys.list(other, "pets", pet, 0), []);

  await invalidateAttachmentQueries(client, owner, {
    entity_type: "pets",
    entity_id: pet,
  });

  expect(
    client.getQueryState(attachmentKeys.list(owner, "pets", pet, 0))
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(attachmentKeys.list(owner, "pets", pet, 1))
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(attachmentKeys.list(owner, "vehicles", vehicle, 0))
      ?.isInvalidated,
  ).toBe(false);
  expect(
    client.getQueryState(attachmentKeys.list(other, "pets", pet, 0))
      ?.isInvalidated,
  ).toBe(false);
  client.clear();
});
