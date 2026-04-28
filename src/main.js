import './style.css';
import * as d3 from 'd3';

const app = document.getElementById('app');
const statButtons = document.querySelectorAll('[data-stat-button]');
const searchInput = document.getElementById('player-search');
const playerSuggestions = document.getElementById('player-suggestions');
const selectedPlayersList = document.getElementById('selected-players-list');
const playerDetailsContainer = document.getElementById('player-details');
const detailsPlayerName = document.getElementById('details-player-name');
const closeDetailsButton = document.getElementById('close-details');
const detailsYearSelect = document.getElementById('details-year-select');
const detailsStatsContainer = document.getElementById('details-stats-container');

const selectedPlayers = new Map();
const datasetCache = new Map();
let allPlayers = [];
let activeStatType = 'batting';
let resizeTimer = null;

const plotConfig = {
	batting: {
		label: 'Batting',
		file: '/data/Batting.csv',
		metrics: [
			{ key: 'G', label: 'Games' },
			{ key: 'AB', label: 'AtBats' },
			{ key: 'R', label: 'Runs' },
			{ key: 'H', label: 'Hits' },
			{ key: 'HR', label: 'HR' },
			{ key: 'RBI', label: 'RBI' },
			{ key: 'SB', label: 'SB' },
			{ key: 'BB', label: 'BB' },
		],
	},
	pitching: {
		label: 'Pitching',
		file: '/data/Pitching.csv',
		metrics: [
			{ key: 'G', label: 'Games' },
			{ key: 'GS', label: 'Starts' },
			{ key: 'W', label: 'Wins' },
			{ key: 'L', label: 'Losses' },
			{ key: 'SV', label: 'Saves' },
			{ key: 'IPouts', label: 'IPouts' },
			{ key: 'SO', label: 'SO' },
			{ key: 'ERA', label: 'ERA' },
		],
	},
	fielding: {
		label: 'Fielding',
		file: '/data/Fielding.csv',
		metrics: [
			{ key: 'G', label: 'Games' },
			{ key: 'GS', label: 'Starts' },
			{ key: 'InnOuts', label: 'InnOuts' },
			{ key: 'PO', label: 'PutOuts' },
			{ key: 'A', label: 'Assists' },
			{ key: 'E', label: 'Errors' },
			{ key: 'DP', label: 'DP' },
		],
	},
};

const createPlayerName = (row) => `${(row.nameFirst || '').trim()} ${(row.nameLast || '').trim()}`.trim();

const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const colorForPlayer = (playerId) => {
	let hash = 0;
	for (let i = 0; i < playerId.length; i += 1) {
		hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash % 360);
	return `hsl(${hue} 68% 42%)`;
};

const emitPlayersFilterChange = () => {
	const selectedPlayerEntries = [...selectedPlayers.values()];
	const enabledPlayerIds = selectedPlayerEntries
		.filter((player) => player.enabled)
		.map((player) => player.id);

	window.dispatchEvent(
		new CustomEvent('players-filter-change', {
			detail: {
				selectedPlayerIds: enabledPlayerIds,
				players: selectedPlayerEntries,
			},
		}),
	);
};

