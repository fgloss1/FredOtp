import { POST as otpPost, GET as otpGet } from "@/app/api/otp/route";
import { POST as cancelPost } from "@/app/api/otp/cancel/route";
import { POST as rentalsExpirePost } from "@/app/api/rentals/expire/route";
import { POST as rentalsPost } from "@/app/api/rentals/route";
import { POST as rentalPurchasePost } from "@/app/api/rentals/purchase/route";

const mockGetAuthenticatedSupabaseUser = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock("@/lib/supabase-request-auth", () => ({
  getAuthenticatedSupabaseUser: mockGetAuthenticatedSupabaseUser,
}));

jest.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: mockFrom,
    rpc: mockRpc,
  },
}));

function makeChain(result: any) {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.maybeSingle = jest.fn(async () => result);
  chain.single = jest.fn(async () => result);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  return chain;
}

function configureDb(profileResult: any, orderResult: any) {
  const profileChain = makeChain(profileResult);
  const orderChain = makeChain(orderResult);

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") return profileChain;
    if (table === "orders") return orderChain;
    throw new Error("Unexpected table: " + table);
  });

  return { profileChain, orderChain };
}

function providerResponse(overrides: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      phone: "+15551234567",
      id: "5sim-order-1",
      price: 0.5,
      ...overrides,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FIVESIM_API_TOKEN = "test-5sim-token";
  global.fetch = jest.fn(async (url: string) => {
    if (url.includes("/cancel/")) {
      return new Response("{}", { status: 200 });
    }
    return providerResponse();
  }) as any;
});

afterEach(() => {
  delete process.env.FIVESIM_API_TOKEN;
});

describe("OTP security regression", () => {
  test("rejects unauthenticated purchase before touching the database", async () => {
    mockGetAuthenticatedSupabaseUser.mockResolvedValue(null);

    const response = await otpPost(new Request("http://localhost/api/otp", {
      method: "POST",
      body: JSON.stringify({
        userId: "attacker-id",
        serviceSlug: "openai",
        countryCode: "US",
        priceUSD: 0.01,
      }),
    }));

    expect(response.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("ignores a forged userId and charges the authenticated user only", async () => {
    const user = { id: "real-user-id" };
    mockGetAuthenticatedSupabaseUser.mockResolvedValue(user);
    const { orderChain } = configureDb(
      { data: { balance: 10 }, error: null },
      {
        data: {
          id: "order-1",
          created_at: new Date().toISOString(),
        },
        error: null,
      }
    );

    mockRpc.mockResolvedValueOnce({ data: 9, error: null });

    const response = await otpPost(new Request("http://localhost/api/otp", {
      method: "POST",
      body: JSON.stringify({
        userId: "attacker-id",
        serviceSlug: "openai",
        countryCode: "US",
        priceUSD: 0.01,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith("otp_balance_adjust_atomic", {
      p_user_id: "real-user-id",
      p_delta: -1,
    });

    const inserted = orderChain.insert.mock.calls[0][0];
    expect(inserted.user_id).toBe("real-user-id");
    expect(inserted.price_usd).toBe(1);
  });

  test("does not debit a wallet when the balance is insufficient", async () => {
    mockGetAuthenticatedSupabaseUser.mockResolvedValue({ id: "real-user-id" });
    configureDb(
      { data: { balance: 0.5 }, error: null },
      { data: null, error: null }
    );

    const response = await otpPost(new Request("http://localhost/api/otp", {
      method: "POST",
      body: JSON.stringify({
        serviceSlug: "openai",
        countryCode: "US",
        priceUSD: 0.5,
      }),
    }));

    expect(response.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes("/cancel/"))).toBe(true);
  });

  test("refunds the wallet and cancels the supplier order when order persistence fails", async () => {
    mockGetAuthenticatedSupabaseUser.mockResolvedValue({ id: "real-user-id" });
    configureDb(
      { data: { balance: 10 }, error: null },
      { data: null, error: new Error("order insert failed") }
    );

    mockRpc
      .mockResolvedValueOnce({ data: 9, error: null })
      .mockResolvedValueOnce({ data: 10, error: null });

    const response = await otpPost(new Request("http://localhost/api/otp", {
      method: "POST",
      body: JSON.stringify({
        serviceSlug: "openai",
        countryCode: "US",
        priceUSD: 0.01,
      }),
    }));

    expect(response.status).toBe(500);
    expect(mockRpc).toHaveBeenNthCalledWith(1, "otp_balance_adjust_atomic", {
      p_user_id: "real-user-id",
      p_delta: -1,
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "otp_balance_adjust_atomic", {
      p_user_id: "real-user-id",
      p_delta: 1,
    });
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes("/cancel/"))).toBe(true);
  });

  test("atomic wallet failure allows only one of two concurrent purchases to succeed", async () => {
    mockGetAuthenticatedSupabaseUser
      .mockResolvedValueOnce({ id: "real-user-id" })
      .mockResolvedValueOnce({ id: "real-user-id" });

    configureDb(
      { data: { balance: 1 }, error: null },
      {
        data: { id: "order-1", created_at: new Date().toISOString() },
        error: null,
      }
    );

    mockRpc
      .mockResolvedValueOnce({ data: 0, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("Insufficient wallet balance") });

    const [first, second] = await Promise.all([
      otpPost(new Request("http://localhost/api/otp", {
        method: "POST",
        body: JSON.stringify({
          serviceSlug: "openai",
          countryCode: "US",
          priceUSD: 0.01,
        }),
      })),
      otpPost(new Request("http://localhost/api/otp", {
        method: "POST",
        body: JSON.stringify({
          serviceSlug: "openai",
          countryCode: "US",
          priceUSD: 0.01,
        }),
      })),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 500]);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect((global.fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes("/cancel/")).length).toBe(1);
  });

  test("does not reveal another customer's order through OTP status", async () => {
    const user = { id: "real-user-id" };
    mockGetAuthenticatedSupabaseUser.mockResolvedValue(user);
    const { orderChain } = configureDb(null, { data: null, error: null });

    const response = await otpGet(
      new Request("http://localhost/api/otp?orderId=other-order")
    );

    expect(response.status).toBe(404);
    expect(orderChain.eq).toHaveBeenCalledWith("user_id", "real-user-id");
  });

  test("does not allow another customer to cancel an order", async () => {
    mockGetAuthenticatedSupabaseUser.mockResolvedValue({ id: "real-user-id" });
    const { orderChain } = configureDb(null, { data: null, error: null });

    const response = await cancelPost(new Request("http://localhost/api/otp/cancel", {
      method: "POST",
      body: JSON.stringify({ orderId: "other-order" }),
    }));

    expect(response.status).toBe(404);
    expect(orderChain.eq).toHaveBeenCalledWith("user_id", "real-user-id");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test("rejects unauthenticated OTP expiry/refund attempts", async () => {
    mockGetAuthenticatedSupabaseUser.mockResolvedValue(null);

    const response = await rentalsExpirePost(new Request("http://localhost/api/rentals/expire", {
      method: "POST",
      body: JSON.stringify({ orderId: "some-order" }),
    }));

    expect(response.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("non-OTP rental mutations are disabled", async () => {
    expect((await rentalsPost()).status).toBe(410);
    expect((await rentalPurchasePost()).status).toBe(410);
  });
});
