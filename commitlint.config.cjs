module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce a fixed set of allowed commit types (Conventional Commits)
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore']],
    // Keep subject case enforcement disabled (no casing rule).
    'subject-case': [0, 'always'],
  },
};
