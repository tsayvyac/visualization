import * as d3 from 'd3';
import { dom } from '../dom';
import { getActiveStatType, getSelectedPlayers, getAllPlayers } from '../state';
import { plotConfig } from '../config';
import { loadStatDataset } from '../loader';
import { showPlayerDetails } from './details';
import { colorForPlayer } from '../utils';

const renderParallelCoordinates = (rows, dimensions, statLabel, subtitle) => {
	const { app } = dom;
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
	const height = Math.max((app.clientHeight - 130 || 560), 400);
	const margin = { top: 30, right: 20, bottom: 20, left: 40 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const svg = d3
		.select(host)
		.append('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', `0 0 ${width} ${height}`);

	const chart = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

	const yDomains = new Map();
	for (const dimension of dimensions) {
		const extent = d3.extent(rows, (row) => row[dimension]);
		const min = extent[0] ?? 0;
		const max = extent[1] ?? 1;
		const adjustedMax = min === max ? max + 1 : max;
		yDomains.set(dimension, [min, adjustedMax]);
	}

	const normalizeValue = (value, dimension) => {
		const [min, max] = yDomains.get(dimension);
		if (max === min) {
			return innerHeight;
		}
		const normalized = (value - min) / (max - min);
		return innerHeight - normalized * innerHeight;
	};

	const draggingPositions = {};
	const activeBrushes = new Map();

	const getAxisPosition = (dimension) => {
		const customPosition = draggingPositions[dimension];
		if (customPosition != null) {
			return customPosition;
		}
		const index = dimensions.indexOf(dimension);
		return (index / (dimensions.length - 1)) * innerWidth;
	};

	const linePath = (row) => {
		const points = dimensions.map((dimension) => {
			const x = getAxisPosition(dimension);
			const y = normalizeValue(row[dimension], dimension);
			return [x, y];
		});
		return 'M' + points.map((p) => p.join(',')).join('L');
	};

	const pathGroup = chart.append('g').attr('fill', 'none').attr('stroke-width', 1.5).attr('stroke-opacity', 0.4);

	const isVisible = (row) =>
		[...activeBrushes.entries()].every(([dimension, selection]) => {
			if (!selection) return true;
			const value = row[dimension];
			const yValue = normalizeValue(value, dimension);
			return yValue >= selection[0] && yValue <= selection[1];
		});

	const paths = pathGroup
		.selectAll('path')
		.data(rows)
		.join('path')
		.attr('d', linePath)
		.attr('stroke', (row) => colorForPlayer(row.playerID))
		.on('mouseover', function (event, row) {
			if (!isVisible(row)) return;
			const allPlayers = getAllPlayers();
			const player = allPlayers.find((p) => p.id === row.playerID);
			const playerName = player ? player.name : 'Unknown';

			d3.select(this).attr('stroke-width', 3).attr('stroke-opacity', 0.9);
			tooltip.style('opacity', 1).html(`Player: ${playerName}, Year: ${row.Year}`);
		})
		.on('mousemove', function (event) {
			tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 28}px`);
		})
		.on('mouseout', function (event, row) {
			if (!isVisible(row)) return;
			d3.select(this).attr('stroke-width', 1.5);
			updateBrushVisibility();
			tooltip.style('opacity', 0);
		})
		.on('click', (event, row) => {
			showPlayerDetails(row.playerID, row.Year);
		});

	const tooltip = d3
		.select('body')
		.append('div')
		.attr('class', 'absolute p-2 text-xs bg-slate-800 text-white rounded-md pointer-events-none')
		.style('opacity', 0);

	const updateBrushVisibility = () => {
		const isAnyBrushActive = [...activeBrushes.values()].some((selection) => selection);

		paths.attr('stroke-opacity', (row) => {
			const visible = isVisible(row);

			if (!isAnyBrushActive) {
				return 0.4;
			}

			return visible ? 0.55 : 0.08;
		});
	};

	const axesGroup = chart.append('g').attr('class', 'axes-group');

	let axisSelection = axesGroup
		.selectAll('.dimension')
		.data(dimensions, (dimension) => dimension)
		.join('g')
		.attr('class', 'dimension')
		.attr('transform', (dimension) => `translate(${getAxisPosition(dimension)},0)`);

	axisSelection
		.append('g')
		.attr('class', 'axis')
		.each(function applyAxis(dimension) {
			const domain = yDomains.get(dimension);
			const scale = d3.scaleLinear().domain(domain).range([innerHeight, 0]);
			const format = dimension === 'Year' ? d3.format('d') : undefined;
			d3.select(this).call(d3.axisLeft(scale).ticks(6).tickFormat(format));
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
			draggingPositions[dimension] = getAxisPosition(dimension);
		})
		.on('drag', (event, dimension) => {
			const [x] = d3.pointer(event, chart.node());
			draggingPositions[dimension] = Math.max(0, Math.min(innerWidth, x));

			const movableDimensions = dimensions
				.slice(1)
				.sort((a, b) => getAxisPosition(a) - getAxisPosition(b));

			dimensions.splice(1, dimensions.length - 1, ...movableDimensions);

			axisSelection.attr('transform', (axisDimension) => `translate(${getAxisPosition(axisDimension)},0)`);
			paths.attr('d', linePath);
		})
		.on('end', (event, dimension) => {
			delete draggingPositions[dimension];
			axisSelection
				.transition()
				.duration(140)
				.attr('transform', (axisDimension) => `translate(${getAxisPosition(axisDimension)},0)`);

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

export const renderPlotForCurrentState = async () => {
	const { app } = dom;
	if (!app) {
		return;
	}

	const activeStatType = getActiveStatType();
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

	const selectedPlayers = getSelectedPlayers();
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
