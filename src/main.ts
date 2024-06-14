import * as echarts from 'echarts';
import { YAXisOption } from 'echarts/types/dist/shared.js';

type EChartsOption = echarts.EChartsOption;
type LoadedData = {
  timestamp: string[];
}

var chartDom: HTMLElement;
var myChart: echarts.ECharts;
var option: EChartsOption;
async function main() {
  initChart();
  await prepareData();
  renderChart();
}

function initChart() {
  chartDom = document.getElementById('app')!;
  myChart = echarts.init(chartDom);

  window.addEventListener('resize', () => {
    myChart.resize();
    const chartWidth = myChart.getWidth();
    console.log(chartWidth);
    const thumbnailsContainer = document.querySelector<HTMLElement>('.thumbnails-container');
    thumbnailsContainer!.style.width = `${chartWidth - 480}px`;
  });
}

async function prepareData() {
  // Load /data.json
  const responsedData: LoadedData = await (await fetch('/data.json')).json();

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




await main();