const { randomUUID } = require('crypto');

function makeId(prefix = 'ESG') {
  return `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

module.exports = { makeId };
