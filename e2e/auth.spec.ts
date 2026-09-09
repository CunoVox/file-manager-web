import { test, expect } from "@playwright/test";

test("renders the sign-in workspace", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("switches to registration mode", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /New here/ }).click();
  await expect(
    page.getByRole("heading", { name: "Create your workspace" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
});
