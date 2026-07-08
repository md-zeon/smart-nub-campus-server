/*
  Warnings:

  - Added the required column `admissionSemester` to the `student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `admissionYear` to the `student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department` to the `student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AdmissionSemester" AS ENUM ('SPRING', 'SUMMER', 'FALL');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('CSE', 'ECSE', 'EEE', 'EEEE', 'BBA', 'MBA', 'ENGLISH', 'MAE', 'BANGLA', 'MAB', 'LLB', 'MPH', 'BPH', 'ME', 'CIVIL', 'BTX', 'EBTX');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "student" ADD COLUMN     "admissionSemester" "AdmissionSemester" NOT NULL,
ADD COLUMN     "admissionYear" INTEGER NOT NULL,
ADD COLUMN     "department" "Department" NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "gender" "Gender";

-- CreateIndex
CREATE INDEX "student_department_idx" ON "student"("department");

-- CreateIndex
CREATE INDEX "student_admissionYear_idx" ON "student"("admissionYear");

-- CreateIndex
CREATE INDEX "student_admissionSemester_idx" ON "student"("admissionSemester");
