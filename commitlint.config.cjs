module.exports = {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    // Ignore historical commits that don't follow conventional format
    (message) => message.includes('Initial commit'),
    (message) => message.includes('initial commit'),
    (message) => message.startsWith('SBP-212: Set up repository'),
  ]
};
