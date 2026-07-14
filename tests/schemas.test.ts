import { describe, it, expect } from "vitest";
import { loginSchema, changePasswordSchema } from "@/schemas/auth";
import { createBuggySchema, updateBuggySchema, assignDriverSchema, buggyQuerySchema } from "@/schemas/buggy";
import { createLocationSchema, updateLocationSchema, locationQuerySchema } from "@/schemas/location";
import { createRequestSchema, requestQuerySchema } from "@/schemas/request";
import { createUserSchema, userQuerySchema } from "@/schemas/user";

describe("loginSchema", () => {
  it("validates correct input", () => {
    const result = loginSchema.safeParse({ username: "admin", password: "secret" });
    expect(result.success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = loginSchema.safeParse({ username: "", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ username: "admin", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "oldPass1!",
    newPassword: "NewPass1!",
  };

  it("validates correct input", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects new password shorter than 8 chars", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "Short1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password missing uppercase", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "lowercase1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password missing lowercase", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "UPPERCASE1!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password missing digit", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "NoDigits!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects new password missing special char", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: "NoSpecial1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty currentPassword", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "NewPass1!",
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  const valid = {
    username: "newuser",
    password: "Strong1!Pass",
    role: "DRIVER" as const,
    fullName: "New User",
  };

  it("validates correct input", () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty username", () => {
    const result = createUserSchema.safeParse({ ...valid, username: "" });
    expect(result.success).toBe(false);
  });

  it("rejects username over 50 chars", () => {
    const result = createUserSchema.safeParse({
      ...valid,
      username: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects weak password", () => {
    const result = createUserSchema.safeParse({ ...valid, password: "weak" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({ ...valid, role: "MANAGER" });
    expect(result.success).toBe(false);
  });


  it("accepts optional email and phone", () => {
    const result = createUserSchema.safeParse({
      ...valid,
      email: "test@example.com",
      phone: "+905551234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createUserSchema.safeParse({
      ...valid,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createBuggySchema", () => {
  const valid = {
    code: "BG-001",
  };

  it("validates minimal input", () => {
    expect(createBuggySchema.safeParse(valid).success).toBe(true);
  });

  it("defaults status to AVAILABLE", () => {
    const result = createBuggySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("AVAILABLE");
    }
  });

  it("defaults isActive to true", () => {
    const result = createBuggySchema.safeParse(valid);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects empty code", () => {
    const result = createBuggySchema.safeParse({ ...valid, code: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = createBuggySchema.safeParse({
      ...valid,
      status: "FLYING",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["AVAILABLE", "BUSY", "OFFLINE", "MAINTENANCE"]) {
      const result = createBuggySchema.safeParse({ ...valid, status });
      expect(result.success).toBe(true);
    }
  });

});

describe("updateBuggySchema", () => {
  it("validates partial update with just code", () => {
    expect(updateBuggySchema.safeParse({ code: "NEW" }).success).toBe(true);
  });

  it("validates empty object (all optional)", () => {
    expect(updateBuggySchema.safeParse({}).success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateBuggySchema.safeParse({ status: "BROKEN" });
    expect(result.success).toBe(false);
  });
});

describe("assignDriverSchema", () => {
  it("validates correct input", () => {
    expect(
      assignDriverSchema.safeParse({ buggyId: 1, driverId: 2 }).success,
    ).toBe(true);
  });

  it("defaults isPrimary to false", () => {
    const result = assignDriverSchema.safeParse({ buggyId: 1, driverId: 2 });
    if (result.success) {
      expect(result.data.isPrimary).toBe(false);
    }
  });

  it("rejects non-positive IDs", () => {
    expect(
      assignDriverSchema.safeParse({ buggyId: 0, driverId: 1 }).success,
    ).toBe(false);
  });
});

describe("buggyQuerySchema", () => {
  it("parses string page into number", () => {
    const result = buggyQuerySchema.safeParse({ page: "2" });
    if (result.success) {
      expect(result.data.page).toBe(2);
    }
  });

  it("defaults page to 1, pageSize to 20", () => {
    const result = buggyQuerySchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rejects pageSize > 100", () => {
    expect(buggyQuerySchema.safeParse({ pageSize: 200 }).success).toBe(false);
  });
});

describe("createLocationSchema", () => {
  const valid = { name: "Lobby" };

  it("validates correct input", () => {
    expect(createLocationSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults displayOrder to 0 and isActive to true", () => {
    const result = createLocationSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
      expect(result.data.isActive).toBe(true);
    }
  });

  it("rejects empty name", () => {
    const result = createLocationSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range latitude", () => {
    const result = createLocationSchema.safeParse({
      ...valid,
      latitude: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLocationSchema", () => {
  it("validates with just name", () => {
    expect(
      updateLocationSchema.safeParse({ name: "New Name" }).success,
    ).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateLocationSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("locationQuerySchema", () => {
  it("parses boolean strings", () => {
    const result = locationQuerySchema.safeParse({ isActive: "true" });
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it("defaults page/pageSize", () => {
    const result = locationQuerySchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});

describe("createRequestSchema", () => {
  it("validates with just locationId", () => {
    expect(createRequestSchema.safeParse({ locationId: 1 }).success).toBe(
      true,
    );
  });

  it("defaults hasRoom to true", () => {
    const result = createRequestSchema.safeParse({ locationId: 1 });
    if (result.success) {
      expect(result.data.hasRoom).toBe(true);
    }
  });

  it("rejects non-positive locationId", () => {
    const result = createRequestSchema.safeParse({ locationId: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = createRequestSchema.safeParse({
      locationId: 1,
      guestName: "John",
      roomNumber: "101",
      hasRoom: true,
      phone: "+123",
      notes: "Please hurry",
      guestFcmToken: "tok_abc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing locationId", () => {
    const result = createRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("requestQuerySchema", () => {
  it("parses date strings", () => {
    const result = requestQuerySchema.safeParse({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = requestQuerySchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers", () => {
    const result = requestQuerySchema.safeParse({ page: "3", driverId: "5" });
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.driverId).toBe(5);
    }
  });
});

describe("userQuerySchema", () => {
  it("validates with role filter", () => {
    expect(userQuerySchema.safeParse({ role: "DRIVER" }).success).toBe(true);
  });

  it("rejects invalid role", () => {
    expect(userQuerySchema.safeParse({ role: "MANAGER" }).success).toBe(false);
  });

  it("parses isActive boolean strings", () => {
    const result = userQuerySchema.safeParse({ isActive: "false" });
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });
});
