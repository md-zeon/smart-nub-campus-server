import { describe, it, expect } from "vitest";
import { isStudentId, parseStudentId } from "../student-id";

describe("student-id utils", () => {
  describe("isStudentId", () => {
    it("accepts a well-formed CSE student ID", () => {
      expect(isStudentId("41221100001")).toBe(true);
    });

    it("accepts a valid SUMMER intake", () => {
      expect(isStudentId("41222200001")).toBe(true);
    });

    it("accepts a valid FALL intake", () => {
      expect(isStudentId("41223300001")).toBe(true);
    });

    it("rejects strings that are not exactly 11 digits", () => {
      expect(isStudentId("")).toBe(false);
      expect(isStudentId("4122110000")).toBe(false);
      expect(isStudentId("412211000011")).toBe(false);
    });

    it("rejects non-digit characters", () => {
      expect(isStudentId("4122110000a")).toBe(false);
      expect(isStudentId("41221-00001")).toBe(false);
    });

    it("rejects unknown department codes", () => {
      expect(isStudentId("99221100001")).toBe(false);
    });

    it("rejects invalid semester codes", () => {
      expect(isStudentId("41000000001")).toBe(false);
      expect(isStudentId("41221110001")).toBe(false);
    });
  });

  describe("parseStudentId", () => {
    it("parses a CSE SPRING intake", () => {
      expect(parseStudentId("41221100001")).toEqual({
        department: "CSE",
        admissionYear: 2022,
        admissionSemester: "SPRING",
        serialNumber: 1,
      });
    });

    it("parses a SUMMER intake", () => {
      expect(parseStudentId("41222200001")).toEqual({
        department: "CSE",
        admissionYear: 2022,
        admissionSemester: "SUMMER",
        serialNumber: 1,
      });
    });

    it("parses a FALL intake", () => {
      expect(parseStudentId("41223300001")).toEqual({
        department: "CSE",
        admissionYear: 2022,
        admissionSemester: "FALL",
        serialNumber: 1,
      });
    });

    it("parses a later admission year", () => {
      expect(parseStudentId("41241100001").admissionYear).toBe(2024);
    });

    it("parses the serial number", () => {
      expect(parseStudentId("41221101234").serialNumber).toBe(1234);
    });

    it("parses other department codes", () => {
      expect(parseStudentId("45221100001").department).toBe("BBA");
      expect(parseStudentId("30221100001").department).toBe("BTX");
    });

    it("throws for an invalid student ID", () => {
      expect(() => parseStudentId("99999999999")).toThrow(
        "Invalid student ID format.",
      );
    });
  });
});
