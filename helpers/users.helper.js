const prisma = require('../utilites/prisma');
const { convertBigInt } = require('../helpers/commonFunctions.helper');

const buildUserMatchQuery = async ({
  currentUserId,
  page = 1,
  limit = 10,
  includeTermFilter = true,
  term = '',
}) => {
  const intLimit = parseInt(limit, 10);
  const offset = (parseInt(page, 10) - 1) * intLimit;
  const likeTerm = `%${term}%`;

  const users = await prisma.$queryRaw`
    WITH current_user_skills AS (
      SELECT 
        s.name AS skill_name,
        us.type
      FROM user_skills us
      JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ${currentUserId}
        AND us.deleted_at IS NULL
        AND s.deleted_at IS NULL
    )
    SELECT 
      u.id,
      u.name,
      u.username,
      u.email,
      ud.profession,
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'type', us.type
      )) FILTER (WHERE s.id IS NOT NULL), '[]') AS skills,
      (
        COALESCE((
          SELECT COUNT(*) * 3
          FROM user_skills their
          JOIN skills sk ON sk.id = their.skill_id
          JOIN current_user_skills mine ON mine.skill_name ILIKE sk.name
          WHERE mine.type = 'LEARN'
            AND their.type = 'TEACH'
            AND their.user_id = u.id
            AND their.deleted_at IS NULL
            AND sk.deleted_at IS NULL
        ), 0) +
        COALESCE((
          SELECT COUNT(*) * 2
          FROM user_skills their
          JOIN skills sk ON sk.id = their.skill_id
          JOIN current_user_skills mine ON mine.skill_name ILIKE sk.name
          WHERE mine.type = 'TEACH'
            AND their.type = 'LEARN'
            AND their.user_id = u.id
            AND their.deleted_at IS NULL
            AND sk.deleted_at IS NULL
        ), 0) +
        CASE
          WHEN ${includeTermFilter} = true AND (
            u.name ILIKE ${likeTerm} OR
            u.username ILIKE ${likeTerm} OR
            u.email ILIKE ${likeTerm} OR
            ud.profession ILIKE ${likeTerm} OR
            EXISTS (
              SELECT 1
              FROM user_skills us2
              JOIN skills s2 ON s2.id = us2.skill_id
              WHERE us2.user_id = u.id
                AND us2.deleted_at IS NULL
                AND s2.deleted_at IS NULL
                AND s2.name ILIKE ${likeTerm}
            )
          ) THEN 1
          ELSE 0
        END
      ) AS score
    FROM users u
    LEFT JOIN user_details ud 
      ON ud.user_id = u.id AND ud.deleted_at IS NULL
    LEFT JOIN user_skills us 
      ON u.id = us.user_id AND us.deleted_at IS NULL
    LEFT JOIN skills s 
      ON s.id = us.skill_id AND s.deleted_at IS NULL
    WHERE u.id != ${currentUserId}
      AND u.deleted_at IS NULL
    GROUP BY u.id, ud.profession
    HAVING (
      ${includeTermFilter} = false OR
      u.name ILIKE ${likeTerm} OR
      u.username ILIKE ${likeTerm} OR
      u.email ILIKE ${likeTerm} OR
      ud.profession ILIKE ${likeTerm} OR
      EXISTS (
        SELECT 1 FROM user_skills us2
        JOIN skills s2 ON s2.id = us2.skill_id
        WHERE us2.user_id = u.id
          AND us2.deleted_at IS NULL
          AND s2.deleted_at IS NULL
          AND s2.name ILIKE ${likeTerm}
      )
    )
    ORDER BY score DESC, u.created_at DESC
    LIMIT ${intLimit} OFFSET ${offset};
  `;

  return convertBigInt(users);
};

module.exports = { buildUserMatchQuery };
