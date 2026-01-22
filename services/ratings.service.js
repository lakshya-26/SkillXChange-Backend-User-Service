const prisma = require('../utilites/prisma');
const { CustomException } = require('../utilites/errorHandler');
const userService = require('./users.service');

const COMMUNICATION_SERVICE_URL =
  process.env.COMMUNICATION_SERVICE_URL || 'http://localhost:8080/api';

const canRate = async (raterId, rateeId, token) => {
  // 1. Call Communication Service to find eligible conversation
  try {
    const response = await fetch(
      `${COMMUNICATION_SERVICE_URL}/conversation/eligibility?userA=${raterId}&userB=${rateeId}`,
      {
        headers: {
          Authorization: token || '',
        },
      }
    );

    if (!response.ok) {
      // Try to parse error
      const errJson = await response.json().catch(() => ({}));
      return {
        allowed: false,
        reason: errJson.message || 'Error checking eligibility',
      };
    }

    const json = await response.json();
    const result = json.data;

    if (!result.eligible) {
      return { allowed: false, reason: result.reason };
    }

    const conversationId = result.conversationId;

    // 2. Check if already rated THIS conversation
    const existing = await prisma.rating.findUnique({
      where: {
        rater_id_ratee_id_conversation_id: {
          rater_id: Number(raterId),
          ratee_id: Number(rateeId),
          conversation_id: conversationId.toString(),
        },
      },
    });

    if (existing) {
      return { allowed: false, reason: 'Already rated this conversation' };
    }

    return { allowed: true, conversationId: conversationId.toString() };
  } catch (error) {
    console.error('Error verifying rating eligibility:', error);
    return { allowed: false, reason: 'Internal error verifying eligibility' };
  }
};

const createRating = async (raterId, payload, token) => {
  const { rateeId, stars, feedback } = payload;
  const numRaterId = Number(raterId);
  const numRateeId = Number(rateeId);

  if (numRaterId === numRateeId) {
    throw new CustomException('Cannot rate yourself', 400);
  }

  /*
    We ignore payload.conversationId because we want to enforce
    the system-verified conversation ID found via canRate logic.
  */
  const eligibility = await canRate(numRaterId, numRateeId, token);
  if (!eligibility.allowed) {
    throw new CustomException(eligibility.reason, 400);
  }

  const verifiedConversationId = eligibility.conversationId;

  const rating = await prisma.rating.create({
    data: {
      rater_id: numRaterId,
      ratee_id: numRateeId,
      conversation_id: verifiedConversationId,
      stars,
      feedback,
    },
  });

  // Trigger reputation calculation
  // We do this asynchronously or start it here.
  // We need to implement updateReputationAndBadges in users.service
  await userService.updateReputationAndBadges(numRateeId);

  return rating;
};

const getMyGivenRatings = async (userId) => {
  return prisma.rating.findMany({
    where: { rater_id: Number(userId) },
    orderBy: { created_at: 'desc' },
  });
};

const getMyReceivedRatings = async (userId) => {
  return prisma.rating.findMany({
    where: { ratee_id: Number(userId) },
    orderBy: { created_at: 'desc' },
  });
};

module.exports = {
  canRate,
  createRating,
  getMyGivenRatings,
  getMyReceivedRatings,
};
