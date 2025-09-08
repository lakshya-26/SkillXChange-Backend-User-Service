const sendResponse = (req, res) => {
  const { statusCode, data, message } = req;

  res.status(statusCode).json({
    data,
    message,
  });

  return res.end();
};

module.exports = {
  sendResponse,
};
