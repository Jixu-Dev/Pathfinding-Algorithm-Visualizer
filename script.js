const gridEl = document.getElementById('grid');
let rows, cols, cellSize;
let grid = [];
let isMouseDown = false;
let isRunning = false;
let draggingNode = null;
let startPos = { r: 10, c: 10 };
let endPos = { r: 10, c: 35 };

function init() {
    calculateGridSize();
    createGrid();
    addEventListeners();
    window.addEventListener('resize', debounce(handleResize, 250));
}

function calculateGridSize() {
    const container = document.querySelector('.grid-container');
    const width = container.clientWidth - 40; 
    const height = container.clientHeight - 40;
    cellSize = window.innerWidth < 600 ? 20 : 25;
    cols = Math.floor(width / cellSize);
    rows = Math.floor(height / cellSize);
}

function handleResize() {
    if (isRunning) return;
    const oldStart = {...startPos};
    const oldEnd = {...endPos};
    gridEl.innerHTML = '';
    calculateGridSize();
    startPos.r = Math.min(oldStart.r, rows-1);
    startPos.c = Math.min(oldStart.c, cols-1);
    endPos.r = Math.min(oldEnd.r, rows-1);
    endPos.c = Math.min(oldEnd.c, cols-1);
    createGrid();
}

function createGrid() {
    gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (r === startPos.r && c === startPos.c) cell.classList.add('start');
            else if (r === endPos.r && c === endPos.c) cell.classList.add('end');
            gridEl.appendChild(cell);
            row.push({ element: cell, isWall: false, distance: Infinity, previous: null });
        }
        grid.push(row);
    }
}

function addEventListeners() {
    gridEl.addEventListener('mousedown', e => handleInteractionStart(e.target));
    gridEl.addEventListener('mouseover', e => handleInteractionMove(e.target));
    document.addEventListener('mouseup', () => { isMouseDown = false; draggingNode = null; });
    
    gridEl.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        handleInteractionStart(document.elementFromPoint(touch.clientX, touch.clientY));
        e.preventDefault();
    }, {passive: false});

    gridEl.addEventListener('touchmove', e => {
        const touch = e.touches[0];
        handleInteractionMove(document.elementFromPoint(touch.clientX, touch.clientY));
        e.preventDefault();
    }, {passive: false});
}

function handleInteractionStart(target) {
    if (isRunning || !target || !target.classList.contains('cell')) return;
    const r = parseInt(target.dataset.r);
    const c = parseInt(target.dataset.c);
    if (r === startPos.r && c === startPos.c) draggingNode = 'start';
    else if (r === endPos.r && c === endPos.c) draggingNode = 'end';
    else { isMouseDown = true; toggleWall(r, c); }
}

function handleInteractionMove(target) {
    if (isRunning || !target || !target.classList.contains('cell')) return;
    const r = parseInt(target.dataset.r);
    const c = parseInt(target.dataset.c);
    if (draggingNode) moveNode(r, c);
    else if (isMouseDown) toggleWall(r, c);
}

function toggleWall(r, c) {
    if ((r === startPos.r && c === startPos.c) || (r === endPos.r && c === endPos.c)) return;
    const cell = grid[r][c];
    cell.isWall = !cell.isWall;
    cell.element.classList.toggle('wall', cell.isWall);
}

function moveNode(r, c) {
    if (grid[r][c].isWall) return;
    if (draggingNode === 'start' && (r !== endPos.r || c !== endPos.c)) {
        grid[startPos.r][startPos.c].element.classList.remove('start');
        startPos = {r, c};
        grid[r][c].element.classList.add('start');
    } else if (draggingNode === 'end' && (r !== startPos.r || c !== startPos.c)) {
        grid[endPos.r][endPos.c].element.classList.remove('end');
        endPos = {r, c};
        grid[r][c].element.classList.add('end');
    }
}

async function visualize() {
    if (isRunning) return;
    isRunning = true;
    clearBoard(false);
    const visitedInOrder = [];
    const unvisited = [];
    
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            grid[r][c].distance = Infinity;
            grid[r][c].previous = null;
            unvisited.push(grid[r][c]);
        }
    }

    grid[startPos.r][startPos.c].distance = 0;

    while (unvisited.length) {
        unvisited.sort((a, b) => a.distance - b.distance);
        const closest = unvisited.shift();
        if (closest.distance === Infinity) break;
        if (closest.isWall) continue;
        
        closest.isVisited = true;
        visitedInOrder.push(closest);
        if (closest === grid[endPos.r][endPos.c]) break;

        const neighbors = getNeighbors(closest);
        for (const neighbor of neighbors) {
            const alt = closest.distance + 1;
            if (alt < neighbor.distance) {
                neighbor.distance = alt;
                neighbor.previous = closest;
            }
        }
    }

    await animate(visitedInOrder);
    isRunning = false;
}

function getNeighbors(node) {
    const res = [];
    const r = parseInt(node.element.dataset.r);
    const c = parseInt(node.element.dataset.c);
    if (r > 0) res.push(grid[r-1][c]);
    if (r < rows - 1) res.push(grid[r+1][c]);
    if (c > 0) res.push(grid[r][c-1]);
    if (c < cols - 1) res.push(grid[r][c+1]);
    return res;
}

async function animate(visited) {
    for (let i = 0; i < visited.length; i++) {
        const node = visited[i];
        const r = parseInt(node.element.dataset.r);
        const c = parseInt(node.element.dataset.c);
        if (!((r === startPos.r && c === startPos.c) || (r === endPos.r && c === endPos.c))) {
            node.element.classList.add('visited');
        }
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
    }

    let curr = grid[endPos.r][endPos.c].previous;
    const path = [];
    while (curr && curr !== grid[startPos.r][startPos.c]) {
        path.unshift(curr);
        curr = curr.previous;
    }

    for (const node of path) {
        node.element.classList.add('path');
        await new Promise(r => setTimeout(r, 30));
    }
}

function generateMaze() {
    clearBoard(true);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.25 && !((r === startPos.r && c === startPos.c) || (r === endPos.r && c === endPos.c))) {
                grid[r][c].isWall = true;
                grid[r][c].element.classList.add('wall');
            }
        }
    }
}

function clearBoard(walls) {
    grid.forEach(row => row.forEach(node => {
        node.element.classList.remove('visited', 'path');
        if (walls) {
            node.isWall = false;
            node.element.classList.remove('wall');
        }
    }));
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

init();