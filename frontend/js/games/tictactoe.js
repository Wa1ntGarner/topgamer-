// Крестики-нолики с ботом
class TicTacToe {
    constructor(onGameEnd) {
        this.board = [
            ['', '', ''],
            ['', '', ''],
            ['', '', '']
        ];
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.onGameEnd = onGameEnd;
        this.winningCombos = [
            [[0,0], [0,1], [0,2]],
            [[1,0], [1,1], [1,2]],
            [[2,0], [2,1], [2,2]],
            [[0,0], [1,0], [2,0]],
            [[0,1], [1,1], [2,1]],
            [[0,2], [1,2], [2,2]],
            [[0,0], [1,1], [2,2]],
            [[0,2], [1,1], [2,0]]
        ];
    }

    checkWinner() {
        for (let combo of this.winningCombos) {
            const [a, b, c] = combo;
            const valA = this.board[a[0]][a[1]];
            const valB = this.board[b[0]][b[1]];
            const valC = this.board[c[0]][c[1]];
            
            if (valA && valA === valB && valB === valC) {
                return valA;
            }
        }
        return null;
    }

    isBoardFull() {
        for (let row of this.board) {
            if (row.includes('')) return false;
        }
        return true;
    }

    makeMove(row, col, player) {
        if (!this.gameActive) return false;
        if (this.board[row][col] !== '') return false;
        if (player !== this.currentPlayer) return false;
        
        this.board[row][col] = player;
        
        const winner = this.checkWinner();
        if (winner) {
            this.gameActive = false;
            this.onGameEnd(winner === 'X' ? 'win' : 'lose');
            return true;
        }
        
        if (this.isBoardFull()) {
            this.gameActive = false;
            this.onGameEnd('draw');
            return true;
        }
        
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        return true;
    }

    getEmptyCells() {
        const empty = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[i][j] === '') {
                    empty.push([i, j]);
                }
            }
        }
        return empty;
    }

    botMove() {
        if (!this.gameActive) return;
        if (this.currentPlayer !== 'O') return;
        
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return;
        
        // Проверяем возможность выигрыша
        for (let [row, col] of emptyCells) {
            this.board[row][col] = 'O';
            if (this.checkWinner() === 'O') {
                this.board[row][col] = '';
                this.makeMove(row, col, 'O');
                return;
            }
            this.board[row][col] = '';
        }
        
        // Проверяем возможность блокировки игрока
        for (let [row, col] of emptyCells) {
            this.board[row][col] = 'X';
            if (this.checkWinner() === 'X') {
                this.board[row][col] = '';
                this.makeMove(row, col, 'O');
                return;
            }
            this.board[row][col] = '';
        }
        
        // Занимаем центр
        if (this.board[1][1] === '') {
            this.makeMove(1, 1, 'O');
            return;
        }
        
        // Случайный ход
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        const [row, col] = emptyCells[randomIndex];
        this.makeMove(row, col, 'O');
    }
}

function renderTicTacToe(container, betAmount, onComplete) {
    const game = new TicTacToe((result) => {
        if (result === 'win') {
            showNotification(`ПОБЕДА! Вы выиграли ${betAmount} ₽!`, 'success');
            if (onComplete) onComplete(betAmount);
        } else if (result === 'lose') {
            showNotification(`ПОРАЖЕНИЕ! Вы проиграли ${betAmount} ₽`, 'error');
            if (onComplete) onComplete(0);
        } else {
            showNotification('НИЧЬЯ! Попробуйте еще раз', 'info');
            if (onComplete) onComplete(0);
        }
    });
    
    const renderBoard = () => {
        const boardHtml = `
            <div style="text-align: center;">
                <h3>Крестики-нолики</h3>
                <div class="game-info">
                    <p>Вы играете за <strong style="color: var(--blue-light);">❌ X</strong></p>
                    <p>Ставка: <strong style="color: var(--warning);">${betAmount} ₽</strong></p>
                    <p>Выигрыш: <strong style="color: var(--success);">${betAmount} ₽</strong> при победе!</p>
                    <hr style="margin: 10px 0; border-color: var(--gray);">
                </div>
                <div class="tictactoe-board">
                    ${game.board.map((row, i) => `
                        <div class="tictactoe-row">
                            ${row.map((cell, j) => `
                                <button class="tictactoe-cell ${cell ? 'filled' : ''}" data-row="${i}" data-col="${j}" ${!game.gameActive || cell !== '' || game.currentPlayer !== 'X' ? 'disabled' : ''}>
                                    ${cell === 'X' ? '❌' : cell === 'O' ? '⭕' : ''}
                                </button>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
                <button id="resetGameBtn" class="btn" style="margin-top: 1rem;">Новая игра</button>
            </div>
        `;
        
        container.innerHTML = boardHtml;
        
        document.querySelectorAll('.tictactoe-cell').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = parseInt(btn.dataset.row);
                const col = parseInt(btn.dataset.col);
                
                if (game.makeMove(row, col, 'X')) {
                    renderBoard();
                    setTimeout(() => {
                        game.botMove();
                        renderBoard();
                    }, 500);
                }
            });
        });
        
        document.getElementById('resetGameBtn')?.addEventListener('click', () => {
            renderTicTacToe(container, betAmount, onComplete);
        });
    };
    
    renderBoard();
}