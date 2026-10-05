import { renderStart } from './views/start.js';

const main = document.querySelector('main');
main.replaceChildren(renderStart());
