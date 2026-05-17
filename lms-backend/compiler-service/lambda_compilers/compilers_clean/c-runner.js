const { handler: sharedHandler } = require('./handler');

exports.handler = async (event, context) => {
  return sharedHandler({ ...event, language: 'c' }, context);
};
