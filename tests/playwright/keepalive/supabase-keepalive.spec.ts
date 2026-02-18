import { test, expect } from '@playwright/test';

/**
 * Supabase Keep-Alive Test
 *
 * Lightweight health check that pings the Supabase database to prevent
 * the free-tier project from pausing due to inactivity.
 *
 * Run against production:
 *   BASE_URL=https://blink-led.com npx playwright test tests/playwright/keepalive/
 */
test.describe('Supabase Keep-Alive @keepalive', () => {

  test('should load app and ping Supabase database', async ({ page }) => {
    // Capture console messages for debugging
    const logs: string[] = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    // 1. Navigate to the app and wait for full load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify the app loaded (welcome page visible)
    await expect(page.locator('#welcomePage')).toBeVisible();

    // 3. Check Supabase state — the CDN lib and client may or may not be ready
    const state = await page.evaluate(() => {
      const w = window as any;
      return {
        hasSupabaseLib: typeof w.supabase !== 'undefined',
        hasClient: w.supabaseClient != null,
        hasCreateClient: typeof w.supabase?.createClient === 'function',
      };
    });

    // If the Supabase client isn't initialized yet, try initializing it directly
    if (!state.hasClient && state.hasCreateClient) {
      await page.evaluate(() => {
        const w = window as any;
        if (typeof w.initSupabase === 'function') w.initSupabase();
      });
      await page.waitForTimeout(1000);
    }

    // 4. Create a fresh client inline if the global one still isn't available
    const result = await page.evaluate(async () => {
      const w = window as any;
      let client = w.supabaseClient;

      // Fallback: create a temporary client using the same credentials
      if (!client && w.supabase?.createClient) {
        const url = 'https://wdprtbmhekougwnkpcdu.supabase.co';
        const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkcHJ0Ym1oZWtvdWd3bmtwY2R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTMyNDQsImV4cCI6MjA4NTYyOTI0NH0.WD5soMFrLGYzlEHjB6xYpRjq96v-9eCvglzo4v4nQ58';
        client = w.supabase.createClient(url, key);
      }

      if (!client) {
        return { hasData: false, error: 'No Supabase client available', clientSource: 'none' };
      }

      try {
        const { data, error } = await client
          .from('community_panels')
          .select('id')
          .limit(1);
        return {
          hasData: Array.isArray(data),
          rowCount: data?.length ?? 0,
          error: error?.message || null,
          clientSource: w.supabaseClient ? 'global' : 'inline',
        };
      } catch (e: any) {
        return { hasData: false, error: e.message, clientSource: 'unknown' };
      }
    });

    // 5. Assert success
    expect(result.error).toBeNull();
    expect(result.hasData).toBe(true);
  });
});
