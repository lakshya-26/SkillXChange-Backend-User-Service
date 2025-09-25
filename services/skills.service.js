const prisma = require('../utilites/prisma');

const addSkill = async (payload) => {
  const { name } = payload;
  const skill = await prisma.skill.create({
    data: { name },
  });
  return {
    message: 'Skill added successfully',
    skill,
  };
};

/**
 * Fetches a list of skills from the database that match a given search term.
 *
 * This function performs a case-insensitive search on the "name" column of the "skill" table.
 * It returns at most 15 results with total count of the search query, ordered first by relevance to the search term and then
 * alphabetically by name to resolve ties.
 * No term → just return top 15 sorted by id.
 *
 * Relevance ordering ensures that skills whose names closely match the search term appear first.
 * Alphabetical fallback guarantees a stable, predictable order when multiple skills have the same relevance score.
 *
 * @param {Object} payload - The input payload containing the search term.
 * @param {string} payload.term - The search term to filter skills by.
 * @returns {Promise<Array>} - A promise that resolves to an array of skill objects matching the search term.
 */
const getSkills = async (payload) => {
  const { term } = payload;

  let skills;
  let totalCount;

  if (term) {
    [skills, totalCount] = await Promise.all([
      prisma.skill.findMany({
        where: {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        },
        orderBy: [
          {
            _relevance: {
              fields: ['name'],
              search: term,
              sort: 'asc',
            },
          },
          {
            name: 'asc',
          },
        ],
        take: 15,
      }),
      prisma.skill.count({
        where: {
          name: {
            contains: term,
            mode: 'insensitive',
          },
        },
      }),
    ]);
  } else {
    [skills, totalCount] = await Promise.all([
      prisma.skill.findMany({
        orderBy: { id: 'asc' },
        take: 15,
      }),
      prisma.skill.count(),
    ]);
  }

  return { totalCount, skills };
};

module.exports = {
  addSkill,
  getSkills,
};
