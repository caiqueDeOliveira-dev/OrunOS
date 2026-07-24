import { describe, it, expect } from "vitest";
import {
  extractNutritionJSON,
  extractFinanceJSON,
  extractHealthJSON,
  extractDeveloperJSON,
  extractTeacherJSON,
} from "../agent-prompts.cjs";

describe("extractNutritionJSON", () => {
  it("extracts valid nutrition JSON", () => {
    const text = "This looks like a pasta dish.\n\n```json\n{\"calories\": 450, \"protein_g\": 20, \"carbs_g\": 60, \"fat_g\": 15}\n```";
    const result = extractNutritionJSON(text);
    expect(result).toEqual({ calories: 450, protein_g: 20, carbs_g: 60, fat_g: 15 });
  });

  it("returns null for text without JSON", () => {
    expect(extractNutritionJSON("Just a normal reply")).toBeNull();
  });

  it("handles missing fields gracefully", () => {
    const result = extractNutritionJSON('{"calories": 300}');
    expect(result).toEqual({ calories: 300, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});

describe("extractFinanceJSON", () => {
  it("extracts valid finance JSON", () => {
    const text = "I'll log that expense.\n\n{\"description\": \"Coffee at Starbucks\", \"amount\": 5.50, \"currency\": \"USD\", \"category\": \"food\", \"type\": \"expense\"}";
    const result = extractFinanceJSON(text);
    expect(result).toEqual({
      description: "Coffee at Starbucks",
      amount: 5.50,
      currency: "USD",
      category: "food",
      type: "expense",
    });
  });

  it("returns null when amount is zero", () => {
    expect(extractFinanceJSON('{"description": "free item", "amount": 0}')).toBeNull();
  });

  it("defaults currency to BRL", () => {
    const result = extractFinanceJSON('{"description": "Lunch", "amount": 12.99}');
    expect(result.currency).toBe("BRL");
  });

  it("normalizes type to expense if not income", () => {
    const result = extractFinanceJSON('{"description": "Refund", "amount": 20, "type": "refund"}');
    expect(result.type).toBe("expense");
  });
});

describe("extractHealthJSON", () => {
  it("extracts valid health JSON", () => {
    const text = "Your blood pressure reading:\n\n{\"metric\": \"blood_pressure\", \"value\": 120, \"unit\": \"mmHg\", \"notes\": \"Normal range\"}";
    const result = extractHealthJSON(text);
    expect(result).toEqual({
      metric: "blood_pressure",
      value: 120,
      unit: "mmHg",
      notes: "Normal range",
    });
  });

  it("returns null for non-numeric value", () => {
    expect(extractHealthJSON('{"metric": "weight", "value": "heavy"}')).toBeNull();
  });

  it("handles missing optional fields", () => {
    const result = extractHealthJSON('{"metric": "steps", "value": 8500}');
    expect(result).toEqual({ metric: "steps", value: 8500, unit: "", notes: "" });
  });
});

describe("extractDeveloperJSON", () => {
  it("extracts valid developer review JSON", () => {
    const text = "Here's my review:\n\n{\"repo\": \"orun-os\", \"file_path\": \"src/main.ts\", \"summary\": \"Missing error handling\", \"issues_found\": 2, \"severity\": \"medium\"}";
    const result = extractDeveloperJSON(text);
    expect(result).toEqual({
      repo: "orun-os",
      file_path: "src/main.ts",
      summary: "Missing error handling",
      issues_found: 2,
      severity: "medium",
    });
  });

  it("defaults severity to low for invalid values", () => {
    const result = extractDeveloperJSON('{"summary": "Minor issue", "issues_found": 1, "severity": "unknown"}');
    expect(result.severity).toBe("low");
  });

  it("returns null for missing summary", () => {
    expect(extractDeveloperJSON('{"issues_found": 1}')).toBeNull();
  });
});

describe("extractTeacherJSON", () => {
  it("extracts valid teacher progress JSON", () => {
    const text = "Great progress!\n\n{\"subject\": \"Mathematics\", \"topic\": \"Linear Algebra\", \"status\": \"mastered\", \"score\": 95, \"notes\": \"Excellent understanding\"}";
    const result = extractTeacherJSON(text);
    expect(result).toEqual({
      subject: "Mathematics",
      topic: "Linear Algebra",
      status: "mastered",
      score: 95,
      notes: "Excellent understanding",
    });
  });

  it("defaults status to learning for invalid values", () => {
    const result = extractTeacherJSON('{"subject": "Science", "topic": "Physics", "status": "unknown"}');
    expect(result.status).toBe("learning");
  });

  it("returns null for missing subject or topic", () => {
    expect(extractTeacherJSON('{"subject": "Math", "status": "learning"}')).toBeNull();
    expect(extractTeacherJSON('{"topic": "Algebra", "status": "learning"}')).toBeNull();
  });

  it("handles null score", () => {
    const result = extractTeacherJSON('{"subject": "History", "topic": "WW2", "status": "learning", "score": null}');
    expect(result.score).toBeNull();
  });
});
