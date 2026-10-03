import { GET } from "./route";

// Mock Supabase Auth to isolate test fetch assertions strictly to 5SIM API calls
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user-id", email: "test@nava.app" } },
        error: null,
      }),
    },
  },
}));

const originalFetch = global.fetch;

describe("5SIM Diagnostic Route Safety Assertions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    // Mock environment variables for non-production development mode safely in TypeScript
    process.env.FIVESIM_API_TOKEN = "mock_token_123";
    delete process.env.VERCEL_ENV;
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

    const mockRequest = new Request("http://localhost:3000/api/test-5sim", {
      headers: { Authorization: "Bearer mock_supabase_jwt" },
    });

    const response = await GET(mockRequest);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);

    // Safety Assertions: strictly 1 call to 5SIM read-only profile
    expect(fetchedUrls.length).toBe(1);
    expect(fetchedUrls[0]).toBe("https://5sim.net/v1/user/profile");

    // Prohibit purchase paths strictly
    const calledPurchaseEndpoints = fetchedUrls.filter(
      (url) => url.includes("/buy/") || url.includes("/activation/") || url.includes("/order/")
    );
    expect(calledPurchaseEndpoints.length).toBe(0);
  });
});