// @ts-nocheck

import React from "react";
import clsx from "clsx";
import { css } from 'emotion';
import { stylesFactory } from '@grafana/ui';

import {
  numberWithCommas,
  formatPercent,
  getPackageNameFromStackTrace,
  getFormatter,
} from "../util/format";
import { colorBasedOnPackageName, colorGreyscale } from "../util/color";
import { deltaDiff } from '../util/flamebearer';

const COLLAPSE_THRESHOLD = 10;
const LABEL_THRESHOLD = 10;
const HIGHLIGHT_NODE_COLOR = "#48CE73"; // green
const GAP = 0.5;

const unitsToFlamegraphTitle = {
  "objects": "amount of objects in RAM per function",
  "bytes": "amount of RAM per function",
  "samples": "CPU time per function",
}

const getStyles = stylesFactory(() => {
  return {
    flamegraphPane: css`
      flex: 1;
      margin: 0 6px;
      width: 100%;
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
      highlightStyle: { display: "none" },
      tooltipStyle: { display: "none" },
      resetStyle: { visibility: "hidden" },
      sortBy: "self",
      sortByDirection: "desc",
      view: "both",
      flamebearer: null,
    };
    this.canvasRef = React.createRef();
    this.tooltipRef = React.createRef();
    this.currentJSONController = null;
    this.styles = getStyles();
  }

  componentDidMount() {
    this.canvas = this.canvasRef.current;
    this.ctx = this.canvas.getContext("2d");
    this.topLevel = 0; // Todo: could be a constant
    this.selectedLevel = 0;
    this.rangeMin = 0;
    this.rangeMax = 1;
    this.query = "";

    const panelContainer = document.querySelector('.flamegraph-wrapper')?.closest('.panel-wrapper');
    const panelContanerResizeObserver = new ResizeObserver(this.resizeHandler);
    panelContanerResizeObserver.observe(panelContainer);
    window.addEventListener("focus", this.focusHandler);

    if (this.props.shortcut) {
      this.props.shortcut.registerShortcut(
        this.reset,
        ["escape"],
        "Reset",
        "Reset Flamegraph View"
      );
    }

    if(this.props.viewSide === 'left' || this.props.viewSide === 'right') {
      this.fetchFlameBearerData(this.props[`${this.props.viewSide}RenderURL`])
    } else {
      this.fetchFlameBearerData(this.props.renderURL)
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.getParamsFromRenderURL(this.props.renderURL).name != this.getParamsFromRenderURL(prevProps.renderURL).name ||
      prevProps.from != this.props.from ||
      prevProps.until != this.props.until ||
      prevProps.maxNodes != this.props.maxNodes ||
      prevProps.refreshToken != this.props.refreshToken ||
      prevProps[`${this.props.viewSide}From`] != this.props[`${this.props.viewSide}From`] ||
      prevProps[`${this.props.viewSide}Until`] != this.props[`${this.props.viewSide}Until`]
    ) {
      if(this.props.viewSide === 'left' || this.props.viewSide === 'right') {
        this.fetchFlameBearerData(this.props[`${this.props.viewSide}RenderURL`])
      } else {
        this.fetchFlameBearerData(this.props.renderURL)
      }
    }

    if (
      this.state.flamebearer &&
      prevState.flamebearer != this.state.flamebearer
    ) {
      this.updateData();
    }
  }

  fetchFlameBearerData(url) {
    const flamebearer = {names:["total","runtime.mstart","runtime.mstart1","runtime.sysmon","runtime.usleep","runtime.startm","runtime.notewakeup","runtime.futexwakeup","runtime.futex","runtime.notetsleep","runtime.notetsleep_internal","runtime.futexsleep","runtime.nanotime","runtime.lockWithRank","runtime.lock2","runtime.morestack","runtime.newstack","runtime.gopreempt_m","runtime.goschedImpl","runtime.schedule","runtime.resetspinning","runtime.wakep","runtime.mcall","runtime.park_m","runtime.findrunnable","runtime.write","runtime.write1","runtime.stopm","runtime.notesleep","runtime.runqsteal","runtime.runqgrab","runtime.pidleput","runtime.netpoll","runtime.epollwait","runtime.checkTimers","runtime.runtimer","runtime.runOneTimer","time.sendTime","time.Now","runtime.walltime","net/http.(*conn).serve","net/http.serverHandler.ServeHTTP","net/http.(*ServeMux).ServeHTTP","net/http.HandlerFunc.ServeHTTP","github.com/pyroscope-io/pyroscope/pkg/server.(*Controller).ingestHandler","github.com/pyroscope-io/pyroscope/pkg/server.ingestParamsFromRequest","runtime.newobject","runtime.nextFreeFast","github.com/pyroscope-io/pyroscope/pkg/server.(*Controller).Start.func1","net/http.(*fileHandler).ServeHTTP","net/http.serveFile","net/http.serveContent","io.Copy","io.copyBuffer","net/http.(*response).ReadFrom","io.CopyBuffer","net/http.(*response).Write","net/http.(*response).write","bufio.(*Writer).Write","net/http.(*chunkWriter).Write","net/http.checkConnErrorWriter.Write","net.(*conn).Write","net.(*netFD).Write","internal/poll.(*FD).Write","internal/poll.ignoringEINTR","syscall.Write","syscall.write","syscall.Syscall","net/http.(*conn).readRequest","net/http.readRequest","net/textproto.(*Reader).ReadMIMEHeader","runtime.slicebytetostring","runtime.memmove","github.com/pyroscope-io/pyroscope/pkg/agent/upstream/direct.(*Direct).uploadLoop","github.com/pyroscope-io/pyroscope/pkg/agent/upstream/direct.(*Direct).safeUpload","github.com/pyroscope-io/pyroscope/pkg/agent/upstream/direct.(*Direct).uploadProfile","github.com/pyroscope-io/pyroscope/pkg/storage.(*Storage).Put","github.com/pyroscope-io/pyroscope/pkg/storage/cache.(*Cache).Get","github.com/pyroscope-io/pyroscope/pkg/storage/dimension.FromBytes","github.com/pyroscope-io/pyroscope/pkg/storage/dimension.Deserialize","io.ReadAtLeast","github.com/dgraph-io/badger/v2/y.(*WaterMark).process","runtime.selectgo","github.com/dgraph-io/badger/v2.(*levelsController).runCompactor","github.com/dgraph-io/badger/v2.(*levelsController).pickCompactLevels","sort.Slice","sort.quickSort_func"],levels:[[0,78,0,0],[0,2,1,83,0,1,0,81,0,1,0,73,0,3,0,40,0,49,0,22,0,1,0,15,0,21,0,1],[1,1,0,84,0,1,1,82,0,1,0,74,0,1,0,68,0,2,0,41,0,49,0,23,0,1,0,16,0,21,0,2],[1,1,0,85,1,1,0,75,0,1,0,69,0,2,0,42,0,49,0,19,0,1,0,17,0,6,6,12,0,15,0,3],[1,1,1,86,1,1,0,76,0,1,0,70,0,2,0,43,0,36,1,24,0,6,6,12,0,7,0,20,0,1,0,18,6,1,0,13,0,7,0,9,0,4,0,5,0,3,3,4],[3,1,0,77,0,1,0,71,0,1,0,48,0,1,0,44,1,8,0,34,0,13,13,12,0,8,0,32,0,1,1,31,0,1,0,29,0,3,0,27,0,1,0,25,6,7,0,21,0,1,0,19,6,1,1,14,0,4,4,12,0,3,0,10,0,4,0,6],[3,1,0,78,0,1,1,72,0,1,0,49,0,1,0,45,1,8,0,35,13,8,8,33,1,1,1,30,0,3,1,28,0,1,1,26,6,7,0,5,0,1,0,20,11,3,0,11,0,4,0,7],[3,1,0,79,1,1,0,50,0,1,0,46,1,8,0,36,24,2,0,11,7,7,0,6,0,1,0,21,11,3,3,8,0,4,4,8],[3,1,1,80,1,1,0,51,0,1,1,47,1,8,0,37,24,2,2,8,7,7,0,7,0,1,0,5],[5,1,0,52,2,8,0,38,33,7,7,8,0,1,0,6],[5,1,0,53,2,6,6,12,0,2,2,39,40,1,0,7],[5,1,0,54,50,1,1,8],[5,1,0,55],[5,1,0,53],[5,1,0,56],[5,1,0,57],[5,1,0,58],[5,1,0,59],[5,1,0,58],[5,1,0,60],[5,1,0,61],[5,1,0,62],[5,1,0,63],[5,1,0,64],[5,1,0,65],[5,1,0,66],[5,1,1,67]],"numTicks":78,"maxSelf":13,"spyName":"gospy","sampleRate":100,"units":"samples"},metadata:{sampleRate:100,spyName:"gospy",units:"samples"},timeline:{startTime:1621014100,samples:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,13,16,18,19,17,0],durationDelta:10};
    deltaDiff(flamebearer.levels);
    this.setState({ ...this.state, flamebearer },
      () => {
        this.updateData();
    })
  }

  getParamsFromRenderURL(inputURL) {
    let urlParamsRegexp = /(.*render\?)(?<urlParams>(.*))/
    let paramsString = inputURL.match(urlParamsRegexp);
    let params = new URLSearchParams(paramsString.groups.urlParams);
    let paramsObj = this.paramsToObject(params);

    return paramsObj
  }

  paramsToObject(entries) {
    const result = {}
    for(const [key, value] of entries) { // each 'entry' is a [key, value] tupple
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
      this.rangeMax =
        (this.state.levels[i][j] + this.state.levels[i][j + 1]) / this.state.numTicks;
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
    this.setState({
      names: names,
      levels: levels,
      numTicks: numTicks,
      sampleRate: sampleRate,
      units: units,
    }, () => {
      this.renderCanvas();
    });
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
      resetStyle: { visibility: topLevelSelected ? "hidden" : "visible" },
    });
  };

  handleSearchChange = (e) => {
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

  clickHandler = (e) => {
    const { i, j } = this.xyToBar(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    if (j === -1) return;

    this.updateZoom(i, j);
    this.renderCanvas();
    this.mouseOutHandler();
  };

  resizeHandler = (el) => {
    // this is here to debounce resize events (see: https://css-tricks.com/debouncing-throttling-explained-examples/)
    //   because rendering is expensive
    clearTimeout(this.resizeFinish);
    this.pxPerLevel = (el[0].contentRect.height - 60) / this.state.flamebearer.levels.length;
    this.resizeFinish = setTimeout(this.renderCanvas, 50);
  };

  focusHandler = () => {
    this.renderCanvas();
  };

  tickToX = (i) => {
    const pos = (i - this.state.numTicks * this.rangeMin) * this.pxPerTick;
    return pos;
  };

  updateView = (newView) => {
    this.setState({
      view: newView,
    });
    setTimeout(this.renderCanvas, 0);
  };

  createFormatter = () => {
    return getFormatter(this.state.numTicks, this.state.sampleRate, this.state.units);
  }

  renderCanvas = () => {
    if (!this.state.names) {
      return;
    }

    const { names, levels, numTicks, sampleRate, units } = this.state;

    this.graphWidth = this.canvas.offsetWidth;
    this.pxPerTick =
      this.graphWidth / numTicks / (this.rangeMax - this.rangeMin);
    this.canvas.height = this.pxPerLevel * (levels.length - this.topLevel);
    this.canvas.style.width='100%';
    this.canvas.style.height='100%';
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    if (devicePixelRatio > 1) {
      this.canvas.width *= 2;
      this.canvas.height *= 2;
      this.ctx.scale(2, 2);
    }

    this.ctx.textBaseline = "middle";
    this.ctx.font =
      '400 11px system-ui, -apple-system, "Segoe UI", "Roboto", "Ubuntu", "Cantarell", "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

    const formatter = this.createFormatter();
    // i = level
    for (let i = 0; i < levels.length - this.topLevel; i++) {
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
        const nodeIsInQuery =
          (this.query && names[level[j + 3]].indexOf(this.query) >= 0) || false;
        // merge very small blocks into big "collapsed" ones for performance
        const collapsed = numBarTicks * this.pxPerTick <= COLLAPSE_THRESHOLD;

        // const collapsed = false;
        if (collapsed) {
          while (
            j < level.length - 3 &&
            barIndex + numBarTicks === level[j + 3] &&
            level[j + 4] * this.pxPerTick <= COLLAPSE_THRESHOLD &&
            nodeIsInQuery ===
              ((this.query && names[level[j + 5]].indexOf(this.query) >= 0) ||
                false)
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
          nodeColor = colorBasedOnPackageName(
            getPackageNameFromStackTrace(spyName, names[level[j + 3]]),
            a
          );
        }

        this.ctx.fillStyle = nodeColor;
        this.ctx.fill();

        if (!collapsed && sw >= LABEL_THRESHOLD) {
          const percent = formatPercent(ratio);
          const name = `${names[level[j + 3]]} (${percent}, ${formatter.format(numBarTicks, sampleRate)})`;

          this.ctx.save();
          this.ctx.clip();
          this.ctx.fillStyle = "black";
          this.ctx.fillText(name, Math.round(Math.max(x, 0) + 3), y + sh / 2);
          this.ctx.restore();
        }
      }
    }
  };

  mouseMoveHandler = (e) => {
    const { i, j } = this.xyToBar(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    if (
      j === -1 ||
      e.nativeEvent.offsetX < 0 ||
      e.nativeEvent.offsetX > this.graphWidth
    ) {
      this.mouseOutHandler();
      return;
    }

    this.canvas.style.cursor = "pointer";

    const level = this.state.levels[i];
    const x = Math.max(this.tickToX(level[j]), 0);
    const y = (i - this.topLevel) * this.pxPerLevel;
    const sw = Math.min(
      this.tickToX(level[j] + level[j + 1]) - x,
      this.graphWidth
    );

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
        display: "block",
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
        display: "block",
        left: `${
          Math.min(
            this.canvas.offsetLeft + e.nativeEvent.offsetX + 15 + tooltipWidth,
            this.canvas.offsetLeft + this.graphWidth
          ) - tooltipWidth
        }px`,
        top: `${this.canvas.offsetTop + e.nativeEvent.offsetY + 12}px`,
      },
      tooltipTitle,
      tooltipSubtitle: `${percent}, ${numberWithCommas(
        numBarTicks
      )} samples, ${formatter.format(numBarTicks, this.state.sampleRate)}`,
    });
  };

  mouseOutHandler = () => {
    this.canvas.style.cursor = "";
    this.setState({
      highlightStyle: {
        display: "none",
      },
      tooltipStyle: {
        display: "none",
      },
    });
  };

  updateSortBy = (newSortBy) => {
    let dir = this.state.sortByDirection;
    if (this.state.sortBy == newSortBy) {
      dir = dir == "asc" ? "desc" : "asc";
    } else {
      dir = "desc";
    }
    this.setState({
      sortBy: newSortBy,
      sortByDirection: dir,
    });
  };

  render = () => {

    let flameGraphPane = (
      <div
        key={'flamegraph-pane'}
        className={this.styles.flamegraphPane}
      >
        <div className='flamegraph-header'>
          <span></span>
          <span>Frame width represents {unitsToFlamegraphTitle[this.state.units]}</span>
        </div>
        <canvas
          height="0"
          ref={this.canvasRef}
          onClick={this.clickHandler}
          onMouseMove={this.mouseMoveHandler}
          onMouseOut={this.mouseOutHandler}
        />
      </div>
    )

    let panes = [flameGraphPane];

    let instructionsText = this.props.viewType === "double" ? `Select ${this.props.viewSide} time range` : null;
    let instructionsClassName = this.props.viewType === "double" ? `${this.props.viewSide}-instructions` : null;

    return (
      <div>

        <div>
          {/* <ProfilerHeader
            view={this.state.view}
            handleSearchChange={this.handleSearchChange}
            reset={this.reset}
            updateView={this.updateView}
            resetStyle={this.state.resetStyle}
          /> */}
          <div className={`${instructionsClassName}-wrapper`}>
            <span className={`${instructionsClassName}-text`}>{instructionsText}</span>
          </div>
          <div className={clsx("flamegraph-container panes-wrapper", { "vertical-orientation": this.props.viewType === "double" })}>
            {
              panes.map((pane) => (
                pane
              ))
            }
            {/* { tablePane }
            { flameGraphPane } */}
          </div>
          {/* <div
            className={clsx("no-data-message", {
              visible:
                this.state.flamebearer && this.state.flamebearer.numTicks === 0,
            })}
          >
            <span>
              No profiling data available for this application / time range.
            </span>
          </div> */}
        </div>
        <div className="flamegraph-highlight" style={this.state.highlightStyle} />
        <div
          style={this.state.tooltipStyle}
          ref={this.tooltipRef}
        >
          <div className="flamegraph-tooltip-name">{this.state.tooltipTitle}</div>
          <div>{this.state.tooltipSubtitle}</div>
        </div>
      </div>
    )
  }
};

export default FlameGraphRenderer;
