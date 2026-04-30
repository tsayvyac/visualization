export const plotConfig = {
	batting: {
		label: 'Batting',
		file: `${import.meta.env.BASE_URL}/data/Batting.csv`,
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
		file: `${import.meta.env.BASE_URL}/data/Pitching.csv`,
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
		file: `${import.meta.env.BASE_URL}/data/Fielding.csv`,
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