const renderSelectedPlayers = () => {
	if (!selectedPlayersList) {
		return;
	}

	const selectedPlayerEntries = [...selectedPlayers.values()];

	if (!selectedPlayerEntries.length) {
		selectedPlayersList.innerHTML = '<p class="text-xs text-slate-500">No players selected yet.</p>';
		return;
	}

	selectedPlayersList.innerHTML = '';

	selectedPlayerEntries.forEach((player) => {
		const listItem = document.createElement('div');
		const toggleButton = document.createElement('button');
		const statusLabel = document.createElement('span');
		const removeButton = document.createElement('button');

		listItem.className = 'rounded-lg border border-slate-200 bg-slate-50 px-2 py-2';

		const row = document.createElement('div');
		row.className = 'flex items-center justify-between gap-2';

		const leftSide = document.createElement('div');
		leftSide.className = 'flex items-center gap-2';

		const colorSwatch = document.createElement('div');
		colorSwatch.className = 'h-3 w-3 rounded-full flex-shrink-0';
		colorSwatch.style.backgroundColor = colorForPlayer(player.id);

		toggleButton.type = 'button';
		toggleButton.textContent = player.name;
		toggleButton.dataset.playerId = player.id;
		toggleButton.setAttribute('aria-pressed', String(player.enabled));
		toggleButton.className = `text-left text-xs font-semibold transition-colors cursor-pointer ${
			player.enabled
				? 'text-teal-700 hover:text-teal-800'
				: 'text-slate-500 hover:text-slate-700'
		}`;

		toggleButton.addEventListener('click', () => {
			const existing = selectedPlayers.get(player.id);

			if (!existing) {
				return;
			}

			existing.enabled = !existing.enabled;
			renderSelectedPlayers();
			emitPlayersFilterChange();
			renderPlotForCurrentState();
		});

		statusLabel.textContent = player.enabled ? 'On' : 'Off';
		statusLabel.className = `text-[11px] font-medium ${
			player.enabled ? 'text-teal-600' : 'text-slate-500'
		}`;

		removeButton.type = 'button';
		removeButton.textContent = 'x';
		removeButton.setAttribute('aria-label', `Remove ${player.name}`);
		removeButton.className = 'rounded-r-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100';

		removeButton.addEventListener('click', () => {
			selectedPlayers.delete(player.id);
			renderSelectedPlayers();
			emitPlayersFilterChange();
			renderSuggestions(searchInput ? searchInput.value : '');
			renderPlotForCurrentState();
		});

		const detailsButton = document.createElement('button');
		detailsButton.type = 'button';
		detailsButton.textContent = '...';
		detailsButton.className =
			'rounded-l-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100';
		detailsButton.addEventListener('click', () => {
			showPlayerDetails(player.id);
		});

		const rightControls = document.createElement('div');
		const buttonGroup = document.createElement('div');
		buttonGroup.className = 'flex items-center rounded-md bg-white';
		buttonGroup.appendChild(detailsButton);
		buttonGroup.appendChild(removeButton);
		rightControls.className = 'flex items-center gap-2';
		rightControls.appendChild(statusLabel);
		rightControls.appendChild(buttonGroup);

		leftSide.appendChild(colorSwatch);
		leftSide.appendChild(toggleButton);
		row.appendChild(leftSide);
		row.appendChild(rightControls);
		listItem.appendChild(row);
		selectedPlayersList.appendChild(listItem);
	});
};

const renderSuggestions = (query = '') => {
	if (!playerSuggestions) {
		return;
	}

	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		playerSuggestions.classList.add('hidden');
		playerSuggestions.innerHTML = '';
		return;
	}

	playerSuggestions.classList.remove('hidden');

	let visiblePlayers = allPlayers
		.filter((player) => player.name.toLowerCase().includes(normalizedQuery))
		.slice(0, 20);

	visiblePlayers = visiblePlayers.filter((player) => !selectedPlayers.has(player.id));

	if (!visiblePlayers.length) {
		playerSuggestions.innerHTML = '<p class="px-2 py-1 text-xs text-slate-500">No players found for this search.</p>';
		return;
	}

	playerSuggestions.innerHTML = '';

	visiblePlayers.forEach((player) => {
		const option = document.createElement('button');

		option.type = 'button';
		option.textContent = player.name;
		option.className = 'block w-full rounded-md px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100';

		option.addEventListener('click', () => {
			selectedPlayers.set(player.id, {
				id: player.id,
				name: player.name,
				enabled: true,
			});

			renderSelectedPlayers();
			emitPlayersFilterChange();
			renderPlotForCurrentState();

			if (searchInput) {
				searchInput.value = '';
			}

			renderSuggestions('');
		});

		playerSuggestions.appendChild(option);
	});
};

const aggregateMetricRows = (rows, config) => {
	const aggregated = new Map();

	for (const row of rows) {
		const playerId = row.playerID;
		const year = Number(row.yearID);

		if (!playerId || !Number.isFinite(year)) {
			continue;
		}

		const key = `${playerId}-${year}`;

		if (!aggregated.has(key)) {
			const baseRow = {
				playerID: playerId,
				Year: year,
			};

			for (const metric of config.metrics) {
				baseRow[metric.label] = 0;
			}

			aggregated.set(key, baseRow);
		}

		const aggregatedRow = aggregated.get(key);

		for (const metric of config.metrics) {
			aggregatedRow[metric.label] += toNumber(row[metric.key]);
		}
	}

	return [...aggregated.values()];
};

