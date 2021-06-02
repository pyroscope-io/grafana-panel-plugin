//@ts-nocheck
import React from 'react';
import clsx from 'clsx';
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';

import { numberWithCommas, formatPercent, getPackageNameFromStackTrace, getFormatter } from '../util/format';
import { colorBasedOnPackageName, colorGreyscale } from '../util/color';

const COLLAPSE_THRESHOLD = 10;
const LABEL_THRESHOLD = 10;
const HIGHLIGHT_NODE_COLOR = '#48CE73'; // green
const GAP = 0.5;

const unitsToFlamegraphTitle = {
  objects: 'amount of objects in RAM per function',
  bytes: 'amount of RAM per function',
  samples: 'CPU time per function',
};

const getStyles = stylesFactory(() => {
  return {
    flamegraphPane: css`
      flex: 1;
      width: 100%;
    `,
    flamegraphTitle: css`
      width: 100%;
      display: block;
      text-align: center;
    `,
    errorMessage: css`
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      top: 0;
    `,
  };
});

class FlameGraphRenderer extends React.Component {
  canvasRef;
  tooltipRef;
  currentJSONController;
  constructor(props) {
    super(props);
    this.state = {
      highlightStyle: { display: 'none' },
      tooltipStyle: { display: 'none' },
      resetStyle: { visibility: 'hidden' },
      sortBy: 'self',
      sortByDirection: 'desc',
      view: 'both',
      flamebearer: null,
    };
    this.canvasRef = React.createRef();
    this.tooltipRef = React.createRef();
    this.currentJSONController = null;
    this.styles = getStyles();
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext('2d');
    this.topLevel = 0; // Todo: could be a constant
    this.selectedLevel = 0;
    this.rangeMin = 0;
    this.rangeMax = 1;
    this.query = '';
    this.panelContainer = document.querySelector('.flamegraph-wrapper')?.closest('.panel-wrapper');
    window.addEventListener('focus', this.focusHandler);

    if (this.props.shortcut) {
      this.props.shortcut.registerShortcut(this.reset, ['escape'], 'Reset', 'Reset Flamegraph View');
    }
    this.updateFlameBearerData();
    this.renderCanvas();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.data.series && this.props.data.series.length) {
      const name = this.props.data.series[this.props.data.series.length - 1].name;
      const from = this.props.data?.timeRange?.raw.from.valueOf();
      const until = this.props.data?.timeRange?.raw.to.valueOf();
      const prevName = prevProps.data.series[prevProps.data.series.length - 1].name;
      const prevFrom = prevProps.data?.timeRange?.raw.from.valueOf();
      const prevUntil = prevProps.data?.timeRange?.raw.to.valueOf();
      if (from !== prevFrom || until !== prevUntil || name !== prevName) {
        this.updateFlameBearerData();
      }

      this.resizeHandler();
      if (this.state.flamebearer && prevState.flamebearer !== this.state.flamebearer) {
        this.updateData();
      }
    }
  }

  updateFlameBearerData() {
    if (!this.props.data.series || !this.props.data.series.length) {
      this.setState({
        ...this.state,
        noData: 'No data received: please check datasource plugin settings or connection to pyroscope instance',
      });
    } else if (this.props.data.series[this.props.data.series.length - 1].fields[0].values.buffer[0].names.length <= 1) {
      this.setState({ ...this.state, noData: 'No profiling data received' });
    } else {
      const flamebearer = this.props.data.series[this.props.data.series.length - 1].fields[0].values.buffer[0];
      this.setState({ ...this.state, flamebearer, noData: null }, () => {
        this.updateData();
        this.renderCanvas();
      });
    }
  }

  paramsToObject(entries) {
    const result = {};
    for (const [key, value] of entries) {
      // each 'entry' is a [key, value] tupple
      result[key] = value;
    }
    return result;
  }

  rect(ctx, x, y, w, h, radius) {
    return ctx.rect(x, y, w, h);
  }

  roundRect(ctx, x, y, w, h, radius) {
    if (radius >= w / 2) {
      return this.rect(ctx, x, y, w, h, radius);
    }
    radius = Math.min(w / 2, radius);
    const r = x + w;
    const b = y + h;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(r - radius, y);
    ctx.quadraticCurveTo(r, y, r, y + radius);
    ctx.lineTo(r, y + h - radius);
    ctx.quadraticCurveTo(r, b, r - radius, b);
    ctx.lineTo(x + radius, b);
    ctx.quadraticCurveTo(x, b, x, b - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  updateZoom(i, j) {
    if (!Number.isNaN(i) && !Number.isNaN(j)) {
      this.selectedLevel = i;
      this.topLevel = 0;
      this.rangeMin = this.state.levels[i][j] / this.state.numTicks;
      this.rangeMax = (this.state.levels[i][j] + this.state.levels[i][j + 1]) / this.state.numTicks;
    } else {
      this.selectedLevel = 0;
      this.topLevel = 0;
      this.rangeMin = 0;
      this.rangeMax = 1;
    }
    this.updateResetStyle();
  }

  updateData = () => {
    const { names, levels, numTicks, sampleRate, units } = this.state.flamebearer;
    this.setState(
      {
        names: names,
        levels: levels,
        numTicks: numTicks,
        sampleRate: sampleRate,
        units: units,
      },
      () => {
        this.renderCanvas();
      }
    );
  };

  // binary search of a block in a stack level
  binarySearchLevel(x, level, tickToX) {
    let i = 0;
    let j = level.length - 4;
    while (i <= j) {
      const m = 4 * ((i / 4 + j / 4) >> 1);
      const x0 = tickToX(level[m]);
      const x1 = tickToX(level[m] + level[m + 1]);
      if (x0 <= x && x1 >= x) {
        return x1 - x0 > COLLAPSE_THRESHOLD ? m : -1;
      }
      if (x0 > x) {
        j = m - 4;
      } else {
        i = m + 4;
      }
    }
    return -1;
  }

  updateResetStyle = () => {
    // const emptyQuery = this.query === "";
    const topLevelSelected = this.selectedLevel === 0;
    this.setState({
      resetStyle: { visibility: topLevelSelected ? 'hidden' : 'visible' },
    });
  };

  handleSearchChange = e => {
    this.query = e.target.value;
    this.updateResetStyle();
    this.renderCanvas();
  };

  reset = () => {
    this.updateZoom(0, 0);
    this.renderCanvas();
  };

  xyToBar = (x, y) => {
    const i = Math.floor(y / this.pxPerLevel) + this.topLevel;
    if (i >= 0 && i < this.state.levels.length) {
      const j = this.binarySearchLevel(x, this.state.levels[i], this.tickToX);
      return { i, j };
    }
    return { i: 0, j: 0 };
  };

  clickHandler = e => {
    const { i, j } = this.xyToBar(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (j === -1) {
      return;
    }

    this.updateZoom(i, j);
    this.renderCanvas();
    this.mouseOutHandler();
  };

  resizeHandler = el => {
    // this is here to debounce resize events (see: https://css-tricks.com/debouncing-throttling-explained-examples/)
    //   because rendering is expensive
    clearTimeout(this.resizeFinish);
    if (this.state.flamebearer) {
      let responsiveHeight =
        (this.panelContainer.getClientRects()[0].height - 60) / this.state.flamebearer.levels.length;
      this.levelsToShow = this.state.flamebearer.levels.length;
      while (responsiveHeight < 14) {
        this.levelsToShow -= 1;
        responsiveHeight = (this.panelContainer.getClientRects()[0].height - 60) / this.levelsToShow;
      }
      this.pxPerLevel = responsiveHeight > 20 ? 20 : responsiveHeight;
      this.resizeFinish = setTimeout(this.renderCanvas, 50);
    }
  };

  focusHandler = () => {
    this.renderCanvas();
  };

  tickToX = i => {
    const pos = (i - this.state.numTicks * this.rangeMin) * this.pxPerTick;
    return pos;
  };

  updateView = newView => {
    this.setState({
      view: newView,
    });
    setTimeout(this.renderCanvas, 0);
  };

  createFormatter = () => {
    return getFormatter(this.state.numTicks, this.state.sampleRate, this.state.units);
  };

  renderCanvas = () => {
    if (!this.state.names) {
      return;
    }

    const { names, levels, numTicks, sampleRate, units } = this.state;
    this.graphWidth = this.canvas.offsetWidth;
    this.pxPerTick = this.graphWidth / numTicks / (this.rangeMax - this.rangeMin);
    this.canvas.height = this.pxPerLevel * (levels.length - this.topLevel);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '93%';
    this.canvas.width = this.props.width;
    this.canvas.height = this.props.height;
    if (devicePixelRatio > 1) {
      this.canvas.width *= 2;
      this.canvas.height *= 2;
      this.ctx.scale(2, 2);
    }

    this.ctx.textBaseline = 'middle';
    this.ctx.font =
      '400 11px system-ui, -apple-system, "Segoe UI", "Roboto", "Ubuntu", "Cantarell", "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

    const formatter = this.createFormatter();
    // i = level
    for (let i = 0; i < this.levelsToShow - this.topLevel; i++) {
      const level = levels[this.topLevel + i];
      for (let j = 0; j < level.length; j += 4) {
        // j = 0: x start of bar
        // j = 1: width of bar
        // j = 2: position in the main index

        const barIndex = level[j];
        const x = this.tickToX(barIndex);
        const y = i * this.pxPerLevel;
        let numBarTicks = level[j + 1];

        // For this particular bar, there is a match
        const queryExists = this.query.length > 0;
        const nodeIsInQuery = (this.query && names[level[j + 3]].indexOf(this.query) >= 0) || false;
        // merge very small blocks into big "collapsed" ones for performance
        const collapsed = numBarTicks * this.pxPerTick <= COLLAPSE_THRESHOLD;

        // const collapsed = false;
        if (collapsed) {
          while (
            j < level.length - 3 &&
            barIndex + numBarTicks === level[j + 3] &&
            level[j + 4] * this.pxPerTick <= COLLAPSE_THRESHOLD &&
            nodeIsInQuery === ((this.query && names[level[j + 5]].indexOf(this.query) >= 0) || false)
          ) {
            j += 4;
            numBarTicks += level[j + 1];
          }
        }
        // ticks are samples
        const sw = numBarTicks * this.pxPerTick - (collapsed ? 0 : GAP);
        const sh = this.pxPerLevel - GAP;

        // if (x < -1 || x + sw > this.graphWidth + 1 || sw < HIDE_THRESHOLD) continue;

        this.ctx.beginPath();
        this.rect(this.ctx, x, y, sw, sh, 3);

        const ratio = numBarTicks / numTicks;

        const a = this.selectedLevel > i ? 0.33 : 1;

        const { spyName } = this.state.flamebearer;

        let nodeColor;
        if (collapsed) {
          nodeColor = colorGreyscale(200, 0.66);
        } else if (queryExists && nodeIsInQuery) {
          nodeColor = HIGHLIGHT_NODE_COLOR;
        } else if (queryExists && !nodeIsInQuery) {
          nodeColor = colorGreyscale(200, 0.66);
        } else {
          nodeColor = colorBasedOnPackageName(getPackageNameFromStackTrace(spyName, names[level[j + 3]]), a);
        }

        this.ctx.fillStyle = nodeColor;
        this.ctx.fill();

        if (!collapsed && sw >= LABEL_THRESHOLD) {
          const percent = formatPercent(ratio);
          const name = `${names[level[j + 3]]} (${percent}, ${formatter.format(numBarTicks, sampleRate)})`;

          this.ctx.save();
          this.ctx.clip();
          this.ctx.fillStyle = 'black';
          this.ctx.fillText(name, Math.round(Math.max(x, 0) + 3), y + sh / 2);
          this.ctx.restore();
        }
      }
    }
  };

  mouseMoveHandler = e => {
    const { i, j } = this.xyToBar(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    if (j === -1 || e.nativeEvent.offsetX < 0 || e.nativeEvent.offsetX > this.graphWidth) {
      this.mouseOutHandler();
      return;
    }

    this.canvas.style.cursor = 'pointer';

    const level = this.state.levels[i];
    const x = Math.max(this.tickToX(level[j]), 0);
    const y = (i - this.topLevel) * this.pxPerLevel;
    const sw = Math.min(this.tickToX(level[j] + level[j + 1]) - x, this.graphWidth);

    const tooltipEl = this.tooltipRef.current;
    const numBarTicks = level[j + 1];
    const percent = formatPercent(numBarTicks / this.state.numTicks);

    // a little hacky but this is here so that we can get tooltipWidth after text is updated.
    const tooltipTitle = this.state.names[level[j + 3]];
    tooltipEl.children[0].innerText = tooltipTitle;
    const tooltipWidth = tooltipEl.clientWidth;

    const formatter = this.createFormatter();

    this.setState({
      highlightStyle: {
        display: 'block',
        left: `${this.canvas.offsetLeft + x}px`,
        top: `${this.canvas.offsetTop + y}px`,
        width: `${sw}px`,
        height: `${this.pxPerLevel}px`,
      },
      tooltipStyle: {
        maxWidth: '80%',
        position: 'absolute',
        pointerEvents: 'none',
        background: '#ffffff',
        whiteSpace: 'nowrap',
        boxShadow: '1px 2px 4px 0px rgba(0, 0, 0, 0.3)',
        borderRadius: '4px',
        padding: '3px 5px',
        color: '#333',
        fontSize: '12px',
        display: 'block',
        left: `${Math.min(
          this.canvas.offsetLeft + e.nativeEvent.offsetX + 15 + tooltipWidth,
          this.canvas.offsetLeft + this.graphWidth
        ) - tooltipWidth}px`,
        top: `${this.canvas.offsetTop + e.nativeEvent.offsetY + 12}px`,
      },
      tooltipTitle,
      tooltipSubtitle: `${percent}, ${numberWithCommas(numBarTicks)} samples, ${formatter.format(
        numBarTicks,
        this.state.sampleRate
      )}`,
    });
  };

  mouseOutHandler = () => {
    this.canvas.style.cursor = '';
    this.setState({
      highlightStyle: {
        display: 'none',
      },
      tooltipStyle: {
        display: 'none',
      },
    });
  };

  updateSortBy = newSortBy => {
    let dir = this.state.sortByDirection;
    if (this.state.sortBy === newSortBy) {
      dir = dir === 'asc' ? 'desc' : 'asc';
    } else {
      dir = 'desc';
    }
    this.setState({
      sortBy: newSortBy,
      sortByDirection: dir,
    });
  };

  render = () => {
    return (
      <>
        <div style={{ height: '100%', opacity: this.state.noData ? 0 : 1 }}>
          <>
            <div className={clsx('flamegraph-container panes-wrapper')} style={{ height: '100%' }}>
              <div key={'flamegraph-pane'} className={this.styles.flamegraphPane}>
                <div className="flamegraph-header">
                  <span className={this.styles.flamegraphTitle}>
                    Frame width represents {unitsToFlamegraphTitle[this.state.units]}
                  </span>
                </div>
                <canvas
                  ref={this.canvasRef}
                  onClick={this.clickHandler}
                  onMouseMove={this.mouseMoveHandler}
                  onMouseOut={this.mouseOutHandler}
                />
              </div>
            </div>
            <div className="flamegraph-highlight" style={this.state.highlightStyle} />
            <div style={this.state.tooltipStyle} ref={this.tooltipRef}>
              <div className="flamegraph-tooltip-name">{this.state.tooltipTitle}</div>
              <div>{this.state.tooltipSubtitle}</div>
            </div>
          </>
        </div>
        {this.state.noData && <p className={this.styles.errorMessage}>{this.state.noData}</p>}
      </>
    );
  };
}

export default FlameGraphRenderer;
