const userDetails = (user, payload = {}, includeAllDetails = true) => {
  return {
    ...(includeAllDetails && {
      id: user.id,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
      profession: user.user_details?.profession,
      address: user.user_details?.address,
      phoneNumber: user.user_details?.phone_number,
      isPhoneVerified: user.user_details?.isPhoneVerified,
      instagram: user.user_details?.instagram,
      twitter: user.user_details?.twitter,
      linkedin: user.user_details?.linkedin,
      github: user.user_details?.github,
      profileImage: user.user_details?.profile_image,
      profileScore: user.profileScore,
      reputationScore: user.reputationScore,
      exchangeCount: user.exchangeCount,
      averageRating: user.averageRating,
      ratingCount: user.ratingCount,
      badges: user.badges.map((b) => b.badge_type),
    }),
    ...(includeAllDetails && {
      skillsToLearn:
        user.skills
          ?.filter((skill) => skill.type === 'LEARN')
          ?.map((skill) => skill.skill.name) || [],
      skillsToTeach:
        user.skills
          ?.filter((skill) => skill.type === 'TEACH')
          ?.map((skill) => skill.skill.name) || [],
    }),
    ...((payload.username || includeAllDetails) && {
      username: user.username,
    }),
    ...((payload.email || includeAllDetails) && {
      email: user.email,
    }),
  };
};

module.exports = {
  userDetails,
};
