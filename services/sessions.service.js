const prisma = require('../utilites/prisma');
const { CustomException } = require('../utilites/errorHandler');
const userService = require('./users.service');

const assertParticipant = (session, userId) => {
  const uid = Number(userId);
  if (session.userAId !== uid && session.userBId !== uid) {
    throw new CustomException('Forbidden', 403);
  }
};

const getOtherUserId = (session, userId) => {
  const uid = Number(userId);
  return session.userAId === uid ? session.userBId : session.userAId;
};

const sessionSelect = {
  id: true,
  title: true,
  description: true,
  scheduledAt: true,
  durationMinutes: true,
  meetingLink: true,
  status: true,
  createdById: true,
  userAId: true,
  userBId: true,
  outcomeDecidedAt: true,
  outcomeDecidedById: true,
  outcomeHappened: true,
  createdAt: true,
  updatedAt: true,
  userA: {
    select: {
      id: true,
      name: true,
      username: true,
      user_details: { select: { profile_image: true } },
    },
  },
  userB: {
    select: {
      id: true,
      name: true,
      username: true,
      user_details: { select: { profile_image: true } },
    },
  },
};

const toPublicSession = (row) => {
  return {
    ...row,
    userA: {
      id: row.userA.id,
      name: row.userA.name,
      username: row.userA.username,
      profileImage: row.userA.user_details?.profile_image || null,
    },
    userB: {
      id: row.userB.id,
      name: row.userB.name,
      username: row.userB.username,
      profileImage: row.userB.user_details?.profile_image || null,
    },
  };
};

const computeScheduledEnd = (scheduledAt, durationMinutes) => {
  const start = new Date(scheduledAt);
  return new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
};

const createSession = async (creatorId, payload) => {
  const userAId = Number(creatorId);
  const userBId = Number(payload.userBId);

  if (!Number.isFinite(userAId) || !Number.isFinite(userBId)) {
    throw new CustomException('Invalid user id', 400);
  }
  if (userAId === userBId) {
    throw new CustomException('Cannot create session with yourself', 400);
  }

  const scheduledAt = new Date(payload.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new CustomException('Invalid scheduledAt', 400);
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw new CustomException('scheduledAt must be in the future', 400);
  }

  const durationMinutes = Number(payload.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new CustomException('durationMinutes must be a positive number', 400);
  }

  // Prevent duplicates at same scheduled time (active statuses only)
  const existing = await prisma.session.findFirst({
    where: {
      scheduledAt,
      status: { in: ['PENDING', 'ACCEPTED'] },
      OR: [
        { userAId, userBId },
        { userAId: userBId, userBId: userAId },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    throw new CustomException(
      'A session already exists between these users at the same time',
      409
    );
  }

  const row = await prisma.session.create({
    data: {
      title: payload.title,
      description: payload.description || null,
      scheduledAt,
      durationMinutes,
      meetingLink: payload.meetingLink || null,
      status: 'PENDING',
      createdById: userAId,
      userAId,
      userBId,
    },
    select: sessionSelect,
  });

  return toPublicSession(row);
};

const listMySessions = async (userId, query) => {
  const uid = Number(userId);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const status = query.status || null;

  const where = {
    AND: [
      { OR: [{ userAId: uid }, { userBId: uid }] },
      ...(status ? [{ status }] : []),
    ],
  };

  const [items, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: sessionSelect,
    }),
    prisma.session.count({ where }),
  ]);

  return {
    items: items.map(toPublicSession),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  };
};

const getSessionDetails = async (userId, sessionId) => {
  const row = await prisma.session.findUnique({
    where: { id: sessionId },
    select: sessionSelect,
  });
  if (!row) throw new CustomException('Session not found', 404);
  assertParticipant(row, userId);
  return toPublicSession(row);
};

const acceptSession = async (userId, sessionId) => {
  const uid = Number(userId);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      userAId: true,
      userBId: true,
      scheduledAt: true,
    },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, uid);
  if (session.userBId !== uid) {
    throw new CustomException('Only the invitee can accept', 403);
  }
  if (session.status !== 'PENDING') {
    throw new CustomException('Only PENDING sessions can be accepted', 400);
  }
  if (new Date(session.scheduledAt).getTime() <= Date.now()) {
    throw new CustomException('Cannot accept a past session', 400);
  }

  const row = await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'ACCEPTED' },
    select: sessionSelect,
  });
  return toPublicSession(row);
};

const rejectSession = async (userId, sessionId) => {
  const uid = Number(userId);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, userAId: true, userBId: true },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, uid);
  if (session.userBId !== uid) {
    throw new CustomException('Only the invitee can reject', 403);
  }
  if (session.status !== 'PENDING') {
    throw new CustomException('Only PENDING sessions can be rejected', 400);
  }

  const row = await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'REJECTED' },
    select: sessionSelect,
  });
  return toPublicSession(row);
};

const cancelSession = async (userId, sessionId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, userAId: true, userBId: true },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, userId);
  if (!['PENDING', 'ACCEPTED'].includes(session.status)) {
    throw new CustomException(
      'Only PENDING/ACCEPTED sessions can be cancelled',
      400
    );
  }

  const row = await prisma.session.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED' },
    select: sessionSelect,
  });
  return toPublicSession(row);
};

const completeSession = async (userId, sessionId) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, userAId: true, userBId: true },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, userId);
  if (session.status !== 'ACCEPTED') {
    throw new CustomException('Only ACCEPTED sessions can be completed', 400);
  }

  const row = await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: 'COMPLETED',
      outcomeHappened: true,
      outcomeDecidedAt: new Date(),
      outcomeDecidedById: Number(userId),
    },
    select: sessionSelect,
  });
  return toPublicSession(row);
};

