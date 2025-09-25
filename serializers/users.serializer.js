const userDetails = (user) => {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    profession: user.user_details?.profession,
    address: user.user_details?.address,
    phone_number: user.user_details?.phone_number,
    instagram: user.user_details?.instagram,
    twitter: user.user_details?.twitter,
    linkedin: user.user_details?.linkedin,
    github: user.user_details?.github,
    skillsToLearn:
      user.skills
        ?.filter((skill) => skill.type === 'LEARN')
        ?.map((skill) => skill.skill.name) || [],
    skillsToTeach:
      user.skills
        ?.filter((skill) => skill.type === 'TEACH')
        ?.map((skill) => skill.skill.name) || [],
  };
};

module.exports = {
  userDetails,
};
