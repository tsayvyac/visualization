import { dom } from '../dom';
import { getAllPlayers, getActiveStatType } from '../state';
import { plotConfig } from '../config';
import { loadStatDataset } from '../loader';

export const hidePlayerDetails = () => {
	const { playerDetailsContainer } = dom;
	if (playerDetailsContainer) {
		playerDetailsContainer.classList.add('hidden');
		playerDetailsContainer.classList.remove('flex');
	}
};

export const showPlayerDetails = async (playerId, yearSelected) => {
	const {
		playerDetailsContainer,
		detailsPlayerName,
		detailsYearSelect,
		detailsStatsContainer,
		detailsCategory,
		detailsYearSelectorContainer,
	} = dom;

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

	const allPlayers = getAllPlayers();
	const player = allPlayers.find((p) => p.id === playerId);
	if (!player) {
		return;
	}

	const activeStatType = getActiveStatType();
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

			const table = document.createElement('table');
			table.className = 'w-full text-sm text-left text-slate-500';
			const thead = document.createElement('thead');
			thead.className = 'text-xs text-slate-700 uppercase bg-slate-50';
			thead.innerHTML = `
				<tr>
					<th scope="col" class="px-6 py-3">Metric</th>
					<th scope="col" class="px-6 py-3">Value</th>
				</tr>
			`;
			table.appendChild(thead);

			const tbody = document.createElement('tbody');
			config.metrics.forEach((metric) => {
				const value = yearStats[metric.label] !== undefined ? yearStats[metric.label] : 'N/A';
				const row = document.createElement('tr');
				row.className = 'bg-white border-b';
				row.innerHTML = `
					<th scope="row" class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">${metric.label}</th>
					<td class="px-6 py-4">${value}</td>
				`;
				tbody.appendChild(row);
			});
			table.appendChild(tbody);

			detailsStatsContainer.appendChild(table);
		};

		detailsYearSelect.addEventListener('change', (e) => {
			renderStatsForYear(e.target.value);
		});

		if (years.length > 0) {
			detailsYearSelect.value = yearSelected || years[0];
			renderStatsForYear(detailsYearSelect.value);
		}
	}

	playerDetailsContainer.classList.remove('hidden');
	playerDetailsContainer.classList.add('flex');
};
