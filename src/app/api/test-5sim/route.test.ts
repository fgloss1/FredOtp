import { GET } from "./route";

// Mock global fetch to intercept requests
const originalFetch = global.fetch;

describe("5SIM Diagnostic Route Safety Assertions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("MUST ONLY invoke read-only profile endpoint and NEVER call buy/activation endpoints", async () => {
    const fetchedUrls: string[] = [];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      fetchedUrls.push(url);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ email: "test@nava.app", balance: 6.0, rating: 100 }),
      });
    }) as jest.Mock;

    // Mock environment and auth
    process.env.FIVESIM_API_TOKEN = "mock_token_123";
    process.env.NODE_ENV = "development";

    const mockRequest = new Request("http://localhost:3000/api/test-5sim", {
      headers: { Authorization: "Bearer mock_supabase_jwt" },
    });

    // Execute route handler
    await GET(mockRequest);

    // Safety Assertions
    expect(fetchedUrls.length).toBe(1);
    expect(fetchedUrls[0]).toBe("https://5sim.net/v1/user/profile");

    // Prohibit purchase paths
    const calledPurchaseEndpoints = fetchedUrls.filter(
      (url) => url.includes("/buy/") || url.includes("/activation/") || url.includes("/order/")
    );
    expect(calledPurchaseEndpoints.length).toBe(0);
  });
});