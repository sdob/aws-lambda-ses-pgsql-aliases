module.exports = {
  extends: 'airbnb',
  rules: {
    'no-use-before-define': ['error', { functions: false, classes: true }],
    'camelcase': [0, { properties: 'never' }],
  },
};
