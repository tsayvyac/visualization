export const appState = {
	selectedPlayers: new Map(),
	datasetCache: new Map(),
	allPlayers: [],
	activeStatType: 'batting',
	resizeTimer: null,
};

export const getActiveStatType = () => appState.activeStatType;
export const setActiveStatType = (statType) => {
	appState.activeStatType = statType;
};

export const getSelectedPlayers = () => appState.selectedPlayers;
export const getAllPlayers = () => appState.allPlayers;
export const setAllPlayers = (players) => {
	appState.allPlayers = players;
};

export const getDatasetCache = () => appState.datasetCache;

export const getResizeTimer = () => appState.resizeTimer;
export const setResizeTimer = (timer) => {
	appState.resizeTimer = timer;
};
