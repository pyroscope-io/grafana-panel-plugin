# Pyroscope Grafana Panel Plugin

# Usage
For more info see [pyroscope-panel plugin for Grafana | Grafana Labs](https://grafana.com/grafana/plugins/pyroscope-panel/)
or the source code [pyroscope/packages/pyroscope-panel-plugin at main · pyroscope-io/pyroscope](https://github.com/pyroscope-io/pyroscope/tree/main/packages/pyroscope-panel-plugin)


# Raison d'etre
The actual plugin development happens in the [main repo](https://github.com/pyroscope-io/pyroscope/tree/main/packages/pyroscope-panel-plugin).

This repository is a simple wrapper around the `@pyroscope/panel-plugin` library.
It simply packages it, signs it and make a github release.
It does this for a couple reasons:
* So that we control the actual plugin release (since `@pyroscope/panel-plugin` release is automated)
* So that it's cleaner for users (The main repo releases refer to the pyroscope binary itself)

# Releasing new versions
1. Update the `@pyroscope/panel-plugin` dependency
2. Open a Pull Request and merge it
3. Submit the new plugin version in Grafana Cloud (https://grafana.com/docs/grafana/latest/developers/plugins/package-a-plugin/#maintain-your-plugin)

