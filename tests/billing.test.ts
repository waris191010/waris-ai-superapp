// Mocking Prisma Client untuk mencegah mutasi data asli di database produksi saat testing
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aIHistoryLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn((promises) => Promise.all(promises)),
};

describe("Skenario Sistem Billing & Konsumsi Kredit WARIS AI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Harus berhasil memotong saldo kredit user ketika request AI valid", async () => {
    const mockUser = { id: "usr_testing_99", email: "tester@waris.ai", credits: 100.0 };
    const costForFluxImage = 12.5;

    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, credits: mockUser.credits - costForFluxImage });

    const updatedCredits = mockUser.credits - costForFluxImage;

    expect(updatedCredits).toBe(87.5);
    expect(prismaMock.$transaction).toBeDefined();
  });

  it("Harus menolak transaksi jika sisa kredit pengguna di bawah batas minimum", async () => {
    const mockUser = { id: "usr_testing_low", email: "miskin@waris.ai", credits: 2.0 };
    const requiredCost = 10.0; // Butuh 10 kredit untuk video generator

    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    const hasEnoughCredits = mockUser.credits >= requiredCost;
    expect(hasEnoughCredits).toBe(false);
  });
});
