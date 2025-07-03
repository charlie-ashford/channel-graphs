let currentChannelId = '';
let currentChannelData = [];
let defaultChannelData = [];
let allChannelData = [];
let currentChannelName = '';
let isShowingAll = false;
let selectedInterval = 'all';
let selectedDataType = 'default';
let selectedColumnsType = 'all';
let selectedTimezone = 'UTC';

document
  .getElementById('channelIdInput')
  .addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      fetchChannelData();
    }
  });

document.addEventListener('DOMContentLoaded', async () => {
  initializeEventListeners();
  await loadInitialChannel();
});

function initializeEventListeners() {
  const exportBtn = document.getElementById('exportButton');
  const closeBtn = document.querySelector('.close-modal');

  exportBtn.addEventListener('click', openExportModal);
  closeBtn.addEventListener('click', closeExportModal);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeExportModal();
    }
  });

  window.addEventListener('click', function (event) {
    if (event.target === document.getElementById('exportModal')) {
      closeExportModal();
    }
  });

  document.querySelectorAll('.interval-option').forEach(button => {
    button.addEventListener('click', handleIntervalSelection);
    if (button.getAttribute('data-interval') === selectedInterval) {
      button.classList.add('active');
    }
  });

  document.querySelectorAll('.columns-option').forEach(button => {
    button.addEventListener('click', handleColumnsSelection);
    if (button.getAttribute('data-columns-type') === selectedColumnsType) {
      button.classList.add('active');
    }
  });

  document.querySelectorAll('.data-option').forEach(button => {
    button.addEventListener('click', handleDataTypeSelection);
    if (button.getAttribute('data-data-type') === selectedDataType) {
      button.classList.add('active');
    }
  });

  document.querySelectorAll('.timezone-option').forEach(button => {
    button.addEventListener('click', handleTimezoneSelection);
    if (button.getAttribute('data-timezone') === selectedTimezone) {
      button.classList.add('active');
    }
  });
}

async function loadInitialChannel() {
  const urlParams = new URLSearchParams(window.location.search);
  const channelIdFromUrl = urlParams.get('id');

  if (channelIdFromUrl) {
    document.getElementById('channelIdInput').value = channelIdFromUrl;
    await fetchChannelData(channelIdFromUrl);
  } else {
    try {
      const response = await fetch('ids.txt');
      const text = await response.text();
      const ids = text
        .trim()
        .split('\n')
        .filter(line => line.trim() !== '');
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      document.getElementById('channelIdInput').value = randomId;
      await fetchChannelData(randomId);
    } catch (error) {
      console.error('Failed to load ids.txt:', error);
      const fallbackId = 'UCX6OQ3DkcsbYNE6H8uQQuVA';
      document.getElementById('channelIdInput').value = fallbackId;
      await fetchChannelData(fallbackId);
    }
  }
}

async function fetchChannelData(channelHandle = '') {
  showLoading();

  const channelInput =
    channelHandle || document.getElementById('channelIdInput').value.trim();
  const isLikelyId =
    channelInput.startsWith('UC') && channelInput.length === 24;

  let channelIdToFetch;
  if (!isLikelyId) {
    try {
      const searchResponse = await fetch(
        `https://mixerno.space/api/youtube-channel-counter/search/${encodeURIComponent(
          channelInput
        )}`
      );
      const searchData = await searchResponse.json();

      if (searchResponse.ok && searchData.list && searchData.list.length > 0) {
        channelIdToFetch = searchData.list[0][2];
      } else {
        document.getElementById(
          'channelInfo'
        ).innerHTML = `<p class="error">Channel not found.</p>`;
        hideContent();
        hideLoading();
        return;
      }
    } catch (error) {
      console.error('Failed to fetch channel ID:', error);
      document.getElementById('channelInfo').innerHTML =
        '<p class="error">Failed to fetch channel ID.</p>';
      hideContent();
      hideLoading();
      return;
    }
  } else {
    channelIdToFetch = channelInput;
  }

  const apiUrl = `https://api.communitrics.com/${channelIdToFetch}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.ok) {
      currentChannelId = data.channelDetails.id || channelIdToFetch;
      currentChannelName = data.channelDetails.name;
      window.history.pushState({}, '', `?id=${currentChannelId}`);
      displayChannelInfo(data.channelDetails, data.channelDetails.id);
      isShowingAll = false;
      document.getElementById('allDataLabel').innerText = 'All Data';
      await fetchGraphData(currentChannelId, true);
      showContent();
    } else {
      document.getElementById('channelInfo').innerHTML = `<p class="error">${
        data.error || 'An error occurred while fetching data.'
      }</p>`;
      hideContent();
      hideLoading();
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
    document.getElementById('channelInfo').innerHTML =
      '<p class="error">Failed to fetch data.</p>';
    hideContent();
    hideLoading();
  }
}

async function fetchGraphData(channelId, defaultLoad = true) {
  showLoading();
  try {
    const defaultUrl = `https://api.communitrics.com/${channelId}?averages=true&all=false`;
    const defaultResponse = await fetch(defaultUrl);
    const defaultGraphData = await defaultResponse.json();

    if (defaultResponse.ok) {
      defaultChannelData = defaultGraphData.data;

      const allUrl = `https://api.communitrics.com/${channelId}?averages=true&realTime=true`;
      const allResponse = await fetch(allUrl);
      const allGraphData = await allResponse.json();

      if (allResponse.ok) {
        allChannelData = allGraphData.data;

        currentChannelData = defaultLoad ? defaultChannelData : allChannelData;

        drawSubscriberChart(
          currentChannelData,
          defaultGraphData.channelDetails.profilePicture
        );
        drawAverageSubsChart(
          currentChannelData,
          defaultGraphData.channelDetails.profilePicture
        );
      }
    } else {
      console.log(
        'Error fetching graph data:',
        defaultGraphData.error || 'An unspecified error occurred.'
      );
    }
  } catch (error) {
    console.error('Failed to fetch graph data:', error);
  } finally {
    hideLoading();
  }
}

