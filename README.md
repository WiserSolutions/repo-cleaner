Repo Cleaner
====
Cleans orphan branches from GitHub repos following a few basic rules.

## Functionality

repo-cleaner will automatically delete branches for an attached github repository under these conditions:

* the branch is defined in `exclude-list`
* the branch is attached to an open PR
* the most recent commit on the branch is younger than `orphan-time`

## Usage

Add repo cleaner as a step to any jo you want to handle branch cleanup. Below is an example this with a scheduled cron.

```
name: "Clean Branches"
on:
  workflow_dispatch: {}
  schedule:
  # run once a week, late on friday
  - cron: "0 8 * * 6"

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
    - uses: WiserSolutions/repo-cleaner@main
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        exclude-list: prod,test,stage
        orphan-time: 604800000 # 1 week
        # uncomment to actually delete branches
        #dry: false
```

## Options Reference

| Name                     | Required | Description                                                      |
| ------------------------:|:--------:| ---------------------------------------------------------------- |
| `dry`                    | no       | Determines if branches should actually be deleted. only `false` will actually delete                               |
| `exclude-list`           | yes      | Comma separated list of branches to always exclude from deletion                     |
| `orphan-time`            | yes      | Amount of time before a branch is considered abandoned (i.e. the newest commit on the branch is too old)  |
