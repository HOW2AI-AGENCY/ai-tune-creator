import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or Anon Key is not defined in the environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Authentication Flow', () => {
  let userEmail = '';
  let userPassword = '';

  test.beforeAll(async () => {
    // Create a new unique user for the test run
    userEmail = `test.user.${Date.now()}@example.com`;
    userPassword = `password-${Date.now()}`;

    const { error } = await supabase.auth.signUp({
      email: userEmail,
      password: userPassword,
    });

    if (error) {
      // If the user already exists, it's not a critical issue for this test,
      // but we should log it. For other errors, we should fail fast.
      if (error.message.includes('already registered')) {
        console.warn(`Test user ${userEmail} already exists. Reusing.`);
      } else {
        throw new Error(`Failed to create test user: ${error.message}`);
      }
    }

    // After signing up, Supabase client might have the session.
    // We sign out to ensure we are testing the login form from a clean state.
    await supabase.auth.signOut();
  });

  test.afterAll(async () => {
    // Clean up the created user
    // This requires service_role key and admin client, which is out of scope
    // for this example. In a real-world scenario, you'd have an admin
    // client to delete the user.
    console.log(`Test finished. User created: ${userEmail}`);
  });

  test('should allow a user to sign in and sign out', async ({ page }) => {
    // Navigate to the authentication page
    await page.goto('/auth');

    // Wait for the sign-in tab to be visible and click it
    await page.getByRole('tab', { name: 'Войти' }).click();

    // Fill in the login form
    // Using getByLabel is a best practice for accessibility and resilience
    await page.getByLabel('Электронная почта').fill(userEmail);
    await page.getByLabel('Пароль').fill(userPassword);

    // Click the login button
    await page.getByRole('button', { name: 'Войти' }).click();

    // Wait for navigation to the dashboard and verify the URL
    await page.waitForURL('/');
    expect(page.url()).toBe(process.env.BASE_URL || 'http://127.0.0.1:8080/');

    // Verify that the user is logged in by checking for the avatar button
    // and the user's email in the dropdown menu.
    const avatarButton = page.locator('button > .avatar');
    await expect(avatarButton).toBeVisible();

    // Click the avatar to open the user menu
    await avatarButton.click();

    // Check that the user's email is displayed in the menu
    await expect(page.getByText(userEmail)).toBeVisible();

    // --- Test Sign Out ---
    // Click the "Sign out" button
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    // Wait for navigation back to the auth page
    await page.waitForURL('/auth');
    expect(page.url()).toContain('/auth');

    // Verify that the login form is visible again
    await expect(page.getByRole('tab', { name: 'Войти' })).toBeVisible();
  });

  test('should show an error for invalid credentials', async ({ page }) => {
    // Navigate to the authentication page
    await page.goto('/auth');

    // Ensure the sign-in tab is active
    await page.getByRole('tab', { name: 'Войти' }).click();

    // Fill in the form with incorrect credentials
    await page.getByLabel('Электронная почта').fill('wrong-user@example.com');
    await page.getByLabel('Пароль').fill('wrong-password');

    // Click the login button
    await page.getByRole('button', { name: 'Войти' }).click();

    // Check for the error toast message
    // The toast is provided by the `sonner` library.
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('Неверный email или пароль');
  });
});
