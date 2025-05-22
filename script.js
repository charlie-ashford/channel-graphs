let currentChannelId = '';
let currentChannelData = [];
let currentChannelName = '';
let isShowingAll = false;

document
  .getElementById('channelIdInput')
  .addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      fetchChannelData();
    }
  });

document.addEventListener('DOMContentLoaded', async () => {
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
});

async function fetchChannelData(channelHandle = '') {
  const channelInput =
    channelHandle || document.getElementById('channelIdInput').value.trim();
  const isLikelyId =
    channelInput.startsWith('UC') && channelInput.length === 24;

  let channelIdToFetch;
  if (!isLikelyId) {
    try {
      const searchResponse = await fetch(
        `https://mixerno.space/api/youtube-channel-counter/search/${encodeURIComponent(channelInput)}`
      );
      const searchData = await searchResponse.json();

      if (
        searchResponse.ok &&
        searchData.list &&
        searchData.list.length > 0
      ) {
        channelIdToFetch = searchData.list[0][2];
      } else {
        document.getElementById(
          'channelInfo'
        ).innerHTML = `<p class="error">Channel not found.</p>`;
        hideContent();
        return;
      }
    } catch (error) {
      console.error('Failed to fetch channel ID:', error);
      document.getElementById('channelInfo').innerHTML =
        '<p class="error">Failed to fetch channel ID.</p>';
      hideContent();
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
      fetchGraphData(currentChannelId, true);
      showContent();
    } else {
      document.getElementById('channelInfo').innerHTML = `<p class="error">${
        data.error || 'An error occurred while fetching data.'
      }</p>`;
      hideContent();
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
    document.getElementById('channelInfo').innerHTML =
      '<p class="error">Failed to fetch data.</p>';
    hideContent();
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
  };
  img.src = details.profilePicture;
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
    updateButtonColors(chartColor);
    updateSearchButtonColor(chartColor);
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

function exportToCSV() {
  if (currentChannelData.length === 0) {
    alert('No data to export. Please search for a channel first.');
    return;
  }
  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Time,Subscribers,Average Daily Subs\n';
  currentChannelData.forEach(function (row) {
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
    let subscribers = row.previous_sub_count;
    let avgSubs = row.average_per_day;
    csvContent += `${formattedDateTime},${subscribers},${avgSubs}\n`;
  });
  var encodedUri = encodeURI(csvContent);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${currentChannelName}_subscribers.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function toggleTheme() {
  const body = document.body;
  const themeToggle = document.querySelector('.theme-toggle i');
  const newTheme =
    body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  themeToggle.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
