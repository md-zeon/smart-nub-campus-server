import { prisma } from "../../lib/prisma";

/**
 * List all tags with total usage count across all modules.
 */
const listTags = async (search?: string) => {
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          resourceTags: true,
          discussionTags: true,
          questionTags: true,
          teamRequestSkills: true,
          userSkills: true,
        },
      },
    },
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    createdAt: tag.createdAt,
    totalCount:
      tag._count.resourceTags +
      tag._count.discussionTags +
      tag._count.questionTags +
      tag._count.teamRequestSkills +
      tag._count.userSkills,
  }));
};

/**
 * Create or retrieve a tag by name (upsert).
 * Returns the existing tag if a tag with the same slug already exists.
 */
const createTag = async (name: string) => {
  const slug = name.toLowerCase().replace(/\s+/g, "-");

  const tag = await prisma.tag.upsert({
    where: { slug },
    update: {},
    create: { name, slug },
  });

  return tag;
};

/**
 * Create multiple tags at once (upsert each).
 * Returns all tags (existing + newly created).
 */
const createTags = async (names: string[]) => {
  const tags = await Promise.all(
    names.map((name) => createTag(name.trim())),
  );
  return tags;
};

export const tagService = {
  listTags,
  createTag,
  createTags,
};