const decideHappened = async (userId, sessionId, happened) => {
  const uid = Number(userId);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      userAId: true,
      userBId: true,
      scheduledAt: true,
      durationMinutes: true,
      outcomeHappened: true,
    },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, uid);

  if (session.status !== 'ACCEPTED') {
    throw new CustomException('Only ACCEPTED sessions can be confirmed', 400);
  }
  if (
    session.outcomeHappened !== null &&
    session.outcomeHappened !== undefined
  ) {
    throw new CustomException('Session outcome already decided', 409);
  }

  const endAt = computeScheduledEnd(
    session.scheduledAt,
    session.durationMinutes
  );
  if (endAt.getTime() > Date.now()) {
    throw new CustomException('Session is not finished yet', 400);
  }

  const now = new Date();
  const data =
    happened === true
      ? {
          outcomeHappened: true,
          outcomeDecidedAt: now,
          outcomeDecidedById: uid,
          status: 'COMPLETED',
        }
      : {
          outcomeHappened: false,
          outcomeDecidedAt: now,
          outcomeDecidedById: uid,
          status: 'CANCELLED',
        };

  const row = await prisma.session.update({
    where: { id: sessionId },
    data,
    select: sessionSelect,
  });

  return toPublicSession(row);
};

const getActionNeeded = async (userId) => {
  const uid = Number(userId);
  const now = new Date();

  const loadOtherUser = async (otherUserId) => {
    const u = await prisma.user.findUnique({
      where: { id: Number(otherUserId) },
      select: {
        id: true,
        name: true,
        username: true,
        user_details: { select: { profile_image: true } },
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      profileImage: u.user_details?.profile_image || null,
    };
  };

  // 1) Ask "did it happen?" for finished ACCEPTED sessions with no outcome decided
  const candidates = await prisma.session.findMany({
    where: {
      status: 'ACCEPTED',
      outcomeHappened: null,
      OR: [{ userAId: uid }, { userBId: uid }],
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 20,
    select: {
      id: true,
      scheduledAt: true,
      durationMinutes: true,
      userAId: true,
      userBId: true,
      title: true,
    },
  });

  const finished = candidates.find((s) => {
    const endAt = computeScheduledEnd(s.scheduledAt, s.durationMinutes);
    return endAt.getTime() <= Date.now();
  });

  if (finished) {
    const otherUserId = getOtherUserId(finished, uid);
    return {
      type: 'CONFIRM_HAPPENED',
      sessionId: finished.id,
      title: finished.title,
      scheduledAt: finished.scheduledAt,
      durationMinutes: finished.durationMinutes,
      otherUserId,
      otherUser: await loadOtherUser(otherUserId),
    };
  }

  // 2) Ask rating for sessions already confirmed happened + completed, if current user hasn't rated yet
  const rateCandidate = await prisma.session.findFirst({
    where: {
      status: 'COMPLETED',
      outcomeHappened: true,
      OR: [{ userAId: uid }, { userBId: uid }],
      ratings: { none: { raterId: uid } },
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      durationMinutes: true,
      userAId: true,
      userBId: true,
    },
  });

  if (rateCandidate) {
    const otherUserId = getOtherUserId(rateCandidate, uid);
    return {
      type: 'RATE',
      sessionId: rateCandidate.id,
      title: rateCandidate.title,
      scheduledAt: rateCandidate.scheduledAt,
      durationMinutes: rateCandidate.durationMinutes,
      otherUserId,
      otherUser: await loadOtherUser(otherUserId),
    };
  }

  return { type: 'NONE' };
};

const getSessionRatingEligibility = async (raterId, otherUserId) => {
  const rater = Number(raterId);
  const other = Number(otherUserId);
  if (rater === other)
    return { allowed: false, reason: 'Cannot rate yourself' };

  const session = await prisma.session.findFirst({
    where: {
      status: 'COMPLETED',
      outcomeHappened: true,
      OR: [
        { userAId: rater, userBId: other },
        { userAId: other, userBId: rater },
      ],
      ratings: { none: { raterId: rater } },
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (!session) {
    return { allowed: false, reason: 'No completed session found to rate' };
  }
  return { allowed: true, sessionId: session.id };
};

const createSessionRating = async (raterId, payload) => {
  const rater = Number(raterId);
  const ratee = Number(payload.rateeId);
  if (rater === ratee) throw new CustomException('Cannot rate yourself', 400);

  const eligibility = await getSessionRatingEligibility(rater, ratee);
  if (!eligibility.allowed) {
    throw new CustomException(
      eligibility.reason || 'Not eligible to rate',
      400
    );
  }

  const sessionId = payload.sessionId || eligibility.sessionId;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      outcomeHappened: true,
      userAId: true,
      userBId: true,
    },
  });
  if (!session) throw new CustomException('Session not found', 404);
  assertParticipant(session, rater);
  if (session.status !== 'COMPLETED' || session.outcomeHappened !== true) {
    throw new CustomException('Session is not eligible for rating', 400);
  }

  const rating = await prisma.sessionRating.create({
    data: {
      sessionId,
      raterId: rater,
      rateeId: ratee,
      stars: payload.stars,
      feedback: payload.feedback || null,
    },
  });

  await userService.updateReputationAndBadges(ratee);

  return rating;
};

module.exports = {
  createSession,
  listMySessions,
  getSessionDetails,
  acceptSession,
  rejectSession,
  completeSession,
  cancelSession,
  decideHappened,
  getActionNeeded,
  getSessionRatingEligibility,
  createSessionRating,
};
