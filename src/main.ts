import * as echarts from 'echarts';
import { InsideDataZoomOption, YAXisOption } from 'echarts/types/dist/shared.js';

type EChartsOption = echarts.EChartsOption;
type LoadedData = {
  timestamp: string[];
}
type ThumbnailUrl = {
  timestamp: string;
  url: string;
}

let responsedData: LoadedData;
let chartDom: HTMLElement;
let targetThumbnailContainer: HTMLDivElement | null;
let thumbnailsContainer: HTMLElement;
let thumbnailsRow: HTMLElement;
let thumbnailsEmpty: HTMLElement;
let myChart: echarts.ECharts;
let option: EChartsOption;
let thumbnailWidth = 178;
let mouseoveringThumbnailsRow = false;
async function main() {
  initChart();
  await prepareData();
  renderChart();

  updateThumbnailContainer();
  delegateThumbnailHover();
}

function initChart() {
  chartDom = document.getElementById('app')!;
  thumbnailsContainer = document.getElementById('thumbnails-container')!;
  thumbnailsRow = document.getElementById('thumbnails-row')!;
  thumbnailsEmpty = document.getElementById('thumbnails-empty')!;

  thumbnailsRow.style.display = 'none';
  thumbnailsEmpty.style.display = 'none';

  myChart = echarts.init(chartDom);

  myChart.on('datazoom', () => {
    updateThumbnailContainer();
  });
  myChart.on('highlight', (attr: any) => {
    debounceHighlight(() => showTargetThumbnail(attr?.batch[0]));
  });

  myChart.on('downplay', () => {
    debounceHighlight(() => removeTargetThumbnail());
  });

  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

function updateThumbnailContainer() {
  const options = myChart.getOption();
  const dataZoom: InsideDataZoomOption | undefined = (options.dataZoom as InsideDataZoomOption[]).find(item => item.type == "inside");
  if (!dataZoom) {
    return;
  }
  const thumbnails = getThumbnailsFromRange(dataZoom.startValue || 0, dataZoom.endValue || Number.MAX_SAFE_INTEGER);
  renderImages(thumbnails);
}

function debounceHighlight(callback: { (): void; (): void; (): void; }) {
  if (debounceHighlight.prototype.handle) {
    clearTimeout(debounceHighlight.prototype.handle);
  }
  debounceHighlight.prototype.handle = setTimeout(() => {
    callback();
  }, 50);
}
function showTargetThumbnail(attr: { batch: { dataIndex: number; }[]; }) {
  if (mouseoveringThumbnailsRow) {
    return;
  }
  const batch = attr?.batch[0];
  if (!batch) {
    return;
  }
  const timestamp = responsedData.timestamp[batch.dataIndex];
  let x = myChart.convertToPixel({
    xAxisIndex: 0
  }, timestamp);
  x -= window.innerWidth * 0.02;
  const url = getThumbnailUrlByTimestamp(timestamp);
  if (targetThumbnailContainer) {
    const img = targetThumbnailContainer.children.item(0);
    if (img) {
      img.setAttribute('src', url);
      img.setAttribute('alt', timestamp);
      img.setAttribute('title', timestamp);
      img.setAttribute('data-timestamp', timestamp);
    }
  } else {
    targetThumbnailContainer = createDivImg(timestamp, url);
    targetThumbnailContainer.classList.add('target-thumbnail');
    thumbnailsContainer.classList.add('showing-target');
    thumbnailsContainer.appendChild(targetThumbnailContainer);
  }

  targetThumbnailContainer.style.left = `${Math.min(x, thumbnailsContainer.clientWidth - thumbnailWidth)}px`;
  console.log('showTargetThumbnail', attr);
}

function removeTargetThumbnail() {
  if (targetThumbnailContainer) {
    thumbnailsContainer.removeChild(targetThumbnailContainer);
    targetThumbnailContainer = null;
  }
  thumbnailsContainer.classList.remove('showing-target');
}

function delegateThumbnailHover() {
  thumbnailsRow.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName == 'IMG') {
      mouseoveringThumbnailsRow = true;
      const img = target as HTMLImageElement;
      const timestamp = img.getAttribute('data-timestamp');
      if (timestamp) {
        // Move cursor of the echarts to the target timestamp
        const x = myChart.convertToPixel({
          xAxisIndex: 0
        }, timestamp);
        myChart.setOption({ tooltip: { axisPointer: { type: 'line' } } });
        myChart.dispatchAction({
          type: 'showTip',
          x: x,
          y: 80,
          axisPointer: {
            type: 'line'
          },
          position: (pt: any[]) => {
            return [pt[0], '10%'];
          }
        });
        myChart.setOption({ tooltip: { axisPointer: { type: 'cross' } } });
      }
    }
  });
  thumbnailsRow.addEventListener('mouseout', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName == 'IMG') {
      mouseoveringThumbnailsRow = false;
    }
  });
}

