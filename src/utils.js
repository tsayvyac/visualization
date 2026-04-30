import { getSelectedPlayers } from './state';

export const createPlayerName = (row) => `${(row.nameFirst || '').trim()} ${(row.nameLast || '').trim()}`.trim();

export const toNumber = (value) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

export const colorForPlayer = (id) => {
    let hash = 0;
    const strId = String(id);
    
    for (let i = 0; i < strId.length; i++) {
        hash = strId.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }

    const h = Math.abs((hash * 137) % 360); 
    const s = 65 + (Math.abs(hash >> 4) % 20);
    const l = 30 + (Math.abs(hash >> 8) % 20);

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
