const util = require('util');

const core = require('@actions/core');
const github = require("@actions/github");

const _ = require('lodash');

async function run(callback) {
  try {
    const excludeList = core.getInput('exclude-list').split(',');
    excludeList.sort();
    const orphanTime = core.getInput('orphan-time');

    const executeDelete = core.getInput('dry') == false;

    const token = core.getInput('token');

    const octokit = github.getOctokit(token);
    
    console.log('DRY MODE?', !executeDelete, core.getInput('dry'));

    console.log('configured excluding branches:', excludeList);

    const allBranches = _.sortBy((await octokit.repos.listBranches({
      ...github.context.repo,
      per_page: 100
      
    })).data, 'name');

    const allOpenPRBranches = _.map((await octokit.pulls.list({
      ...github.context.repo,
      state: 'open',
      per_page: 100
    })).data, 'head.ref');

    if(allOpenPRBranches.length >= 100) {
      throw new Error('too many PRs open (>100), please close some.');
    }

    allOpenPRBranches.sort();

    console.log('all open PR branches:', allOpenPRBranches);

    // conditions on which a branch ref is deleted:
    const allOrphanBranches = _.chain(allBranches)
    // * branch is part of exclude list
      .reject(b => excludeList.indexOf(b.name) != -1)
    // * branch is part of open pull request
      .reject(b => _.sortedIndexOf(allOpenPRBranches, b.name) != -1);
    // * branch has not seen commit in some time (say a month)
    const oldestAcceptedTime = Date.now() - orphanTime;

    console.log('checking', allOrphanBranches.length, 'orphan branches...');

    const deletedBranches = [];
    for(const b of allOrphanBranches) {
      const commitInfo = (await octokit.repos.getCommit({ 
        ...github.context.repo,
        ref: b.name }
      )).data;

      if( new Date(commitInfo.commit.author.date).getTime() < oldestAcceptedTime) {
        console.log('[DELETE]', b.name);

        if(executeDelete) {
          await octokit.git.deleteRef({
            ...github.context.repo,
            ref: 'refs/heads/' + b.name
          });
        }

        deletedBranches.push(b.name);
      }
      else {
        console.log('[KEEP]', b.name);
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

module.exports = { run };
