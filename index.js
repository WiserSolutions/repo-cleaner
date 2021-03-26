const core = require('@actions/core');
const github = require("@actions/github");

const _ = require('lodash');

async function run(callback) {
  try {
    const excludeList = core.getInput('exclude-list').split(',');
    excludeList.sort();
    const orphanTime = core.getInput('orphan-time');

    const dry = core.getInput('dry') == false;

    const token = core.getInput('token');

    const octokit = github.getOctokit(token);

    const allBranches = _.sortBy(await octokit.repos.listBranches(), 'name');

    const allOpenPRBranches = _.map(octokit.pulls.list({
      state: 'open'
    }), 'base.ref');

    allOpenPRBranches.sort();

    // conditions on which a branch ref is deleted:
    const allOrphanBranches = _.chain(allBranches)
    // * branch is part of exclude list
      .reject(b => excludeList.indexOf(b.name) != -1)
    // * branch is part of open pull request
      .reject(b => _.sortedIndexOf(allOpenPRBranches, b.name) != -1);
    // * branch has not seen commit in some time (say a month)
    const oldestAcceptedTime = Date.now() - orphanTime;

    const deletedBranches = [];
    for(const b of allOrphanBranches) {
      const commitInfo = await octokit.repos.getCommit({ ref: b.name });

      if( new Date(commitInfo.commit.author.date).getTime() < oldestAcceptedTime) {
        console.log('[DELETE]', b.name);

        if(!dry) {
          console.log('actually delete');
          /*await octokit.git.deleteRef({
            ref: 'refs/heads/' + b.name
          });*/
        }

        deletedBranches.push(b.name);
      }
    }

    core.setOutput("deleted", deletedBranches.join(','));
  } catch (error) {
    core.setFailed(util.inspect(error));
  }
}

if (module === require.main) {
  run();
}

module.exports = { readPath, makeRepo, getContents };
