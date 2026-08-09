-- CreateExtension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "discussion" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "job_posts" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "resource" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "team_requests" ADD COLUMN     "searchTsv" tsvector;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "searchTsv" tsvector;

-- Backfill existing rows
UPDATE "course" SET "searchTsv" = setweight(to_tsvector('english', coalesce("name", '')), 'A') || setweight(to_tsvector('english', coalesce("description", '')), 'B');
UPDATE "discussion" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("content", '')), 'B');
UPDATE "events" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("description", '')), 'B') || setweight(to_tsvector('english', coalesce("location", '')), 'B');
UPDATE "job_posts" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("company", '')), 'A') || setweight(to_tsvector('english', coalesce("description", '')), 'B');
UPDATE "question" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("content", '')), 'B');
UPDATE "resource" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("description", '')), 'B');
UPDATE "team_requests" SET "searchTsv" = setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("description", '')), 'B');
UPDATE "user_profiles" SET "searchTsv" = setweight(to_tsvector('english', coalesce("mentorHeadline", '')), 'A') || setweight(to_tsvector('english', coalesce("mentorBio", '')), 'B');

-- Trigger functions to keep searchTsv in sync
CREATE OR REPLACE FUNCTION "fn_course_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."name", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_course_search_tsv" BEFORE INSERT OR UPDATE OF "name", "description" ON "course" FOR EACH ROW EXECUTE FUNCTION "fn_course_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_discussion_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."content", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_discussion_search_tsv" BEFORE INSERT OR UPDATE OF "title", "content" ON "discussion" FOR EACH ROW EXECUTE FUNCTION "fn_discussion_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_events_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B') || setweight(to_tsvector('english', coalesce(NEW."location", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_events_search_tsv" BEFORE INSERT OR UPDATE OF "title", "description", "location" ON "events" FOR EACH ROW EXECUTE FUNCTION "fn_events_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_job_posts_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."company", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_job_posts_search_tsv" BEFORE INSERT OR UPDATE OF "title", "company", "description" ON "job_posts" FOR EACH ROW EXECUTE FUNCTION "fn_job_posts_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_question_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."content", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_question_search_tsv" BEFORE INSERT OR UPDATE OF "title", "content" ON "question" FOR EACH ROW EXECUTE FUNCTION "fn_question_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_resource_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_resource_search_tsv" BEFORE INSERT OR UPDATE OF "title", "description" ON "resource" FOR EACH ROW EXECUTE FUNCTION "fn_resource_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_team_requests_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_team_requests_search_tsv" BEFORE INSERT OR UPDATE OF "title", "description" ON "team_requests" FOR EACH ROW EXECUTE FUNCTION "fn_team_requests_search_tsv_update"();

CREATE OR REPLACE FUNCTION "fn_user_profiles_search_tsv_update"() RETURNS trigger AS $$
BEGIN
  NEW."searchTsv" := setweight(to_tsvector('english', coalesce(NEW."mentorHeadline", '')), 'A') || setweight(to_tsvector('english', coalesce(NEW."mentorBio", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "trg_user_profiles_search_tsv" BEFORE INSERT OR UPDATE OF "mentorHeadline", "mentorBio" ON "user_profiles" FOR EACH ROW EXECUTE FUNCTION "fn_user_profiles_search_tsv_update"();

-- CreateIndex
CREATE INDEX "course_searchTsv_idx" ON "course" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "course_name_idx" ON "course" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "discussion_searchTsv_idx" ON "discussion" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "discussion_title_idx" ON "discussion" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "events_searchTsv_idx" ON "events" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "events_title_idx" ON "events" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "job_posts_searchTsv_idx" ON "job_posts" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "job_posts_title_idx" ON "job_posts" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "job_posts_company_idx" ON "job_posts" USING GIN ("company" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "question_searchTsv_idx" ON "question" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "question_title_idx" ON "question" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "resource_searchTsv_idx" ON "resource" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "resource_title_idx" ON "resource" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "team_requests_searchTsv_idx" ON "team_requests" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "team_requests_title_idx" ON "team_requests" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_name_idx" ON "user" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_profiles_searchTsv_idx" ON "user_profiles" USING GIN ("searchTsv");

-- CreateIndex
CREATE INDEX "user_profiles_mentorHeadline_idx" ON "user_profiles" USING GIN ("mentorHeadline" gin_trgm_ops);
