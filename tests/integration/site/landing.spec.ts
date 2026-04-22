import { expect, test } from "@playwright/test";

test.describe("Landing", () => {
	test("The landing page transitions into browsing mode after pressing Enter.", async ({
		page,
	}) => {
		await page.goto("/");

		await expect(page.locator(".landing-shell")).toBeVisible();
		await expect(page.locator(".landing-input")).toBeVisible();
		await expect(page.locator(".landing-title")).toBeHidden();
		await expect(page.locator(".browser-shell")).toBeHidden();

		await page.locator(".landing-input").fill("https://example.com/");
		await page.locator(".landing-input").press("Enter");

		await expect(page.locator(".landing-shell")).toBeHidden();
		await expect(page.locator(".browser-shell")).toBeVisible();
		await expect(page.locator(".nav")).toBeVisible();
		await expect(page.locator(".nav-route.is-active")).toHaveText("Direct URL");

		const frame = page.frameLocator("iframe");
		await expect(frame.locator("h1")).toHaveText("Example Domain", {
			timeout: 15000,
		});
		await frame.locator("a").click();
		await expect(page.locator(".bar")).toHaveValue(/iana\.org/, { timeout: 15000 });
		await expect(page.locator(".nav-route.is-active")).toHaveText("In-page");
	});
});