function showContent() {
  document.getElementById('channelInfo').style.display = 'block';
  document.getElementById('chartArea').style.display = 'flex';
}

function hideContent() {
  document.getElementById('channelInfo').style.display = 'none';
  document.getElementById('chartArea').style.display = 'none';
}

function showLoading() {
  document.querySelectorAll('.loading-overlay').forEach(el => {
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  });
}

function hideLoading() {
  document.querySelectorAll('.loading-overlay').forEach(el => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  });
}

function displayChannelInfo(details, channelId) {
  const formattedSubscribers = parseInt(
    details.subscriberCount
  ).toLocaleString();
  const infoHtml = `
    <div class="channel-header">
      <img src="${details.profilePicture}" alt="${details.name}" class="channel-avatar">
      <div class="channel-details">
        <h2>
          <a id="channelLink" href="https://youtube.com/channel/${channelId}" class="channel-link">${details.name}</a>
        </h2>
        <div class="subscriber-count">${formattedSubscribers} subscribers</div>
        <div class="channel-id">${channelId}</div>
      </div>
    </div>
  `;
  document.getElementById('channelInfo').innerHTML = infoHtml;
  extractAndApplyChannelColors(details.profilePicture);
}

function extractAndApplyChannelColors(profilePictureUrl) {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    const colorThief = new ColorThief();
    const palette = colorThief.getPalette(img, 8);
    const mostVibrantColor = getMostVibrantColor(palette);
    const channelLinkColor = `rgb(${mostVibrantColor.join(',')})`;

    document.documentElement.style.setProperty(
      '--chart-color',
      channelLinkColor
    );
    document.documentElement.style.setProperty(
      '--channel-color',
      channelLinkColor
    );

    const channelLink = document.querySelector('.channel-link');
    channelLink.addEventListener('mouseover', function () {
      this.style.color = channelLinkColor;
    });
    channelLink.addEventListener('mouseout', function () {
      this.style.color = 'var(--text-primary)';
    });

    const avatar = document.querySelector('.channel-avatar');
    if (avatar) {
      avatar.style.borderColor = channelLinkColor;
    }

    const [r, g, b] = mostVibrantColor;
    document.getElementById(
      'channelInfo'
    ).style.background = `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.1), rgba(${r}, ${g}, ${b}, 0.05))`;

    updateButtonColors(channelLinkColor);
    updateSearchButtonColor(channelLinkColor);

    document
      .querySelectorAll(
        '.interval-option, .data-option, .columns-option, .timezone-option'
      )
      .forEach(option => {
        if (option.classList.contains('active')) {
          option.style.backgroundColor = channelLinkColor;
        }
      });

    const exportBtns = document.querySelectorAll('.export-btn');
    exportBtns.forEach(btn => {
      btn.addEventListener('mouseover', function () {
        this.style.backgroundColor = channelLinkColor;
        this.style.color = 'white';
      });
      btn.addEventListener('mouseout', function () {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.style.color = 'var(--text-primary)';
      });
    });
  };
  img.src = profilePictureUrl;
}

function drawSubscriberChart(data, profilePictureUrl) {
  const chartData = data.map(entry => ({
    x: new Date(entry.last_updated).getTime(),
    y: parseInt(entry.previous_sub_count),
  }));
  setupChart(
    'subscriberChart',
    chartData,
    profilePictureUrl,
    'Subscriber Count',
    'Subscribers'
  );
}

function drawAverageSubsChart(data, profilePictureUrl) {
  const chartData = data.map(entry => ({
    x: new Date(entry.last_updated).getTime(),
    y: parseInt(entry.average_per_day),
  }));
  setupChart(
    'averageSubsChart',
    chartData,
    profilePictureUrl,
    'Average Daily Subscribers',
    'Average Subscribers'
  );
}

function getVibrancy(rgb) {
  const max = Math.max(rgb[0], rgb[1], rgb[2]);
  const min = Math.min(rgb[0], rgb[1], rgb[2]);
  const saturation = max - min;
  const brightness = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
  return saturation * brightness;
}

function getMostVibrantColor(palette) {
  return palette.reduce((mostVibrant, color) =>
    getVibrancy(color) > getVibrancy(mostVibrant) ? color : mostVibrant
  );
}

