const prisma = require('../utilites/prisma');

const getMonthlyHighlights = async () => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [topExchangers, mostTaughtSkillAgg] = await Promise.all([
    prisma.session.groupBy({
      by: ['userAId'],
      where: {
        status: 'COMPLETED',
        outcomeHappened: true,
        updatedAt: { gte: from, lte: now },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 3,
    }),
    prisma.userSkills.groupBy({
      by: ['skill_id'],
      where: { type: 'TEACH' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    }),
  ]);

  // Expand top exchangers to names
  const userIds = Array.from(new Set(topExchangers.map((r) => r.userAId)));
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, username: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topUsers = topExchangers
    .map((r) => ({
      userId: r.userAId,
      name: userMap.get(r.userAId)?.name || 'User',
      username: userMap.get(r.userAId)?.username || null,
      exchanges: r._count.id,
    }))
    .filter(Boolean);

  // Most taught skill (based on # of TEACH users)
  let mostTaughtSkill = null;
  if (mostTaughtSkillAgg.length > 0) {
    const skillId = mostTaughtSkillAgg[0].skill_id;
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      select: { name: true },
    });
    mostTaughtSkill = {
      name: skill?.name || null,
      teachers: mostTaughtSkillAgg[0]._count.id,
    };
  }

  // Challenge copy (kept simple but data-backed)
  const sessionsCompletedThisMonth = await prisma.session.count({
    where: {
      status: 'COMPLETED',
      outcomeHappened: true,
      updatedAt: { gte: from, lte: now },
    },
  });

  return {
    range: { from: from.toISOString(), to: now.toISOString() },
    topLearnersThisMonth: topUsers,
    mostTaughtSkill,
    challenge: {
      title: 'Community momentum',
      subtitle: `${sessionsCompletedThisMonth} sessions completed in the last 30 days`,
    },
  };
};

module.exports = {
  getMonthlyHighlights,
};
