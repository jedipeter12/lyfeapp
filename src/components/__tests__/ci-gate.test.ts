describe("CI gate probe", () => {
  it("deliberately fails to verify the PR check", () => {
    expect("blocked").toBe("passed");
  });
});
