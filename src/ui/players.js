import { dom } from '../dom';
import { getSelectedPlayers, getAllPlayers, setAllPlayers } from '../state';
import { colorForPlayer, createPlayerName, emitPlayersFilterChange } from '../utils';
import { loadAllPlayers } from '../loader';
import { renderPlotForCurrentState } from './plot';
import { showPlayerDetails } from './details';

const renderSelectedPlayers = () => {
	const { selectedPlayersList, searchInput } = dom;
	const selectedPlayers = getSelectedPlayers();

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
	const { playerSuggestions, searchInput } = dom;
	const allPlayers = getAllPlayers();
	const selectedPlayers = getSelectedPlayers();

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
			if (selectedPlayers.size >= 10) {
				alert('You can select a maximum of 10 players.');
				if (searchInput) {
					searchInput.value = '';
				}
				renderSuggestions('');
				return;
			}

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

export const initPlayerSearch = async () => {
	const { searchInput, playerSuggestions, selectedPlayersList } = dom;

	if (!searchInput || !playerSuggestions || !selectedPlayersList) {
		return;
	}

	try {
		const rows = await loadAllPlayers();
		const players = rows
			.map((row) => ({
				id: row.playerID,
				name: createPlayerName(row),
			}))
			.filter((player) => player.id && player.name)
			.sort((a, b) => a.name.localeCompare(b.name));
		setAllPlayers(players);

		renderSelectedPlayers();
		renderSuggestions('');
	} catch {
		if (playerSuggestions) {
			playerSuggestions.classList.remove('hidden');
			playerSuggestions.innerHTML = '<p class="px-2 py-1 text-xs text-rose-600">Unable to load players list.</p>';
		}
	}

	searchInput.addEventListener('input', (event) => {
		renderSuggestions(event.target.value);
	});
};