const loadStatDataset = async (statType) => {
	if (datasetCache.has(statType)) {
		return datasetCache.get(statType);
	}

	const config = plotConfig[statType];
	if (!config) {
		return [];
	}

	const rows = await d3.csv(config.file);
	const aggregatedRows = aggregateMetricRows(rows, config);

	datasetCache.set(statType, aggregatedRows);
	return aggregatedRows;
};

const renderParallelCoordinates = (rows, dimensions, statLabel, subtitle) => {
	if (!app) {
		return;
	}

	app.innerHTML = `
		<div class="mb-4">
			<h2 class="text-xl font-semibold" style="font-family: 'Space Grotesk', sans-serif;">${statLabel} Parallel Coordinates</h2>
			<p class="mt-1 text-sm text-slate-600">${subtitle}</p>
			<p class="text-xs text-slate-500">Brush vertically on axes to filter lines. Drag axis labels to reorder dimensions (Year remains first).</p>
		</div>
		<div id="pcp-host" class="w-full overflow-x-auto"></div>
	`;

	const host = document.getElementById('pcp-host');
	if (!host) {
		return;
	}

	const width = Math.max(host.clientWidth || 900, 900);
	const height = 560;
	const margin = { top: 30, right: 20, bottom: 20, left: 20 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const svg = d3
		.select(host)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', `0 0 ${width} ${height}`);

	const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

	const xScale = d3.scalePoint().domain(dimensions).range([0, innerWidth]).padding(0.25);

	const yScales = new Map();
	for (const dimension of dimensions) {
		const extent = d3.extent(rows, (row) => row[dimension]);
		const min = extent[0] ?? 0;
		const max = extent[1] ?? 1;
		const adjustedMax = min === max ? max + 1 : max;
		yScales.set(dimension, d3.scaleLinear().domain([min, adjustedMax]).nice().range([innerHeight, 0]));
	}

	const draggingPositions = {};
	const activeBrushes = new Map();
	const lineGenerator = d3.line();

	const getAxisPosition = (dimension) => {
		const customPosition = draggingPositions[dimension];
		return customPosition == null ? xScale(dimension) : customPosition;
	};

	const linePath = (row) =>
		lineGenerator(
			dimensions.map((dimension) => [
				getAxisPosition(dimension),
				yScales.get(dimension)(row[dimension]),
			]),
		);

	const pathGroup = chart.append('g').attr('fill', 'none').attr('stroke-width', 1.5).attr('stroke-opacity', 0.4);

	const paths = pathGroup
		.selectAll('path')
		.data(rows)
		.join('path')
		.attr('d', linePath)
		.attr('stroke', (row) => colorForPlayer(row.playerID));

	const updateBrushVisibility = () => {
		const isAnyBrushActive = [...activeBrushes.values()].some((selection) => selection);

		paths.attr('stroke-opacity', (row) => {
			const isVisible = [...activeBrushes.entries()].every(([dimension, selection]) => {
				if (!selection) {
					return true;
				}
				const value = row[dimension];
				const yValue = yScales.get(dimension)(value);
				return yValue >= selection[0] && yValue <= selection[1];
			});

			if (!isAnyBrushActive) {
				return 0.4;
			}

			return isVisible ? 0.55 : 0.08;
		});
	};

	const axesGroup = chart.append('g').attr('class', 'axes-group');

	let axisSelection = axesGroup
		.selectAll('.dimension')
		.data(dimensions, (dimension) => dimension)
		.join('g')
		.attr('class', 'dimension')
		.attr('transform', (dimension) => `translate(${xScale(dimension)},0)`);

	axisSelection
		.append('g')
		.attr('class', 'axis')
		.each(function applyAxis(dimension) {
			const format = dimension === 'Year' ? d3.format('d') : undefined;
			d3.select(this).call(d3.axisLeft(yScales.get(dimension)).ticks(6).tickFormat(format));
		});

	axisSelection
		.append('g')
		.attr('class', 'brush')
		.each(function addBrush(dimension) {
			const brush = d3
				.brushY()
				.extent([
					[-9, 0],
					[9, innerHeight],
				])
				.on('brush end', (event) => {
					activeBrushes.set(dimension, event.selection);
					updateBrushVisibility();
				});

			d3.select(this).call(brush);
		});

	const dragBehavior = d3
		.drag()
		.on('start', (event, dimension) => {
			draggingPositions[dimension] = xScale(dimension);			
		})
		.on('drag', (event, dimension) => {
			const [x] = d3.pointer(event, chart.node());
			draggingPositions[dimension] = Math.max(0, Math.min(innerWidth, x));

			const movableDimensions = dimensions
				.slice(1)
				.sort((a, b) => getAxisPosition(a) - getAxisPosition(b));

			dimensions.splice(1, dimensions.length - 1, ...movableDimensions);
			xScale.domain(dimensions);

			axisSelection.attr('transform', (axisDimension) => `translate(${getAxisPosition(axisDimension)},0)`);
			paths.attr('d', linePath);			
		})
		.on('end', (event, dimension) => {
			delete draggingPositions[dimension];
			axisSelection
				.transition()
				.duration(140)
				.attr('transform', (axisDimension) => `translate(${xScale(axisDimension)},0)`);

			paths.transition().duration(140).attr('d', linePath);
		});

	const axisTexts = axisSelection
		.append('text')
		.attr('y', -10)
		.attr('text-anchor', 'middle')
		.attr('fill', '#0f172a')
		.attr('font-size', 11)
		.attr('font-weight', 600)
		.attr('font-family', 'Space Grotesk, sans-serif')
		.text((dimension) => dimension)
		.attr('cursor', (dimension) => (dimension === 'Year' ? 'default' : 'ew-resize'))
		.call((selection) => selection.filter((dimension) => dimension !== 'Year').call(dragBehavior));	
};

const renderPlotForCurrentState = async () => {
	if (!app) {
		return;
	}

	const config = plotConfig[activeStatType];
	if (!config) {
		app.innerHTML = '<p class="text-sm text-rose-600">Unsupported statistic type.</p>';
		return;
	}

	let dataset = [];
	try {
		dataset = await loadStatDataset(activeStatType);
	} catch {
		app.innerHTML = '<p class="text-sm text-rose-600">Unable to load plot data.</p>';
		return;
	}

	const enabledPlayerIds = [...selectedPlayers.values()]
		.filter((player) => player.enabled)
		.map((player) => player.id);

	let visibleRows = [];
	let subtitle = '';

	if (enabledPlayerIds.length) {
		const enabledSet = new Set(enabledPlayerIds);
		visibleRows = dataset.filter((row) => enabledSet.has(row.playerID));
		subtitle = `Showing ${visibleRows.length} player-year rows for ${enabledPlayerIds.length} selected player(s).`;
	}

	const dimensions = ['Year', ...config.metrics.map((metric) => metric.label)];
	renderParallelCoordinates(visibleRows, dimensions, config.label, subtitle);
};

const initPlayerSearch = async () => {
	if (!searchInput || !playerSuggestions || !selectedPlayersList) {
		return;
	}

	try {
		const rows = await d3.csv('/data/People.csv');
		allPlayers = rows
			.map((row) => ({
				id: row.playerID,
				name: createPlayerName(row),
			}))
			.filter((player) => player.id && player.name)
			.sort((a, b) => a.name.localeCompare(b.name));

		renderSelectedPlayers();
		renderSuggestions('');
	} catch {
		playerSuggestions.classList.remove('hidden');
		playerSuggestions.innerHTML = '<p class="px-2 py-1 text-xs text-rose-600">Unable to load players list.</p>';
	}

	searchInput.addEventListener('input', (event) => {
		renderSuggestions(event.target.value);
	});
};

statButtons.forEach((button) => {
	button.addEventListener('click', () => {
		statButtons.forEach((candidate) => {
			candidate.disabled = candidate === button;
		});

		activeStatType = button.dataset.statType || 'batting';
		renderPlotForCurrentState();
	});
});

window.addEventListener('players-filter-change', () => {
	renderPlotForCurrentState();
});

window.addEventListener('resize', () => {
	window.clearTimeout(resizeTimer);
	resizeTimer = window.setTimeout(() => {
		renderPlotForCurrentState();
	}, 120);
});

initPlayerSearch();
renderPlotForCurrentState();

const detailsCategory = document.getElementById('details-category');

const detailsYearSelectorContainer = document.getElementById('details-year-selector-container');

const hidePlayerDetails = () => {
	if (playerDetailsContainer) {
		playerDetailsContainer.classList.add('hidden');
		playerDetailsContainer.classList.remove('flex');
	}
};

const showPlayerDetails = async (playerId) => {
	if (
		!playerDetailsContainer ||
		!detailsPlayerName ||
		!detailsYearSelect ||
		!detailsStatsContainer ||
		!detailsCategory ||
		!detailsYearSelectorContainer
	) {
		return;
	}

	const player = allPlayers.find((p) => p.id === playerId);
	if (!player) {
		return;
	}

	const config = plotConfig[activeStatType];
	detailsCategory.textContent = `Category: ${config.label}`;

	const dataset = await loadStatDataset(activeStatType);
	const playerStats = dataset.filter((row) => row.playerID === playerId).sort((a, b) => a.Year - b.Year);

	detailsPlayerName.textContent = player.name;

	if (!playerStats.length) {
		detailsYearSelectorContainer.classList.add('hidden');
		detailsStatsContainer.innerHTML = '<p class="text-sm text-slate-500">There is no statistics available for this player in the selected category.</p>';
	} else {
		detailsYearSelectorContainer.classList.remove('hidden');
		detailsStatsContainer.innerHTML = '';
		detailsYearSelect.innerHTML = '';

		const years = [...new Set(playerStats.map((row) => row.Year))];
		years.forEach((year) => {
			const option = document.createElement('option');
			option.value = year;
			option.textContent = year;
			detailsYearSelect.appendChild(option);
		});

		const renderStatsForYear = (year) => {
			const yearStats = playerStats.find((row) => row.Year === Number(year));
			detailsStatsContainer.innerHTML = '';

			if (!yearStats) {
				detailsStatsContainer.innerHTML = '<p class="text-sm text-slate-500">No data for this year.</p>';
				return;
			}

			const statsList = document.createElement('ul');
			statsList.className = 'space-y-2';

			config.metrics.forEach((metric) => {
				const li = document.createElement('li');
				li.className = 'flex justify-between text-sm';
				const value = yearStats[metric.label] !== undefined ? yearStats[metric.label] : 'N/A';
				li.innerHTML = `<span class="font-medium text-slate-600">${metric.label}:</span> <span class="font-semibold text-slate-800">${value}</span>`;
				statsList.appendChild(li);
			});

			detailsStatsContainer.appendChild(statsList);
		};

		detailsYearSelect.addEventListener('change', (e) => {
			renderStatsForYear(e.target.value);
		});

		if (years.length > 0) {
			detailsYearSelect.value = years[0];
			renderStatsForYear(years[0]);
		}
	}

	playerDetailsContainer.classList.remove('hidden');
	playerDetailsContainer.classList.add('flex');
};

if (closeDetailsButton) {
	closeDetailsButton.addEventListener('click', hidePlayerDetails);
}

const init = async () => {
	await initPlayerSearch();
	renderSelectedPlayers();
	renderPlotForCurrentState();

	if (statButtons) {
		statButtons.forEach((button) => {
			button.addEventListener('click', () => {
				const statType = button.dataset.statButton;

				if (statType && plotConfig[statType]) {
					activeStatType = statType;
					renderPlotForCurrentState();

					statButtons.forEach((btn) => {
						btn.classList.remove('bg-slate-200', 'text-slate-900');
						btn.classList.add('bg-white', 'text-slate-600');
					});

					button.classList.add('bg-slate-200', 'text-slate-900');
					button.classList.remove('bg-white', 'text-slate-600');
				}
			});
		});
	}

	window.addEventListener('resize', () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(() => {
			renderPlotForCurrentState();
		}, 200);
	});
};

init();