function setupChart(containerId, data, profilePictureUrl, title, yAxisText) {
  const colorThief = new ColorThief();
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    const palette = colorThief.getPalette(img, 8);
    const mostVibrantColor = getMostVibrantColor(palette);
    const chartColor = `rgb(${mostVibrantColor.join(',')})`;

    document.documentElement.style.setProperty('--chart-color', chartColor);
    document.documentElement.style.setProperty('--channel-color', chartColor);
    Highcharts.chart(containerId, {
      chart: {
        type: 'area',
        zoomType: 'x',
        panning: true,
        panKey: 'shift',
        animation: { duration: 500 },
        backgroundColor: 'transparent',
        events: {
          dblclick: function () {
            this.zoomOut();
          },
        },
        resetZoomButton: {
          theme: {
            fill: 'var(--card-bg)',
            stroke: chartColor,
            r: 5,
            style: {
              color: chartColor,
              fontSize: '12px',
              fontWeight: 'bold',
            },
            states: {
              hover: {
                fill: 'var(--bg-color)',
                style: { color: chartColor },
              },
            },
          },
          position: {
            align: 'right',
            verticalAlign: 'top',
            x: -10,
            y: 10,
          },
          relativeTo: 'chart',
        },
      },
      title: {
        text: title,
        style: {
          color: 'var(--text-primary)',
          fontSize: '22px',
          fontWeight: '600',
        },
      },
      xAxis: {
        type: 'datetime',
        labels: {
          style: { color: 'var(--text-secondary)', fontSize: '12px' },
        },
        gridLineWidth: 1,
        gridLineColor: 'rgba(255,255,255,0.1)',
      },
      yAxis: {
        title: {
          text: yAxisText,
          style: { color: 'var(--text-secondary)', fontSize: '14px' },
        },
        labels: {
          style: { color: 'var(--text-secondary)', fontSize: '12px' },
        },
        gridLineColor: 'rgba(255,255,255,0.1)',
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor:
          document.body.getAttribute('data-theme') === 'dark'
            ? 'var(--card-bg)'
            : 'var(--bg-color)',
        borderColor: chartColor,
        borderWidth: 1,
        shadow: true,
        style: { color: 'var(--text-primary)', fontSize: '13px' },
        formatter: function () {
          const date = new Date(this.x);
          const utcDate = date.toLocaleString(undefined, {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          });
          return `<b>${
            this.series.name
          }</b><br/>${utcDate}: ${this.y.toLocaleString()}`;
        },
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, Highcharts.color(chartColor).setOpacity(0.6).get('rgba')],
              [1, Highcharts.color(chartColor).setOpacity(0.0).get('rgba')],
            ],
          },
          marker: { radius: 3, fillColor: chartColor, lineWidth: 0 },
          lineWidth: 2,
          states: { hover: { lineWidth: 2 } },
          shadow: {
            color: 'rgba(0, 0, 0, 0.15)',
            width: 5,
            offsetX: 0,
            offsetY: 2,
          },
          threshold: null,
        },
      },
      series: [
        { type: 'area', name: yAxisText, data: data, color: chartColor },
      ],
      credits: { enabled: false },
    });

    const container = document.querySelector('#' + containerId).parentElement;
    if (container) {
      container.style.setProperty('--chart-border-color', chartColor);
      container.style.borderTop = `4px solid ${chartColor}`;
    }
  };
  img.src = profilePictureUrl;
}

function updateButtonColors(chartColor) {
  const buttons = document.querySelectorAll('.action-button');
  buttons.forEach(button => {
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = chartColor;
      button.style.color = 'var(--text-primary)';
    });
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'var(--card-bg)';
      button.style.color = 'var(--text-primary)';
    });
  });

  const themeToggle = document.querySelector('.theme-toggle');
  themeToggle.style.backgroundColor = 'var(--card-bg)';
  themeToggle.addEventListener('mouseover', () => {
    themeToggle.style.backgroundColor = chartColor;
  });
  themeToggle.addEventListener('mouseout', () => {
    themeToggle.style.backgroundColor = 'var(--card-bg)';
  });
}

function updateSearchButtonColor(chartColor) {
  const searchButton = document.getElementById('searchButton');
  searchButton.style.backgroundColor = chartColor;
  searchButton.addEventListener('mouseover', () => {
    searchButton.style.backgroundColor = Highcharts.color(chartColor)
      .brighten(0.2)
      .get();
  });
  searchButton.addEventListener('mouseout', () => {
    searchButton.style.backgroundColor = chartColor;
  });
}

