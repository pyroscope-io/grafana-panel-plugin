// @ts-nocheck
import React from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css } from 'emotion';
import { stylesFactory, useTheme } from '@grafana/ui';
import FlameGraphRenderer from 'components/FlameGraphRenderer';

interface Props extends PanelProps<SimpleOptions> {}

export const SimplePanel: React.FC<Props> = ({ options, data }) => {
  const theme = useTheme();
  const styles = getStyles();
  return (
    <>
    <div className={styles.app}>
      <div className={`${styles.appContainer} flamegraph-wrapper`}>
        <FlameGraphRenderer
          viewType="single"
          renderURL="/render?name=pyroscope.server.alloc_objects%7B%7D"
          options={options}
          data={data}
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
    `,
  };
});
