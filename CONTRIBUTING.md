# Contributing

## Releasing new versions
1. Merge the PR created by `Release Please`
2. Open [https://grafana.com/orgs/pyroscope/plugin-submissions/pyroscope-panel](https://grafana.com/orgs/pyroscope/plugin-submissions/pyroscope-datasource) and submit the plugin, copying the links from this repository's releases.

## Fixing releases
After submitting to Grafana, they may find issues.

If you fix these issues and publish a release, there will be a gap in grafana.
For example:
* Version 1.0.0 is already released and published to grafana
* You release a new version 1.1.0
* Grafana plugin process finds an error
* You publish release version 1.1.1
* Grafana plugin process approves that version
* Now there's a gap (`1.0.0` -> `1.1.1`), since `1.1.0` was skipped

For that to not happen, you need to delete the previous release (1.1.0), so that it can be re-released.
To do that:
* Delete the release (via the ui)
* Delete the tag associated with that release (via the ui)
* Delete the commit Release Please uses (`git rebase -i MAIN ~2`, then pick `drop`). It requires force pushing to main, so enable that option for YOUR user only in the repo's settings.

