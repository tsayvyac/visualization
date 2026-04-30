import './style.css';
import { dom } from './dom';
import { setActiveStatType, getResizeTimer, setResizeTimer } from './state';
import { initPlayerSearch } from './ui/players';
import { renderPlotForCurrentState } from './ui/plot';
import { hidePlayerDetails } from './ui/details';
import { plotConfig } from './config';

const init = async () => {
	await initPlayerSearch();
	renderPlotForCurrentState();

	if (dom.statButtons) {
		dom.statButtons.forEach((button) => {
			button.addEventListener('click', () => {
				const statType = button.dataset.statType;

				if (statType && plotConfig[statType]) {
					setActiveStatType(statType);
					renderPlotForCurrentState();

					dom.statButtons.forEach((btn) => {
						btn.disabled = false;
						btn.classList.remove('bg-slate-200', 'text-slate-900');
						btn.classList.add('bg-white', 'text-slate-600');
					});

					button.disabled = true;
					button.classList.add('bg-slate-200', 'text-slate-900');
					button.classList.remove('bg-white', 'text-slate-600');
				}
			});
		});
	}

	window.addEventListener('resize', () => {
		let resizeTimer = getResizeTimer();
		clearTimeout(resizeTimer);

		resizeTimer = setTimeout(() => {
			renderPlotForCurrentState();
		}, 200);
		setResizeTimer(resizeTimer);
	});

	window.addEventListener('players-filter-change', () => {
		renderPlotForCurrentState();
	});

	if (dom.closeDetailsButton) {
		dom.closeDetailsButton.addEventListener('click', hidePlayerDetails);
	}
};

init();

