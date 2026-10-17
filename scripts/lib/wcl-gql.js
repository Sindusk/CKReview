// scripts/lib/wcl-gql.js
//
// A small Warcraft Logs GraphQL caller for read-only scripts
// (wow-rankings.js, wow-probe.js): the user token from
// .credentials/wcl-token.json (node-log-auth.js), one retry on a 401, and
// the hour's point budget kept from each answer's rateLimitData. Pass
// stopAt to refuse queries once that share of the hour's points is spent.

const path = require('path');
const { ROOT } = require('./require-ts');
const { createNodeLogAuth } = require('./node-log-auth');

function createWclGql({ creds, stopAt = 1 } = {}) {
  const auth = createNodeLogAuth({
    providerLabel: 'WarcraftLogs',
    clientId:      'a22351f8-ab0e-4861-88c3-f27023c99156', // must match lib/log-auth.ts's WCL clientId
    tokenUrl:      'https://www.warcraftlogs.com/oauth/token',
    credsPath:     creds ? path.resolve(creds) : path.join(ROOT, '.credentials', 'wcl-token.json'),
  });
  const state = { budget: null };

  async function gql(query, variables) {
    const b = state.budget;
    if (b && b.pointsSpentThisHour >= b.limitPerHour * stopAt) {
      throw new Error(`stopping: ${b.pointsSpentThisHour.toFixed(0)} of ${b.limitPerHour} points spent this hour (--stop-at ${stopAt}); resets in ${Math.ceil(b.pointsResetIn / 60)} min`);
    }
    let token = await auth.getAccessToken();
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('https://www.warcraftlogs.com/api/v2/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 401 && attempt === 0) { token = await auth.forceRefreshAccessToken(); continue; }
      if (!res.ok) throw new Error(`WCL request failed (${res.status}): ${await res.text()}`);
      const json = await res.json();
      if (json.errors?.length) throw new Error(`WCL GraphQL error: ${json.errors[0].message}`);
      state.budget = json.data.rateLimitData ?? state.budget;
      return json.data;
    }
    throw new Error('WCL auth failed twice');
  }

  const budgetLine = () => {
    const b = state.budget;
    return b ? `[points: ${b.pointsSpentThisHour.toFixed(0)} of ${b.limitPerHour} this hour, resets in ${Math.ceil(b.pointsResetIn / 60)} min]` : '';
  };

  return { gql, budgetLine };
}

module.exports = { createWclGql };
