import { Department } from "../../generated/prisma/enums";

export interface DepartmentMetadata {
  code: string;
  shortName: string;
  fullName: string;
}

const departmentMetadataMap: Record<Department, DepartmentMetadata> = {
  [Department.CSE]: {
    code: "41",
    shortName: "CSE",
    fullName: "Computer Science and Engineering",
  },
  [Department.ECSE]: {
    code: "42",
    shortName: "ECSE",
    fullName: "Evening Computer Science and Engineering",
  },
  [Department.EEE]: {
    code: "43",
    shortName: "EEE",
    fullName: "Electrical and Electronic Engineering",
  },
  [Department.EEEE]: {
    code: "44",
    shortName: "EEEE",
    fullName: "Evening Electrical and Electronic Engineering",
  },
  [Department.BBA]: {
    code: "45",
    shortName: "BBA",
    fullName: "Bachelor of Business Administration",
  },
  [Department.MBA]: {
    code: "46",
    shortName: "MBA",
    fullName: "Master of Business Administration",
  },
  [Department.ENGLISH]: {
    code: "47",
    shortName: "ENGLISH",
    fullName: "English",
  },
  [Department.MAE]: {
    code: "48",
    shortName: "MAE",
    fullName: "Master of Arts in English",
  },
  [Department.BANGLA]: {
    code: "49",
    shortName: "BANGLA",
    fullName: "Bangla",
  },
  [Department.MAB]: {
    code: "50",
    shortName: "MAB",
    fullName: "Master of Arts in Bangla",
  },
  [Department.LLB]: {
    code: "51",
    shortName: "LLB",
    fullName: "Bachelor of Laws",
  },
  [Department.MPH]: {
    code: "53",
    shortName: "MPH",
    fullName: "Master of Pharmacy",
  },
  [Department.BPH]: {
    code: "55",
    shortName: "BPH",
    fullName: "Bachelor of Pharmacy",
  },
  [Department.ME]: {
    code: "58",
    shortName: "ME",
    fullName: "Mechanical Engineering",
  },
  [Department.CIVIL]: {
    code: "59",
    shortName: "CIVIL",
    fullName: "Civil Engineering",
  },
  [Department.BTX]: {
    code: "30",
    shortName: "BTX",
    fullName: "Bachelor of Textile Engineering",
  },
  [Department.EBTX]: {
    code: "33",
    shortName: "EBTX",
    fullName: "Evening Textile Engineering",
  },
};

export const getDepartmentMetadata = (
  department: Department,
): DepartmentMetadata => {
  return departmentMetadataMap[department];
};

export const getDepartmentByCode = (code: string): Department | undefined => {
  return Object.entries(departmentMetadataMap).find(
    ([, metadata]) => metadata.code === code,
  )?.[0] as Department | undefined;
};
