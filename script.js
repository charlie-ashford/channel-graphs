let currentChannelId = '';
let currentChannelData = [];
let currentChannelName = '';
let isShowingAll = false;
let selectedInterval = 'all';

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
    const url = defaultLoad
      ? `https://api.communitrics.com/${channelId}?averages=true&all=false`
      : `https://api.communitrics.com/${channelId}?averages=true&realTime=true`;
    const response = await fetch(url);
    const graphData = await response.json();
    if (response.ok) {
      currentChannelData = graphData.data;
      drawSubscriberChart(
        graphData.data,
        graphData.channelDetails.profilePicture
      );
      drawAverageSubsChart(
        graphData.data,
        graphData.channelDetails.profilePicture
      );
    } else {
      console.log(
        'Error fetching graph data:',
        graphData.error || 'An unspecified error occurred.'
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

    document.querySelectorAll('.interval-option').forEach(option => {
      if (option.classList.contains('active')) {
        option.style.backgroundColor = channelLinkColor;
      }
    });

    const downloadBtn = document.querySelector('.download-btn');
    if (downloadBtn) {
      downloadBtn.style.backgroundColor = channelLinkColor;
    }

    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
      const newCopyBtn = copyBtn.cloneNode(true);
      copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

      newCopyBtn.addEventListener('mouseover', function () {
        this.style.backgroundColor = channelLinkColor;
        this.style.color = 'white';
      });
      newCopyBtn.addEventListener('mouseout', function () {
        this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        this.style.color = 'var(--text-primary)';
      });

      newCopyBtn.addEventListener('click', copyToClipboard);
    }
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
    'Subscriber Growth',
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
    fetchGraphData(currentChannelId, true);
    isShowingAll = false;
    document.getElementById('allDataLabel').innerText = 'All Data';
  } else {
    fetchGraphData(currentChannelId, false);
    isShowingAll = true;
    document.getElementById('allDataLabel').innerText = 'Default';
  }
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

  const modal = document.getElementById('exportModal');
  modal.style.display = 'block';

  const channelColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--chart-color')
    .trim();

  document.querySelector('.download-btn').style.backgroundColor = channelColor;

  document.querySelectorAll('.interval-option').forEach(option => {
    if (option.classList.contains('active')) {
      option.style.backgroundColor = channelColor;
    } else {
      option.style.backgroundColor = '';
    }
  });

  const copyBtn = document.querySelector('.copy-btn');
  const newCopyBtn = copyBtn.cloneNode(true);
  copyBtn.parentNode.replaceChild(newCopyBtn, copyBtn);

  newCopyBtn.addEventListener('mouseover', function () {
    this.style.backgroundColor = channelColor;
    this.style.color = 'white';
  });
  newCopyBtn.addEventListener('mouseout', function () {
    this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.style.color = 'var(--text-primary)';
  });

  newCopyBtn.addEventListener('click', copyToClipboard);
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

function fillMissingPeriods(data, interval, dateField) {
  if (data.length < 2) return data;

  const sorted = [...data].sort(
    (a, b) => new Date(a[dateField]) - new Date(b[dateField])
  );
  const result = [];

  const startDate = new Date(sorted[0][dateField]);
  const endDate = new Date(sorted[sorted.length - 1][dateField]);
  let currentDate = new Date(startDate);

  if (interval === 'daily') {
    currentDate.setUTCHours(0, 0, 0, 0);
  } else if (interval === 'weekly') {
    currentDate = getWeekStartDate(currentDate);
  } else if (interval === 'monthly') {
    currentDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1)
    );
  }

  let lastEntry = null;

  while (currentDate <= endDate) {
    const periodKey = getPeriodKey(currentDate, interval);
    const existingEntry = sorted.find(
      entry => getPeriodKey(new Date(entry[dateField]), interval) === periodKey
    );

    if (existingEntry) {
      result.push(existingEntry);
      lastEntry = existingEntry;
    } else if (lastEntry) {
      const newEntry = { ...lastEntry };
      newEntry[dateField] = new Date(currentDate).toISOString();
      result.push(newEntry);
    }

    if (interval === 'daily') {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    } else if (interval === 'weekly') {
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    } else if (interval === 'monthly') {
      currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
    }
  }

  return result;
}

function getPeriodKey(date, interval) {
  if (interval === 'daily') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  } else if (interval === 'weekly') {
    const weekStart = getWeekStartDate(date);
    return weekStart.toISOString().split('T')[0];
  } else if (interval === 'monthly') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}`;
  }
  return '';
}

function groupByDay(data, dateField) {
  const sorted = data
    .slice()
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
  const dayMap = new Map();

  sorted.forEach(entry => {
    const d = new Date(entry[dateField]);
    const dayKey = `${d.getUTCFullYear()}-${String(
      d.getUTCMonth() + 1
    ).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, entry);
    }
  });

  const result = Array.from(dayMap.values()).sort(
    (a, b) => new Date(a[dateField]) - new Date(b[dateField])
  );

  return fillMissingPeriods(result, 'daily', dateField);
}

function groupByWeek(data, dateField) {
  const sorted = data
    .slice()
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
  const weekMap = new Map();

  sorted.forEach(entry => {
    const d = new Date(entry[dateField]);
    const weekStart = getWeekStartDate(d);
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { ...entry, [dateField]: weekStart.toISOString() });
    }
  });

  const result = Array.from(weekMap.values()).sort(
    (a, b) => new Date(a[dateField]) - new Date(b[dateField])
  );

  return fillMissingPeriods(result, 'weekly', dateField);
}