function toggleAllValues() {
  if (currentChannelId === '') return;
  if (isShowingAll) {
    currentChannelData = defaultChannelData;
    isShowingAll = false;
    document.getElementById('allDataLabel').innerText = 'All Data';

    drawSubscriberChart(
      currentChannelData,
      document.querySelector('.channel-avatar').src
    );
    drawAverageSubsChart(
      currentChannelData,
      document.querySelector('.channel-avatar').src
    );
  } else {
    currentChannelData = allChannelData;
    isShowingAll = true;
    document.getElementById('allDataLabel').innerText = 'Default';

    drawSubscriberChart(
      currentChannelData,
      document.querySelector('.channel-avatar').src
    );
    drawAverageSubsChart(
      currentChannelData,
      document.querySelector('.channel-avatar').src
    );
  }
  syncDataTypeWithCurrentView();
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector('.theme-toggle i');
  const newTheme =
    body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  themeToggle.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function openExportModal() {
  if (currentChannelData.length === 0) {
    alert('No data to export. Please search for a channel first.');
    return;
  }

  if (!selectedDataType || selectedDataType === 'default') {
    selectedDataType = isShowingAll ? 'all' : 'default';
  }

  const modal = document.getElementById('exportModal');
  modal.style.display = 'block';

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();

  document
    .querySelectorAll(
      '.interval-option, .data-option, .columns-option, .timezone-option'
    )
    .forEach(option => {
      let isActive = false;
      if (option.classList.contains('interval-option')) {
        isActive = option.getAttribute('data-interval') === selectedInterval;
      } else if (option.classList.contains('data-option')) {
        isActive = option.getAttribute('data-data-type') === selectedDataType;
      } else if (option.classList.contains('columns-option')) {
        isActive =
          option.getAttribute('data-columns-type') === selectedColumnsType;
      } else if (option.classList.contains('timezone-option')) {
        isActive = option.getAttribute('data-timezone') === selectedTimezone;
      }

      if (isActive) {
        option.classList.add('active');
        option.style.backgroundColor = channelColor;
      } else {
        option.classList.remove('active');
        option.style.backgroundColor = '';
      }
    });

  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('mouseover', function () {
      this.style.backgroundColor = channelColor;
      this.style.color = 'white';
    });
    btn.addEventListener('mouseout', function () {
      this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      this.style.color = 'var(--text-primary)';
    });
  });
}

function closeExportModal() {
  document.getElementById('exportModal').style.display = 'none';
}

function handleIntervalSelection() {
  document.querySelectorAll('.interval-option').forEach(btn => {
    btn.classList.remove('active');
    btn.style.removeProperty('background-color');
  });

  this.classList.add('active');
  selectedInterval = this.getAttribute('data-interval');

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();
  this.style.backgroundColor = channelColor;
}

function handleDataTypeSelection() {
  document.querySelectorAll('.data-option').forEach(btn => {
    btn.classList.remove('active');
    btn.style.removeProperty('background-color');
  });

  this.classList.add('active');
  selectedDataType = this.getAttribute('data-data-type');

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();
  this.style.backgroundColor = channelColor;
}

function handleColumnsSelection() {
  document.querySelectorAll('.columns-option').forEach(btn => {
    btn.classList.remove('active');
    btn.style.removeProperty('background-color');
  });

  this.classList.add('active');
  selectedColumnsType = this.getAttribute('data-columns-type');

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();
  this.style.backgroundColor = channelColor;
}

function handleTimezoneSelection() {
  document.querySelectorAll('.timezone-option').forEach(btn => {
    btn.classList.remove('active');
    btn.style.removeProperty('background-color');
  });

  this.classList.add('active');
  selectedTimezone = this.getAttribute('data-timezone');

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();
  this.style.backgroundColor = channelColor;
}

function formatExportDate(isoString, intervalType, timezone) {
  const date = new Date(isoString);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone === 'America/New_York' ? 'America/New_York' : 'UTC',
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;

  const yyyyMmDd = `${year}-${month}-${day}`;
  const hhMmSs = `${hour}:${minute}:${second}`;

  switch (intervalType) {
    case 'all':
    case 'interpolated':
      return `${yyyyMmDd} ${hhMmSs}`;
    case 'hourly':
      return `${yyyyMmDd} ${hour}:00:00`;
    case 'daily':
    case 'weekly':
      return yyyyMmDd;
    case 'monthly':
      return `${year}-${month}`;
    default:
      return isoString;
  }
}

function linearInterpolate(x0, y0, x1, y1, x) {
  if (x1 === x0) return y0;
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

function interpolateHourlyData(data) {
  if (data.length < 2) return data;

  const sortedData = [...data].sort(
    (a, b) => new Date(a.last_updated) - new Date(b.last_updated)
  );

  const startTime = new Date(sortedData[0].last_updated);
  const endTime = new Date(sortedData[sortedData.length - 1].last_updated);

  const start = new Date(startTime);
  start.setUTCMinutes(0, 0, 0);
  if (start <= startTime) {
    start.setUTCHours(start.getUTCHours() + 1);
  }

  const end = new Date(endTime);
  end.setUTCMinutes(0, 0, 0);

  const interpolatedData = [];
  let dataIndex = 0;

  for (
    let currentTime = new Date(start);
    currentTime <= end;
    currentTime.setUTCHours(currentTime.getUTCHours() + 1)
  ) {
    const targetTime = currentTime.getTime();

    while (
      dataIndex < sortedData.length - 1 &&
      new Date(sortedData[dataIndex + 1].last_updated).getTime() < targetTime
    ) {
      dataIndex++;
    }

    const beforePoint = sortedData[dataIndex];
    const afterPoint = sortedData[dataIndex + 1] || beforePoint;

    const beforeTime = new Date(beforePoint.last_updated).getTime();
    const afterTime = new Date(afterPoint.last_updated).getTime();

    const beforeSubs = parseInt(beforePoint.previous_sub_count);
    const afterSubs = parseInt(afterPoint.previous_sub_count);

    const beforeAvg = beforePoint.average_per_day
      ? parseInt(beforePoint.average_per_day)
      : 0;
    const afterAvg = afterPoint.average_per_day
      ? parseInt(afterPoint.average_per_day)
      : beforeAvg;

    let interpolatedSubs, interpolatedAvg;

    if (targetTime <= beforeTime) {
      interpolatedSubs = beforeSubs;
      interpolatedAvg = beforeAvg;
    } else if (targetTime >= afterTime || beforeTime === afterTime) {
      interpolatedSubs = afterSubs;
      interpolatedAvg = afterAvg;
    } else {
      interpolatedSubs = Math.round(
        linearInterpolate(
          beforeTime,
          beforeSubs,
          afterTime,
          afterSubs,
          targetTime
        )
      );
      interpolatedAvg = Math.round(
        linearInterpolate(
          beforeTime,
          beforeAvg,
          afterTime,
          afterAvg,
          targetTime
        )
      );
    }

    interpolatedData.push({
      last_updated: new Date(currentTime).toISOString(),
      previous_sub_count: interpolatedSubs.toString(),
      average_per_day: interpolatedAvg.toString(),
    });
  }

  return interpolatedData;
}

function getESTHour(utcDate) {
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: 'America/New_York',
  });

  return parseInt(estFormatter.format(utcDate));
}