function getThumbnailUrlByTimestamp(timestamp: string | number | Date) {
  const date = new Date(timestamp);
  return `/frames/f-${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}-${date.getSeconds().toString().padStart(2, '0')}.jpg`;
}

function getThumbnailsFromRange(startValue: string | number | Date, endValue: string | number | Date): ThumbnailUrl[] {
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  const urls = responsedData.timestamp
    .map(item => ({ timstamp: item, date: new Date(item) }))
    .filter(item => {
      return startDate <= item.date && item.date <= endDate;
    })
    .map(item => {
      const url = getThumbnailUrlByTimestamp(item.date);
      return {
        timestamp: item.timstamp,
        url: url
      };
    });
  return urls;
}

function createDivImg(timestamp: string, url: string) {
  const container = document.createElement('div');
  container.className = 'thumbnail-item';
  const image = new Image();
  image.src = url;
  image.alt = timestamp;
  image.setAttribute('data-timestamp', timestamp);
  image.title = timestamp;
  container.appendChild(image);
  return container;
}

function renderImages(urls: ThumbnailUrl[]) {
  for (var i = thumbnailsRow.children.length; i > 0; i--) {
    thumbnailsRow.removeChild(thumbnailsRow.childNodes.item(0));
  }

  if (urls.length <= 0) {
    thumbnailsRow.style.display = 'none';
    thumbnailsEmpty.style.display = 'flex';
  }
  thumbnailsRow.style.display = 'flex';
  thumbnailsEmpty.style.display = 'none';
  let filledWidth = 0;
  let filledUrls = 0;
  let totalWidth = thumbnailsContainer.clientWidth;
  let totalUrls = urls.length;
  const images = urls.map(url => {
    if ((filledUrls / totalUrls) * totalWidth < filledWidth) {
      filledUrls += 1;
      return null;
    }

    const container = createDivImg(url.timestamp, url.url);

    filledWidth += thumbnailWidth;
    filledUrls += 1;

    return container;
  }).forEach(image => {
    if (image) {
      thumbnailsRow.appendChild(image);
    }
  });
  return images;
}

