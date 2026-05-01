import { dom } from '../dom';
import { getAllPlayers, getActiveStatType } from '../state';
import { plotConfig } from '../config';
import { loadStatDataset } from '../loader';

export const hidePlayerDetails = () => {
	const { playerDetailsAside } = dom;
	if (playerDetailsAside) {
		playerDetailsAside.innerHTML = '<p class="text-xs text-slate-500">Player details will appear here.</p>';
	}
};

export const showPlayerDetails = async (playerId, yearSelected) => {
	const { playerDetailsAside } = dom;

	if (!playerDetailsAside) {
		return;
	}

	const allPlayers = getAllPlayers();
	const player = allPlayers.find((p) => p.id === playerId);
	if (!player) {
		return;
	}

	const activeStatType = getActiveStatType();
	const config = plotConfig[activeStatType];

	const dataset = await loadStatDataset(activeStatType);
	const playerStats = dataset.filter((row) => row.playerID === playerId).sort((a, b) => a.Year - b.Year);

	playerDetailsAside.innerHTML = ''; // Clear previous details

	const detailsWrapper = document.createElement('div');
	detailsWrapper.className = 'space-y-3';

	const nameEl = document.createElement('h3');
	nameEl.className = 'text-base font-semibold text-slate-800';
	nameEl.textContent = player.name;
	detailsWrapper.appendChild(nameEl);

	const headerDiv = document.createElement('div');
	headerDiv.className = 'flex items-center justify-between';
	headerDiv.appendChild(nameEl);

	const clearButton = document.createElement('button');
	clearButton.textContent = 'Clear';
	clearButton.className =
		'rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer';
	clearButton.onclick = hidePlayerDetails;
	headerDiv.appendChild(clearButton);

	detailsWrapper.appendChild(headerDiv);

	const categoryEl = document.createElement('p');
	categoryEl.className = 'text-xs text-slate-500';
	categoryEl.textContent = `Category: ${config.label}`;
	detailsWrapper.appendChild(categoryEl);

	if (!playerStats.length) {
		const noStatsEl = document.createElement('p');
		noStatsEl.className = 'text-sm text-slate-500';
		noStatsEl.textContent = 'There is no statistics available for this player in the selected category.';
		detailsWrapper.appendChild(noStatsEl);
	} else {
		const yearSelectorContainer = document.createElement('div');
		const yearLabel = document.createElement('label');
		yearLabel.htmlFor = 'details-year-select-aside';
		yearLabel.className = 'block text-xs font-medium text-gray-700 mb-1';
		yearLabel.textContent = 'Select Year';
		yearSelectorContainer.appendChild(yearLabel);

		const yearSelect = document.createElement('select');
		yearSelect.id = 'details-year-select-aside';
		yearSelect.className =
			'block w-full pl-3 pr-10 py-1.5 text-xs border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md';
		yearSelectorContainer.appendChild(yearSelect);

		const statsContainer = document.createElement('div');
		statsContainer.className = 'mt-2';

		const years = [...new Set(playerStats.map((row) => row.Year))];
		years.forEach((year) => {
			const option = document.createElement('option');
			option.value = year;
			option.textContent = year;
			yearSelect.appendChild(option);
		});

		const renderStatsForYear = (year) => {
			const yearStats = playerStats.find((row) => row.Year === Number(year));
			statsContainer.innerHTML = '';

			if (!yearStats) {
				statsContainer.innerHTML = '<p class="text-sm text-slate-500">No data for this year.</p>';
				return;
			}

			const table = document.createElement('table');
			table.className = 'w-full text-xs text-left text-slate-500';
			const thead = document.createElement('thead');
			thead.className = 'text-[11px] text-slate-700 uppercase bg-slate-50';
			thead.innerHTML = `
				<tr>
					<th scope="col" class="px-4 py-2">Metric</th>
					<th scope="col" class="px-4 py-2">Value</th>
				</tr>
			`;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			config.metrics.forEach((metric) => {
				const value = yearStats[metric.label] !== undefined ? yearStats[metric.label] : 'N/A';
				const row = document.createElement('tr');
				row.className = 'bg-white border-b text-xs';
				row.innerHTML = `
					<th scope="row" class="px-4 py-2 font-medium text-slate-900 whitespace-nowrap">${metric.label}</th>
					<td class="px-4 py-2">${value}</td>
				`;
				tbody.appendChild(row);
			});
			table.appendChild(tbody);

			statsContainer.appendChild(table);
		};

		yearSelect.addEventListener('change', (e) => {
			renderStatsForYear(e.target.value);
		});

		if (years.length > 0) {
			yearSelect.value = yearSelected || years[0];
			renderStatsForYear(yearSelect.value);
		}

		detailsWrapper.appendChild(yearSelectorContainer);
		detailsWrapper.appendChild(statsContainer);
	}

	playerDetailsAside.appendChild(detailsWrapper);
};
