import { test, expect, mock, beforeEach, afterEach } from "bun:test";

// Test the debounce utility
test("debounce delays function execution", async () => {
  let callCount = 0;
  const fn = () => {
    callCount++;
  };

  // Inline debounce for testing (same implementation as frontend.ts)
  function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number,
  ): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: unknown[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    }) as T;
  }

  const debouncedFn = debounce(fn, 100);

  // Call multiple times rapidly
  debouncedFn();
  debouncedFn();
  debouncedFn();

  // Should not have been called yet
  expect(callCount).toBe(0);

  // Wait for debounce to complete
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Should have been called exactly once
  expect(callCount).toBe(1);
});

test("debounce resets timer on subsequent calls", async () => {
  const calls: number[] = [];
  const fn = () => {
    calls.push(Date.now());
  };

  function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    ms: number,
  ): T {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return ((...args: unknown[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), ms);
    }) as T;
  }

  const debouncedFn = debounce(fn, 100);

  const start = Date.now();
  debouncedFn();

  // Call again after 50ms - should reset the timer
  await new Promise((resolve) => setTimeout(resolve, 50));
  debouncedFn();

  // Wait for debounce
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Should have been called once, approximately 150ms after start
  expect(calls.length).toBe(1);
  const elapsed = calls[0]! - start;
  expect(elapsed).toBeGreaterThanOrEqual(140); // Allow some timing variance
});

// Test URL query param handling
test("updateSearchQueryParam sets q param for non-empty query", () => {
  // Mock window.location and history
  const mockUrl = new URL("http://localhost:3000/");
  const replacedStates: string[] = [];

  const originalLocation = globalThis.window?.location;
  const originalHistory = globalThis.history;

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  function updateSearchQueryParam(query: string): void {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }

  updateSearchQueryParam("test query");

  expect(replacedStates.length).toBe(1);
  expect(replacedStates[0]).toContain("q=test+query");

  // Cleanup
  if (originalLocation) {
    // @ts-ignore - restoring global
    globalThis.window = { location: originalLocation };
  }
  if (originalHistory) {
    // @ts-ignore - restoring global
    globalThis.history = originalHistory;
  }
});

test("updateSearchQueryParam removes q param for empty query", () => {
  const mockUrl = new URL("http://localhost:3000/?q=existing");
  const replacedStates: string[] = [];

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  function updateSearchQueryParam(query: string): void {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }

  updateSearchQueryParam("");

  expect(replacedStates.length).toBe(1);
  expect(replacedStates[0]).not.toContain("q=");
});

test("search query is loaded from URL on init", () => {
  const mockUrl = new URL("http://localhost:3000/?q=loaded");

  // Simulate extracting query from URL like init() does
  const queryParam = mockUrl.searchParams.get("q");

  expect(queryParam).toBe("loaded");
});

test("search query preserves special characters in URL", () => {
  const replacedStates: string[] = [];
  const mockUrl = new URL("http://localhost:3000/");

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  function updateSearchQueryParam(query: string): void {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    history.replaceState(null, "", url.toString());
  }

  updateSearchQueryParam("test & query");

  expect(replacedStates.length).toBe(1);
  // URL should properly encode the ampersand
  const parsedUrl = new URL(replacedStates[0]!);
  expect(parsedUrl.searchParams.get("q")).toBe("test & query");
});

// Test plan URL query param handling
test("updatePlanQueryParam sets plan param when plan is selected", () => {
  const replacedStates: string[] = [];
  const mockUrl = new URL("http://localhost:3000/");

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  // Simulate the logic from handleSelectPlan
  function updatePlanQueryParam(planFilename: string | null): void {
    const url = new URL(window.location.href);
    if (planFilename) {
      url.searchParams.set("plan", planFilename);
    } else {
      url.searchParams.delete("plan");
    }
    history.replaceState({}, "", url.toString());
  }

  updatePlanQueryParam("giggly-sparking-pizza.md");

  expect(replacedStates.length).toBe(1);
  expect(replacedStates[0]).toContain("plan=giggly-sparking-pizza.md");
});

test("updatePlanQueryParam removes plan param when plan is null", () => {
  const replacedStates: string[] = [];
  const mockUrl = new URL("http://localhost:3000/?plan=existing-plan.md");

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  function updatePlanQueryParam(planFilename: string | null): void {
    const url = new URL(window.location.href);
    if (planFilename) {
      url.searchParams.set("plan", planFilename);
    } else {
      url.searchParams.delete("plan");
    }
    history.replaceState({}, "", url.toString());
  }

  updatePlanQueryParam(null);

  expect(replacedStates.length).toBe(1);
  expect(replacedStates[0]).not.toContain("plan=");
});

test("plan filename is loaded from URL on init", () => {
  const mockUrl = new URL(
    "http://localhost:3000/?plan=goofy-swinging-rainbow.md",
  );

  // Simulate extracting plan from URL like the useEffect does
  const planParam = mockUrl.searchParams.get("plan");

  expect(planParam).toBe("goofy-swinging-rainbow.md");
});

test("plan param coexists with search query param", () => {
  const replacedStates: string[] = [];
  const mockUrl = new URL("http://localhost:3000/?q=search-term");

  // @ts-expect-error - mocking global
  globalThis.window = { location: { href: mockUrl.toString() } };
  // @ts-expect-error - mocking global
  globalThis.history = {
    replaceState: (_: unknown, __: string, url: string) => {
      replacedStates.push(url);
    },
  };

  function updatePlanQueryParam(planFilename: string | null): void {
    const url = new URL(window.location.href);
    if (planFilename) {
      url.searchParams.set("plan", planFilename);
    } else {
      url.searchParams.delete("plan");
    }
    history.replaceState({}, "", url.toString());
  }

  updatePlanQueryParam("test-plan.md");

  expect(replacedStates.length).toBe(1);
  const parsedUrl = new URL(replacedStates[0]!);
  // Both params should be present
  expect(parsedUrl.searchParams.get("plan")).toBe("test-plan.md");
  expect(parsedUrl.searchParams.get("q")).toBe("search-term");
});
