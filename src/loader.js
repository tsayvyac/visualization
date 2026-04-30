import * as d3 from 'd3';
import { getDatasetCache } from './state';
import { plotConfig } from './config';
import { toNumber } from './utils';

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

export const loadStatDataset = async (statType) => {
	const datasetCache = getDatasetCache();
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

export const loadAllPlayers = async () => {
	return await d3.csv(`${import.meta.env.BASE_URL}/data/People.csv`);
};
