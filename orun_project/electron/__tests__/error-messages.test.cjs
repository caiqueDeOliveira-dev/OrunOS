const { getErrorMessage, getErrorTitle } = require("../error-messages.cjs");

describe("error-messages", () => {
  it("should translate HTTP 401", () => {
    const msg = getErrorMessage({ message: "HTTP 401" });
    expect(msg).toContain("API key");
  });

  it("should translate HTTP 429", () => {
    const msg = getErrorMessage({ message: "HTTP 429" });
    expect(msg).toContain("requistos");
  });

  it("should translate network errors", () => {
    const msg = getErrorMessage({ message: "ECONNRESET" });
    expect(msg.toLowerCase()).toContain("conex");
  });

  it("should return title for errors", () => {
    const title = getErrorTitle({ message: "HTTP 401" });
    expect(typeof title).toBe("string");
    expect(title.length).toBeGreaterThan(0);
  });

  it("should handle unknown errors gracefully", () => {
    const msg = getErrorMessage({ message: "something unknown" });
    expect(msg).toBeTruthy();
  });

  it("should return default for null error", () => {
    const msg = getErrorMessage(null);
    expect(msg).toBeTruthy();
  });

  it("should handle string errors", () => {
    const msg = getErrorMessage("ECONNRESET");
    expect(msg.toLowerCase()).toContain("conex");
  });

  it("should return title for 429", () => {
    const title = getErrorTitle({ message: "HTTP 429" });
    expect(title).toBe("Limite atingido");
  });

  it("should return generic title for unknown error", () => {
    const title = getErrorTitle({ message: "something random" });
    expect(title).toBe("Erro");
  });
});
