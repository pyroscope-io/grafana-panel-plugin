// @ts-nocheck
import React from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css } from 'emotion';
import { stylesFactory, useTheme } from '@grafana/ui';
import FlameGraph, { parseFlamebearerFormat } from '../node_modules/pyroscope/webapp/javascript/components/FlameGraph';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ options, data, width, height }) => {
  const theme = useTheme();
  const styles = getStyles();
  return (
    <>
      <div className={styles.app}>
        <div className={`${styles.appContainer} flamegraph-wrapper`}>
          <FlameGraph
            flamebearer={data.series[data.series.length - 1].fields[0].values.buffer[0]}
            format={parseFlamebearerFormat()}
            width={width}
            height={height}
          />
        </div>
      </div>
    </>
  );
};

const getStyles = stylesFactory(() => {
  return {
    app: css`
      height: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
    `,
    appContainer: css`
      flex: 1 0 auto;
      position: relative;
    `,
  };
});
