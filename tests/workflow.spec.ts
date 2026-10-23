import { test, expect } from "@playwright/test";

test("full workflow: load fixture → generate → toggle cell → export", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByLabel("Pattern name for channel 1")).toHaveValue("Kick");

  await page.getByRole("button", { name: "Generate Arrangement" }).click();
  await expect(page.getByRole("table", { name: /Arrangement timeline/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manual transition checklist" })).toBeVisible();

  // Toggle Piano off in Verse B (bars 9–12)
  const cell = page.getByRole("button", { name: /Piano, Verse B, bars 9–12: on/ });
  await cell.click();
  await expect(page.getByRole("button", { name: /Piano, Verse B, bars 9–12: off \(overridden\)/ })).toBeVisible();
  await expect(page.getByText(/manual override/).first()).toBeVisible();

  for (const name of ["Export JSON", "Export CSV", "Export Guide"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name }).click();
    expect((await download).suggestedFilename()).toMatch(/arrangement\.(json|csv)|playlist-guide\.md/);
  }
});

test("invalid manifest import shows an error", async ({ page }) => {
  await page.goto("/");
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Import Manifest" }).click(),
  ]);
  await chooser.setFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByText(/Import failed/)).toBeVisible();
});
