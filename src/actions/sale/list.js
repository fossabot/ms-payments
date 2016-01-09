const { processResult, mapResult } = require('../../listUtils');
const fsort = require('redis-filtered-sort');

function saleList(opts) {
  const { redis } = this;
  const { filter } = opts;
  const criteria = opts.criteria || 'startedAt';
  const strFilter = typeof filter === 'string' ? filter : fsort.filter(filter || {});
  const order = opts.order || 'ASC';
  const offset = opts.offset || 0;
  const limit = opts.limit || 10;

  return redis
    .fsort('sales-index', 'sales-data:*', criteria, order, strFilter, offset, limit)
    .then(processResult('sales-data', redis))
    .spread(mapResult(offset, limit));
}

module.exports = saleList;
