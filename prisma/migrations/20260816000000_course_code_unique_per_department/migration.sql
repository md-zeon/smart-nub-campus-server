-- DropIndex
DROP INDEX "course_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "course_code_department_key" ON "course"("code", "department");
