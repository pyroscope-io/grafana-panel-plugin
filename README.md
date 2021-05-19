# Pyroscope Grafana Panel Plugin

## Getting started

1. Create `grafana-plugins` folder
2. Open grafana config:
   * MacOS: `vim /usr/local/etc/grafana/grafana.ini`
   * Linux: `vim /etc/grafana/grafana.ini`
3. Specify path to your `grafana-plugins` folder:
   ```
   # Directory where grafana will automatically scan and look for plugins
   plugins = /<path_to>/grafana-plugins
   ```
   *Don't forget to remove semicolon at the beginning*

4. Clone [pyroscope-panel-plugin]() and [pyroscope-datasource-plugin]() into `grafana-plugins` folder

5. Visit each plugin folder and build them:
   ```
   yarn install
   yarn dev
   ```
6. Restart Grafana:
   * MacOS Homebrew: `brew services restart grafana`
   * Linux: `systemctl restart grafana-server`
7. Open Grafana ang go to **Configuratin -> Plugins**
8. Check that plugins are available:
   ![plugins-list]()
9. Set up data source plugin:
   * **Configuration -> Data Sources -> Add data source**
   * click on `pyroscope-datasource`
   * Specify Pyroscope host in `Endpoint` field:
      ![endpoint]()
10. Set up panel plugin:
    * Add an empty panel on your dashboard
    * Select `pyroscop-panel` from Visualization list
    * Under panel view in Query tab select `pyroscope-datasource`
    * In `Application name` input specify app name
    * Click `Apply`
   ![settings]()

Congratulations! Now you can monitor application flamegraph on your Grafana dashboard!
![]()