function groupByMonth(data, dateField) {
  const sorted = data
    .slice()
    .sort((a, b) => new Date(a[dateField]) - new Date(b[dateField]));
  const monthMap = new Map();

  sorted.forEach(entry => {
    const d = new Date(entry[dateField]);
    const monthKey = `${d.getUTCFullYear()}-${String(
      d.getUTCMonth() + 1
    ).padStart(2, '0')}`;

    if (!monthMap.has(monthKey)) {
      const monthStart = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
      );
      monthMap.set(monthKey, {
        ...entry,
        [dateField]: monthStart.toISOString(),
      });
    }
  });

  const result = Array.from(monthMap.values()).sort(
    (a, b) => new Date(a[dateField]) - new Date(b[dateField])
  );

  return fillMissingPeriods(result, 'monthly', dateField);
}

function getWeekStartDate(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function calculateGrowthRate(data, interval) {
  let result = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    let growthRate = '';

    if (i > 0 && current.previous_sub_count && data[i - 1].previous_sub_count) {
      const currentSubs = parseInt(current.previous_sub_count);
      const prevSubs = parseInt(data[i - 1].previous_sub_count);
      const diff = currentSubs - prevSubs;

      let timeDiff;
      if (interval === 'daily') {
        timeDiff = 1;
      } else if (interval === 'weekly') {
        timeDiff = 7;
      } else if (interval === 'monthly') {
        const currentDate = new Date(current.last_updated);
        const prevDate = new Date(data[i - 1].last_updated);
        timeDiff =
          (currentDate.getUTCFullYear() - prevDate.getUTCFullYear()) * 12 +
          (currentDate.getUTCMonth() - prevDate.getUTCMonth());
        if (timeDiff === 0) timeDiff = 1;
      }

      growthRate = (diff / timeDiff).toFixed(2);
    }

    result.push({
      ...current,
      growth_rate: growthRate,
    });
  }

  return result;
}

function generateCSVContent() {
  if (currentChannelData.length === 0) {
    return '';
  }

  let csvContent = '';
  let filteredData = [];

  switch (selectedInterval) {
    case 'all':
      csvContent = 'Time,Subscribers,Average Daily Subs\n';
      filteredData = [...currentChannelData];
      filteredData.forEach(function (row) {
        let dateTime = new Date(row.last_updated);
        let formattedDateTime =
          dateTime.getUTCFullYear() +
          '-' +
          ('0' + (dateTime.getUTCMonth() + 1)).slice(-2) +
          '-' +
          ('0' + dateTime.getUTCDate()).slice(-2) +
          ' ' +
          ('0' + dateTime.getUTCHours()).slice(-2) +
          ':' +
          ('0' + dateTime.getUTCMinutes()).slice(-2) +
          ':' +
          ('0' + dateTime.getUTCSeconds()).slice(-2);

        csvContent += `${formattedDateTime},${row.previous_sub_count || ''},${
          row.average_per_day || ''
        }\n`;
      });
      break;

    case 'daily':
      csvContent = 'Date,Subscribers,Average Daily Subs,Growth Rate\n';
      filteredData = groupByDay(currentChannelData, 'last_updated');
      filteredData = calculateGrowthRate(filteredData, 'daily');
      filteredData.forEach(function (row) {
        const date = new Date(row.last_updated);
        const dateOnly = `${date.getUTCFullYear()}-${String(
          date.getUTCMonth() + 1
        ).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        csvContent += `${dateOnly},${row.previous_sub_count || ''},${
          row.average_per_day || ''
        },${row.growth_rate || ''}\n`;
      });
      break;

    case 'weekly':
      csvContent =
        'Week Starting,Subscribers,Average Daily Subs,Weekly Growth Rate\n';
      filteredData = groupByWeek(currentChannelData, 'last_updated');
      filteredData = calculateGrowthRate(filteredData, 'weekly');
      filteredData.forEach(function (row) {
        const weekStart = new Date(row.last_updated)
          .toISOString()
          .split('T')[0];
        csvContent += `${weekStart},${row.previous_sub_count || ''},${
          row.average_per_day || ''
        },${row.growth_rate || ''}\n`;
      });
      break;

    case 'monthly':
      csvContent = 'Month,Subscribers,Average Daily Subs,Monthly Growth Rate\n';
      filteredData = groupByMonth(currentChannelData, 'last_updated');
      filteredData = calculateGrowthRate(filteredData, 'monthly');
      filteredData.forEach(function (row) {
        const date = new Date(row.last_updated);
        const monthKey = `${date.getUTCFullYear()}-${String(
          date.getUTCMonth() + 1
        ).padStart(2, '0')}`;
        csvContent += `${monthKey},${row.previous_sub_count || ''},${
          row.average_per_day || ''
        },${row.growth_rate || ''}\n`;
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

  let csvContent = 'data:text/csv;charset=utf-8,' + generateCSVContent();
  var encodedUri = encodeURI(csvContent);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `${currentChannelName}_subscribers_${selectedInterval}.csv`
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
      alert('Failed to copy to clipboard. Please try again.');
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
