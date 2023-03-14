import React from 'react';
import { PanelProps } from '@grafana/data';
import { config } from '@grafana/runtime';
import { FlamegraphRenderer } from '@pyroscope/flamegraph';
import { SimpleOptions } from './types';

type Props = PanelProps<SimpleOptions>;

export const SimplePanel: React.FC<Props> = ({ options, data }) => {
  // TODO
  // this can fail in so many ways
  // let's handle it better
  const flamebearer = (data.series[data.series.length - 1].fields[0].values as any).buffer[0];

  return (
    <div className="flamegraph-wrapper panel">
      <FlamegraphRenderer
        flamebearer={flamebearer}
        onlyDisplay={options.displayOnly === 'off' ? undefined : options.displayOnly}
        showToolbar={options.showToolbar}
        colorMode={config.theme2.colors.mode}
      />
    </div>
  );
};