function getESTOffset(date) {
  const utcDate = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  );

  return utcDate.getTime() - localDate.getTime();
}

function getPeriodKey(date, interval, timezone) {
  let targetDate;

  if (timezone === 'America/New_York') {
    const estFormatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    });

    const parts = estFormatter.formatToParts(date);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
    const day = parseInt(parts.find(p => p.type === 'day').value);
    const hour = parseInt(parts.find(p => p.type === 'hour').value);
    const minute = parseInt(parts.find(p => p.type === 'minute').value);
    const second = parseInt(parts.find(p => p.type === 'second').value);

    targetDate = new Date(year, month, day, hour, minute, second);
  } else {
    targetDate = date;
  }

  if (timezone === 'America/New_York') {
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const hour = String(targetDate.getHours()).padStart(2, '0');

    switch (interval) {
      case 'hourly':
        return `${year}-${month}-${day} ${hour}`;
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const weekStart = getWeekStartDateLocal(targetDate);
        return `${weekStart.getFullYear()}-${String(
          weekStart.getMonth() + 1
        ).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${month}`;
      default:
        return targetDate.toISOString();
    }
  } else {
    const year = targetDate.getUTCFullYear();
    const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getUTCDate()).padStart(2, '0');
    const hour = String(targetDate.getUTCHours()).padStart(2, '0');

    switch (interval) {
      case 'hourly':
        return `${year}-${month}-${day} ${hour}`;
      case 'daily':
        return `${year}-${month}-${day}`;
      case 'weekly':
        const weekStart = getWeekStartDate(targetDate);
        return `${weekStart.getUTCFullYear()}-${String(
          weekStart.getUTCMonth() + 1
        ).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`;
      case 'monthly':
        return `${year}-${month}`;
      default:
        return targetDate.toISOString();
    }
  }
}

function getWeekStartDateLocal(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function groupByPeriod(data, interval, dateField) {
  if (data.length === 0) return [];

  const sorted = [...data].sort(
    (a, b) => new Date(a[dateField]) - new Date(b[dateField])
  );

  const isEST = selectedTimezone === 'America/New_York';
  const grouped = new Map();

  sorted.forEach(entry => {
    const utcDate = new Date(entry[dateField]);
    const periodKey = getPeriodKey(utcDate, interval, selectedTimezone);

    if (interval !== 'hourly') {
      const existingEntry = grouped.get(periodKey);

      if (!existingEntry) {
        grouped.set(periodKey, entry);
      } else {
        let currentHour, existingHour;

        if (isEST) {
          currentHour = getESTHour(new Date(entry[dateField]));
          existingHour = getESTHour(new Date(existingEntry[dateField]));
        } else {
          currentHour = new Date(entry[dateField]).getUTCHours();
          existingHour = new Date(existingEntry[dateField]).getUTCHours();
        }

        const currentDistance = Math.abs(currentHour);
        const existingDistance = Math.abs(existingHour);

        if (currentDistance < existingDistance) {
          grouped.set(periodKey, entry);
        } else if (currentDistance === existingDistance) {
          if (new Date(entry[dateField]) > new Date(existingEntry[dateField])) {
            grouped.set(periodKey, entry);
          }
        }
      }
    } else {
      if (
        !grouped.has(periodKey) ||
        new Date(entry[dateField]) > new Date(grouped.get(periodKey)[dateField])
      ) {
        grouped.set(periodKey, entry);
      }
    }
  });

  const result = Array.from(grouped.values()).map(entry => {
    const date = new Date(entry[dateField]);
    let normalizedDate;

    if (isEST && interval !== 'hourly') {
      const estFormatter = new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/New_York',
      });

      const parts = estFormatter.formatToParts(date);
      const year = parseInt(parts.find(p => p.type === 'year').value);
      const month = parseInt(parts.find(p => p.type === 'month').value) - 1;
      const day = parseInt(parts.find(p => p.type === 'day').value);

      let targetYear = year,
        targetMonth = month,
        targetDay = day;

      if (interval === 'weekly') {
        const tempDate = new Date(year, month, day);
        const dayOfWeek = tempDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        tempDate.setDate(day + mondayOffset);

        targetYear = tempDate.getFullYear();
        targetMonth = tempDate.getMonth();
        targetDay = tempDate.getDate();
      } else if (interval === 'monthly') {
        targetDay = 1;
      }

      const midnightEST = new Date(targetYear, targetMonth, targetDay, 0, 0, 0);
      const utcOffset = midnightEST.getTimezoneOffset() * 60000;
      const estOffset = getESTOffset(midnightEST);
      normalizedDate = new Date(midnightEST.getTime() - utcOffset + estOffset);
    } else {
      switch (interval) {
        case 'hourly':
          normalizedDate = new Date(date);
          normalizedDate.setUTCMinutes(0, 0, 0);
          break;
        case 'daily':
          normalizedDate = new Date(
            Date.UTC(
              date.getUTCFullYear(),
              date.getUTCMonth(),
              date.getUTCDate(),
              0,
              0,
              0,
              0
            )
          );
          break;
        case 'weekly':
          normalizedDate = getWeekStartDate(date);
          break;
        case 'monthly':
          normalizedDate = new Date(
            Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
          );
          break;
        default:
          normalizedDate = date;
      }
    }

    return {
      ...entry,
      [dateField]: normalizedDate.toISOString(),
    };
  });

  return result.sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
}

