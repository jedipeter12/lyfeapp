import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import { AttachmentSection } from "../AttachmentSection";

const userId = "11111111-1111-4111-8111-111111111111";
const entityId = "33333333-3333-4333-8333-333333333333";
const attachmentId = "44444444-4444-4444-8444-444444444444";
const attachment = {
  id: attachmentId,
  user_id: userId,
  entity_id: entityId,
  entity_type: "pets",
  storage_path: `${userId}/${attachmentId}`,
  mime_type: "application/pdf",
  size_bytes: 8,
};
const mockList = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();
const mockPick = jest.fn();
const mockSignedUrl = jest.fn();

jest.mock("@/lib/query/attachments", () => ({
  useAttachmentList: (...args: unknown[]) => mockList(...args),
  useUploadAttachment: () => ({ mutateAsync: mockUpload }),
  useDeleteAttachment: () => ({ mutateAsync: mockDelete }),
}));
jest.mock("../pickAttachment", () => ({ pickAttachment: () => mockPick() }));
jest.mock("@/services/storage/attachments", () => ({
  AttachmentCleanupError: class AttachmentCleanupError extends Error {},
  attachmentService: {
    signedUrl: (...args: unknown[]) => mockSignedUrl(...args),
  },
}));

beforeEach(() => {
  mockList
    .mockReset()
    .mockReturnValue({ data: [attachment], isPending: false, isError: false });
  mockUpload.mockReset().mockResolvedValue(attachment);
  mockDelete.mockReset().mockResolvedValue(attachment);
  mockPick.mockReset().mockResolvedValue({
    bytes: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer,
    mimeType: "application/pdf",
  });
  mockSignedUrl.mockReset().mockResolvedValue("https://example.invalid/signed");
});

it("uploads for the selected owner and entity and opens a fresh signed link", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
  const screen = await render(
    <AttachmentSection target="pets" userId={userId} entityId={entityId} />,
  );
  expect(mockList).toHaveBeenCalledWith("pets", userId, entityId, 0);
  fireEvent.press(screen.getByRole("button", { name: "Add attachment" }));
  await waitFor(() =>
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ mimeType: "application/pdf" }),
    ),
  );
  fireEvent.press(screen.getByRole("button", { name: "Open attachment 1" }));
  await waitFor(() =>
    expect(mockSignedUrl).toHaveBeenCalledWith(userId, attachmentId),
  );
  expect(open).toHaveBeenCalledWith("https://example.invalid/signed");
  open.mockRestore();
});

it("requires confirmation before deleting and reports a failed deletion", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockDelete.mockRejectedValue(new Error("failed"));
  const screen = await render(
    <AttachmentSection target="pets" userId={userId} entityId={entityId} />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Delete attachment 1" }));
  expect(mockDelete).not.toHaveBeenCalled();
  const actions = alert.mock.calls[0][2]!;
  expect(actions[0].text).toBe("Cancel");
  expect(actions[1].style).toBe("destructive");
  actions[1].onPress?.();
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(attachmentId));
  expect(
    screen.getByText("Could not delete attachment. Try again."),
  ).toBeTruthy();
  alert.mockRestore();
});

it("leaves the file after cancellation and deletes only after confirmation", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const screen = await render(
    <AttachmentSection target="tasks" userId={userId} entityId={entityId} />,
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Delete attachment 1" }),
  );
  expect(mockDelete).not.toHaveBeenCalled();
  const actions = alert.mock.calls[0][2]!;
  actions[0].onPress?.();
  expect(mockDelete).not.toHaveBeenCalled();
  actions[1].onPress?.();
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(attachmentId));
  expect(screen.getByText("Attachment deleted.")).toBeTruthy();
  alert.mockRestore();
});

it("does not upload a canceled pick and explains a rejected file", async () => {
  mockPick
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error("Choose a JPEG, PNG, WebP, or PDF file."));
  const screen = await render(
    <AttachmentSection target="vehicles" userId={userId} entityId={entityId} />,
  );
  await fireEvent.press(screen.getByRole("button", { name: "Add attachment" }));
  await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
  expect(mockUpload).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Add attachment" }));
  await waitFor(() =>
    expect(
      screen.getByText("Choose a JPEG, PNG, WebP, or PDF file."),
    ).toBeTruthy(),
  );
  expect(mockUpload).not.toHaveBeenCalled();
});

it("shows loading and retryable list errors", async () => {
  const refetch = jest.fn();
  mockList.mockReturnValueOnce({ isPending: true });
  const screen = await render(
    <AttachmentSection target="vehicles" userId={userId} entityId={entityId} />,
  );
  expect(screen.getByText("Loading attachments…")).toBeTruthy();
  mockList.mockReturnValue({ isPending: false, isError: true, refetch });
  await screen.rerender(
    <AttachmentSection target="vehicles" userId={userId} entityId={entityId} />,
  );
  fireEvent.press(screen.getByRole("button", { name: "Try again" }));
  expect(refetch).toHaveBeenCalled();
});
