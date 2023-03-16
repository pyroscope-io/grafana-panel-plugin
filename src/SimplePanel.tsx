import React from 'react';
import { PanelProps, PanelData } from '@grafana/data';
import { config } from '@grafana/runtime';
import { FlamegraphRenderer } from '@pyroscope/flamegraph';
import { SimpleOptions } from './types';

type Props = PanelProps<SimpleOptions>;

function extractFlamebearer(
  data: PanelData
): { kind: 'ok'; flamebearer: React.ComponentProps<typeof FlamegraphRenderer>['flamebearer'] } | { kind: 'error' } {
  try {
    const flamebearer = (data.series[data.series.length - 1].fields[0].values as any).buffer[0];

    if (!flamebearer.names || !flamebearer.levels) {
      return { kind: 'error' };
    }

    return { kind: 'ok', flamebearer };
  } catch (e) {
    return { kind: 'error' };
  }
}
export const SimplePanel: React.FC<Props> = ({ options, data }) => {
  const res = extractFlamebearer(data);
  if (res.kind === 'error') {
    return (
      <div className="flamegraph-wrapper panel">
        <div>Invalid data. Make sure to use this panel with a Pyroscope datasource</div>
      </div>
    );
  }

  return (
    <div className="flamegraph-wrapper panel">
      <FlamegraphRenderer
        flamebearer={res.flamebearer}
        onlyDisplay={options.displayOnly === 'off' ? undefined : options.displayOnly}
        showToolbar={options.showToolbar}
        colorMode={config.theme2.colors.mode}
      />
    </div>
  );
};