function groupByHour(data, dateField) {
  return groupByPeriod(data, 'hourly', dateField);
}

function groupByDay(data, dateField) {
  return groupByPeriod(data, 'daily', dateField);
}

function groupByWeek(data, dateField) {
  return groupByPeriod(data, 'weekly', dateField);
}

function groupByMonth(data, dateField) {
  return groupByPeriod(data, 'monthly', dateField);
}

function calculateGrowthRate(data, interval) {
  if (data.length < 2) return data;

  return data.map((current, index) => {
    let growthRate = '';

    if (
      index > 0 &&
      current.previous_sub_count &&
      data[index - 1].previous_sub_count
    ) {
      const currentSubs = parseInt(current.previous_sub_count);
      const prevSubs = parseInt(data[index - 1].previous_sub_count);
      const diff = currentSubs - prevSubs;
      growthRate = diff.toString();
    }

    return {
      ...current,
      growth_rate: growthRate,
    };
  });
}

function generateCSVContent() {
  if (currentChannelData.length === 0) {
    return '';
  }

  let csvContent = '';
  let dataToUse;

  if (selectedDataType === 'all') {
    dataToUse = [...allChannelData];
  } else {
    dataToUse = [...defaultChannelData];
  }

  let processedData = [];

  switch (selectedInterval) {
    case 'all':
      if (selectedDataType === 'interpolated') {
        processedData = interpolateHourlyData(dataToUse);
      } else {
        processedData = dataToUse;
      }

      if (selectedColumnsType === 'all') {
        csvContent = 'Time,Subscribers,Average Daily Subs\n';
      } else {
        csvContent = 'Time,Subscribers\n';
      }

      processedData.forEach(row => {
        const formattedDateTime = formatExportDate(
          row.last_updated,
          selectedDataType === 'interpolated' ? 'interpolated' : 'all',
          selectedTimezone
        );

        if (selectedColumnsType === 'all') {
          const avgValue = row.average_per_day
            ? parseInt(row.average_per_day).toString()
            : '';
          csvContent += `${formattedDateTime},${
            row.previous_sub_count || ''
          },${avgValue}\n`;
        } else {
          csvContent += `${formattedDateTime},${
            row.previous_sub_count || ''
          }\n`;
        }
      });
      break;

    case 'hourly':
      if (selectedDataType === 'interpolated') {
        processedData = interpolateHourlyData(dataToUse);
        processedData = groupByHour(processedData, 'last_updated');
      } else {
        const sortedData = [...dataToUse].sort(
          (a, b) => new Date(a.last_updated) - new Date(b.last_updated)
        );

        if (sortedData.length > 0) {
          const startTime = new Date(sortedData[0].last_updated);
          const endTime = new Date(
            sortedData[sortedData.length - 1].last_updated
          );

          const start = new Date(startTime);
          start.setUTCMinutes(0, 0, 0);
          if (start <= startTime) {
            start.setUTCHours(start.getUTCHours() + 1);
          }

          const end = new Date(endTime);
          end.setUTCMinutes(0, 0, 0);

          const filledData = [];
          let dataIndex = 0;

          for (
            let currentTime = new Date(start);
            currentTime <= end;
            currentTime.setUTCHours(currentTime.getUTCHours() + 1)
          ) {
            const targetTime = currentTime.getTime();

            while (
              dataIndex < sortedData.length - 1 &&
              new Date(sortedData[dataIndex + 1].last_updated).getTime() <=
                targetTime
            ) {
              dataIndex++;
            }

            const mostRecentPoint = sortedData[dataIndex];

            filledData.push({
              last_updated: new Date(currentTime).toISOString(),
              previous_sub_count: mostRecentPoint.previous_sub_count,
              average_per_day: mostRecentPoint.average_per_day,
            });
          }

          processedData = filledData;
        }
      }

      if (selectedColumnsType === 'all') {
        if (selectedDataType === 'interpolated') {
          processedData = processedData.map((current, index) => {
            let gain24h = '';

            if (
              index >= 24 &&
              current.previous_sub_count &&
              processedData[index - 24].previous_sub_count
            ) {
              const currentSubs = parseInt(current.previous_sub_count);
              const subs24hAgo = parseInt(
                processedData[index - 24].previous_sub_count
              );
              gain24h = (currentSubs - subs24hAgo).toString();
            }

            return {
              ...current,
              gain_24h: gain24h,
            };
          });

          csvContent = 'Hour,Subscribers,24h Gain\n';
        } else {
          processedData = calculateGrowthRate(processedData, 'hourly');
          csvContent = 'Hour,Subscribers,Average Daily Subs,Hourly Change\n';
        }
      } else {
        csvContent = 'Hour,Subscribers\n';
      }

      processedData.forEach(row => {
        const dateStr = formatExportDate(
          row.last_updated,
          'hourly',
          selectedTimezone
        );

        if (selectedColumnsType === 'all') {
          if (selectedDataType === 'interpolated') {
            csvContent += `${dateStr},${row.previous_sub_count || ''},${
              row.gain_24h || ''
            }\n`;
          } else {
            const avgValue = row.average_per_day
              ? parseInt(row.average_per_day).toString()
              : '';
            csvContent += `${dateStr},${
              row.previous_sub_count || ''
            },${avgValue},${row.growth_rate || ''}\n`;
          }
        } else {
          csvContent += `${dateStr},${row.previous_sub_count || ''}\n`;
        }
      });
      break;

    case 'daily':
      if (selectedDataType === 'interpolated') {
        const interpolatedData = interpolateHourlyData(dataToUse);
        processedData = groupByDay(interpolatedData, 'last_updated');
      } else {
        const sortedData = [...dataToUse].sort(
          (a, b) => new Date(a.last_updated) - new Date(b.last_updated)
        );

        if (sortedData.length > 0) {
          const startDate = new Date(sortedData[0].last_updated);
          const endDate = new Date(
            sortedData[sortedData.length - 1].last_updated
          );

          const start = new Date(
            Date.UTC(
              startDate.getUTCFullYear(),
              startDate.getUTCMonth(),
              startDate.getUTCDate()
            )
          );
          const end = new Date(
            Date.UTC(
              endDate.getUTCFullYear(),
              endDate.getUTCMonth(),
              endDate.getUTCDate()
            )
          );

          const filledData = [];
          let dataIndex = 0;

          for (
            let currentDate = new Date(start);
            currentDate <= end;
            currentDate.setUTCDate(currentDate.getUTCDate() + 1)
          ) {
            const targetTime = currentDate.getTime();

            while (
              dataIndex < sortedData.length - 1 &&
              new Date(sortedData[dataIndex + 1].last_updated).getTime() <=
                targetTime + 24 * 60 * 60 * 1000
            ) {
              dataIndex++;
            }

            const mostRecentPoint = sortedData[dataIndex];

            filledData.push({
              last_updated: new Date(currentDate).toISOString(),
              previous_sub_count: mostRecentPoint.previous_sub_count,
              average_per_day: mostRecentPoint.average_per_day,
            });
          }

          processedData = filledData;
        }
      }

      if (selectedColumnsType === 'all') {
        processedData = calculateGrowthRate(processedData, 'daily');
        csvContent = 'Date,Subscribers,Average Daily Subs,Daily Growth\n';
      } else {
        csvContent = 'Date,Subscribers\n';
      }

      processedData.forEach(row => {
        const dateStr = formatExportDate(
          row.last_updated,
          'daily',
          selectedTimezone
        );

        if (selectedColumnsType === 'all') {
          const avgValue = row.average_per_day
            ? parseInt(row.average_per_day).toString()
            : '';
          csvContent += `${dateStr},${
            row.previous_sub_count || ''
          },${avgValue},${row.growth_rate || ''}\n`;
        } else {
          csvContent += `${dateStr},${row.previous_sub_count || ''}\n`;
        }
      });
      break;

    case 'weekly':
      if (selectedDataType === 'interpolated') {
        const interpolatedData = interpolateHourlyData(dataToUse);
        processedData = groupByWeek(interpolatedData, 'last_updated');
      } else {
        const sortedData = [...dataToUse].sort(
          (a, b) => new Date(a.last_updated) - new Date(b.last_updated)
        );

        if (sortedData.length > 0) {
          const startDate = new Date(sortedData[0].last_updated);
          const endDate = new Date(
            sortedData[sortedData.length - 1].last_updated
          );

          const start = getWeekStartDate(startDate);
          const end = getWeekStartDate(endDate);

          const filledData = [];
          let dataIndex = 0;

          for (
            let currentWeek = new Date(start);
            currentWeek <= end;
            currentWeek.setUTCDate(currentWeek.getUTCDate() + 7)
          ) {
            const weekEnd = new Date(currentWeek);
            weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

            while (
              dataIndex < sortedData.length - 1 &&
              new Date(sortedData[dataIndex + 1].last_updated).getTime() <=
                weekEnd.getTime()
            ) {
              dataIndex++;
            }

            const mostRecentPoint = sortedData[dataIndex];

            filledData.push({
              last_updated: new Date(currentWeek).toISOString(),
              previous_sub_count: mostRecentPoint.previous_sub_count,
              average_per_day: mostRecentPoint.average_per_day,
            });
          }

          processedData = filledData;
        }
      }

      if (selectedColumnsType === 'all') {
        processedData = calculateGrowthRate(processedData, 'weekly');
        csvContent =
          'Week Starting,Subscribers,Average Daily Subs,Weekly Growth\n';
      } else {
        csvContent = 'Week Starting,Subscribers\n';
      }

      processedData.forEach(row => {
        const dateStr = formatExportDate(
          row.last_updated,
          'weekly',
          selectedTimezone
        );

        if (selectedColumnsType === 'all') {
          const avgValue = row.average_per_day
            ? parseInt(row.average_per_day).toString()
            : '';
          csvContent += `${dateStr},${
            row.previous_sub_count || ''
          },${avgValue},${row.growth_rate || ''}\n`;
        } else {
          csvContent += `${dateStr},${row.previous_sub_count || ''}\n`;
        }
      });
      break;

    case 'monthly':
      if (selectedDataType === 'interpolated') {
        const interpolatedData = interpolateHourlyData(dataToUse);
        processedData = groupByMonth(interpolatedData, 'last_updated');
      } else {
        const sortedData = [...dataToUse].sort(
          (a, b) => new Date(a.last_updated) - new Date(b.last_updated)
        );

        if (sortedData.length > 0) {
          const startDate = new Date(sortedData[0].last_updated);
          const endDate = new Date(
            sortedData[sortedData.length - 1].last_updated
          );

          const start = new Date(
            Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1)
          );
          const end = new Date(
            Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1)
          );

          const filledData = [];
          let dataIndex = 0;

          for (
            let currentMonth = new Date(start);
            currentMonth <= end;
            currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1)
          ) {
            const monthEnd = new Date(currentMonth);
            monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

            while (
              dataIndex < sortedData.length - 1 &&
              new Date(sortedData[dataIndex + 1].last_updated).getTime() <=
                monthEnd.getTime()
            ) {
              dataIndex++;
            }

            const mostRecentPoint = sortedData[dataIndex];

            filledData.push({
              last_updated: new Date(currentMonth).toISOString(),
              previous_sub_count: mostRecentPoint.previous_sub_count,
              average_per_day: mostRecentPoint.average_per_day,
            });
          }

          processedData = filledData;
        }
      }

      if (selectedColumnsType === 'all') {
        processedData = calculateGrowthRate(processedData, 'monthly');
        csvContent = 'Month,Subscribers,Average Daily Subs,Monthly Growth\n';
      } else {
        csvContent = 'Month,Subscribers\n';
      }

      processedData.forEach(row => {
        const dateStr = formatExportDate(
          row.last_updated,
          'monthly',
          selectedTimezone
        );

        if (selectedColumnsType === 'all') {
          const avgValue = row.average_per_day
            ? parseInt(row.average_per_day).toString()
            : '';
          csvContent += `${dateStr},${
            row.previous_sub_count || ''
          },${avgValue},${row.growth_rate || ''}\n`;
        } else {
          csvContent += `${dateStr},${row.previous_sub_count || ''}\n`;
        }
      });
      break;
  }

  return csvContent;
}

