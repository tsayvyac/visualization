import { getSelectedPlayers } from './state';

export const createPlayerName = (row) => `${(row.nameFirst || '').trim()} ${(row.nameLast || '').trim()}`.trim();

export const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export const colorForPlayer = (id) => {
    const strId = String(id);
    let hash = 0;
    for (let i = 0; i < strId.length; i++) {
        hash = (hash << 5) - hash + strId.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % 10;
    const hues = [200, 30, 320, 150, 20, 270, 60, 350, 110, 190];
    
    const h = hues[index];
    const s = index % 2 === 0 ? 80 : 65;
    const l = index % 2 === 0 ? 45 : 35;

    return `hsl(${h} ${s}% ${l}%)`;
};

export const emitPlayersFilterChange = () => {
	const selectedPlayers = getSelectedPlayers();
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