async function prepareData() {
  // Load /data.json
  responsedData = await (await fetch('/data.json')).json();

  const yAxisOffsetDiff = 80;

  // Build echart option
  const speedRecords = generateRecords(responsedData.timestamp, 0, 100, 5);
  const altitudeRecords = generateRecords(responsedData.timestamp, 10, 20, 1);
  const accelerationXRecords = generateRecords(responsedData.timestamp, -2, 2, 0.1);
  const accelerationYRecords = generateRecords(responsedData.timestamp, -2, 2, 0.1);
  const temperatureRecords = generateRecords(responsedData.timestamp, 25, 35, 1);
  const humidityRecords = generateRecords(responsedData.timestamp, 30, 50, 1);

  const yAxis = generateYAxisList([
    { name: 'Speed', min: 0, max: 180, formatter: (value) => `${Math.round(value * 100) / 100} km/h` },
    { name: 'Altitude', min: 0, max: 50, formatter: (value) => `${Math.round(value * 100) / 100} m` },
    { name: 'Acc X', min: -3, max: 3, formatter: (value) => `${Math.round(value * 100) / 100} g` },
    { name: 'Acc Y', min: -3, max: 3, formatter: (value) => `${Math.round(value * 100) / 100} g` },
    { name: 'Temperature', min: 0, max: 50, formatter: (value) => `${Math.round(value * 100) / 100} ℃` },
    { name: 'Humidity', min: 0, max: 100, formatter: (value) => `${Math.round(value * 100) / 100} %` },
  ], yAxisOffsetDiff);

  option = {
    legend: {
      data: [
        'Speed',
        'Altitude',
        'Acc X',
        'Acc Y',
        'Temperature',
        'Humidity',
      ]
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      position: function (pt) {
        return [pt[0], '10%'];
      }
    },
    title: {
      top: '3%',
      left: '2%',
      text: 'Chart with Timeline Thumbnails'
    },
    grid: {
      top: '10%',
      right: `${yAxis.length * yAxisOffsetDiff}px`,
      left: '2%'
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 'none'
        },
        restore: {},
        saveAsImage: {}
      }
    },
    xAxis: {
      type: 'time',
    },
    yAxis: yAxis,
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 20
      },
      {
        start: 0,
        end: 20
      }
    ],
    series: generateSeriesList([
      { name: 'Speed', data: speedRecords },
      { name: 'Altitude', data: altitudeRecords },
      { name: 'Acc X', data: accelerationXRecords },
      { name: 'Acc Y', data: accelerationYRecords },
      { name: 'Temperature', data: temperatureRecords },
      { name: 'Humidity', data: humidityRecords },
    ])
  };

}
/**
 * Generate records where each next record is a slight modification of the previous one,
 * ensuring the difference is within a small range (`differenceRange`). The record values
 * must not exceed `max` or fall below `min`. The total number of records generated is `count`.
 *
 * @param count The total number of records to generate.
 * @param min The minimum possible value for a record.
 * @param max The maximum possible value for a record.
 * @param differenceRange The maximum allowed difference between consecutive records.
 * @returns An array of generated records adhering to the specified constraints.
 */
function generateRecords(timestamps: string[], lowerBound: number, upperBound: number, maxDelta: number = 1): [string, number][] {
  const numPoints = timestamps.length;
  if (numPoints <= 0 || lowerBound > upperBound || maxDelta < 0) {
    throw new Error("Invalid input parameters");
  }

  const data: [string, number][] = [];
  let prevValue = Math.random() * (upperBound - lowerBound) + lowerBound;

  for (let i = 0; i < numPoints; i++) {
    let newValue = prevValue + Math.random() * (maxDelta * 2) - maxDelta;

    // Ensure the value stays within the bounds
    newValue = Math.max(lowerBound, newValue);
    newValue = Math.min(upperBound, newValue);

    // New value percision should be 6 decimal places
    newValue = Math.round(newValue * 1000000) / 1000000;

    data.push([timestamps[i], newValue]);
    prevValue = newValue;
  }

  return data;
}

function generateYAxisList(axisList: { name: string, min: number, max: number, formatter: (value: number) => string }[], offsetDiff = 50): YAXisOption[] {
  const yAxisList: YAXisOption[] = axisList.map((axis, index) => {
    const option: YAXisOption = {
      type: 'value',
      name: axis.name,
      min: axis.min,
      max: axis.max,
      axisLabel: {
        formatter: axis.formatter,
        hideOverlap: true
      },
      axisPointer: {
        label: {
          precision: 3
        }
      },
      offset: index * offsetDiff,
      position: 'right',
      alignTicks: true,
      axisLine: {
        show: true,
      },
    };
    return option;
  });
  return yAxisList;
}

function generateSeriesList(sourceList: { name: string, data: [string, number][] }[]): EChartsOption['series'] {
  const seriesList: EChartsOption['series'] = sourceList.map((source, index) => {
    return {
      name: source.name,
      type: 'line',
      smooth: false,
      symbol: 'none',
      data: source.data,
      yAxisIndex: index
    };
  });
  return seriesList;
}

function renderChart() {
  option && myChart.setOption(option);
}

main();