function exportToCSV() {
  if (currentChannelData.length === 0) {
    alert('No data to export. Please search for a channel first.');
    return;
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + generateCSVContent();
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);

  const intervalSuffix = selectedInterval === 'all' ? 'all' : selectedInterval;
  const dataTypeSuffix =
    selectedDataType === 'interpolated' ? '_interpolated' : '';
  const timezoneSuffix =
    selectedTimezone === 'America/New_York' ? '_EST' : '_UTC';

  link.setAttribute(
    'download',
    `${currentChannelName}_${intervalSuffix}${dataTypeSuffix}${timezoneSuffix}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  closeExportModal();
  showToast('Data downloaded successfully!');
}

function copyToClipboard() {
  if (currentChannelData.length === 0) {
    alert('No data to copy. Please search for a channel first.');
    return;
  }

  const csvContent = generateCSVContent();

  navigator.clipboard.writeText(csvContent).then(
    function () {
      showToast('CSV data copied to clipboard!');
      closeExportModal();
    },
    function (err) {
      console.error('Could not copy text: ', err);
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('CSV data copied to clipboard!');
        closeExportModal();
      } catch (err) {
        alert('Failed to copy to clipboard. Please try again.');
      }
      document.body.removeChild(textArea);
    }
  );
}

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();
  toast.innerHTML = `<i class="fas fa-check-circle" style="color: ${channelColor}"></i> <span>${message}</span>`;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function syncDataTypeWithCurrentView() {
  const newDataType = isShowingAll ? 'all' : 'default';
  if (selectedDataType !== newDataType && selectedDataType !== 'interpolated') {
    selectedDataType = newDataType;

    const modal = document.getElementById('exportModal');
    if (modal && modal.style.display === 'block') {
      const channelColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--chart-color')
        .trim();

      document.querySelectorAll('.data-option').forEach(option => {
        if (option.getAttribute('data-data-type') === selectedDataType) {
          option.classList.add('active');
          option.style.backgroundColor = channelColor;
        } else {
          option.classList.remove('active');
          option.style.backgroundColor = '';
        }
      });
    }
  }
}
