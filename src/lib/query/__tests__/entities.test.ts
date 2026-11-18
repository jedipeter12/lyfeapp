import { QueryClient } from "@tanstack/react-query";
import { entityKeys, invalidateEntityQueries } from "../entities";

it("invalidates the changed user's entity keys without affecting another user", async () => {
  const client = new QueryClient();
  const userId = "11111111-1111-4111-8111-111111111111";
  const otherUserId = "22222222-2222-4222-8222-222222222222";
  client.setQueryData(entityKeys.list(userId, "pets", 0), []);
  client.setQueryData(entityKeys.detail(userId, "pets", "pet-id"), {});
  client.setQueryData(entityKeys.list(otherUserId, "pets", 0), []);
  client.setQueryData(entityKeys.list(userId, "tasks", 0), []);

  await invalidateEntityQueries(client, userId, "pets");

  expect(
    client.getQueryState(entityKeys.list(userId, "pets", 0))?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(entityKeys.detail(userId, "pets", "pet-id"))
      ?.isInvalidated,
  ).toBe(true);
  expect(
    client.getQueryState(entityKeys.list(otherUserId, "pets", 0))
      ?.isInvalidated,
  ).toBe(false);
  expect(
    client.getQueryState(entityKeys.list(userId, "tasks", 0))?.isInvalidated,
  ).toBe(false);
  client.clear();
});
