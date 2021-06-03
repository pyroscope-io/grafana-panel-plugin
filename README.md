# Pyroscope Grafana Panel Plugin

## Getting started

1. Get the zip file from the Github [releases page](https://github.com/pyroscope-io/grafana-panel-plugin/tags) on panel plugin repo.
2. Get the zip file from the Github [releases page](https://github.com/pyroscope-io/grafana-datasource-plugin/tags) on datasource plugin repo.
3. Extract zip files into the plugins directory for Grafana.
4. Restart Grafana
5. Open Grafana ang go to **Configuratin -> Plugins**
6. Check that plugins are available:
   ![plugins-list](https://raw.githubusercontent.com/pyroscope-io/grafana-panel-plugin/main/docs/assets/pluginslist.jpg)
7. Set up data source plugin:
   * **Configuration -> Data Sources -> Add data source**
   * click on `pyroscope-datasource`
   * Specify Pyroscope host in `Endpoint` field:
      ![endpoint](https://raw.githubusercontent.com/pyroscope-io/grafana-panel-plugin/main/docs/assets/endpoint.jpg)
8. Set up panel plugin:
    * Add an empty panel on your dashboard
    * Select `pyroscop-panel` from Visualization list
    * Under panel view in Query tab select `pyroscope-datasource`
    * In `Application name` input specify app name
    * Click `Apply`
   ![settings](https://raw.githubusercontent.com/pyroscope-io/grafana-panel-plugin/main/docs/assets/settings.jpg)

Congratulations! Now you can monitor application flamegraph on your Grafana dashboard!
![dashboard](https://raw.githubusercontent.com/pyroscope-io/grafana-panel-plugin/main/docs/assets/dashboard.jpg)
