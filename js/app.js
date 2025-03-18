/**
 * Módulo principal de la aplicación Kanban
 */
const AppModule = (() => {
    /**
     * Inicializa la aplicación
     */
    const init = () => {
        // Renderizar tableros guardados
        BoardModule.renderBoards();
        
        // Configurar event listeners
        setupEventListeners();
    };

    /**
     * Configura los event listeners de la aplicación
     */
    const setupEventListeners = () => {
        // Botón para crear nuevo tablero
        document.getElementById('create-board-btn').addEventListener('click', () => {
            BoardModule.openAddBoardModal();
        });
        
        // Botón de ayuda
        document.getElementById('help-btn').addEventListener('click', () => {
            document.getElementById('help-modal').style.display = 'block';
        });
        
        // Botones para cerrar modales
        document.querySelectorAll('.modal .close, .notification-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal') || e.target.closest('.notification');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            document.querySelectorAll('.modal').forEach(modal => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Formulario para crear/editar tablero
        document.getElementById('board-form').addEventListener('submit', handleBoardFormSubmit);
        
        // Formulario para crear/editar columna
        document.getElementById('column-form').addEventListener('submit', handleColumnFormSubmit);
        
        // Formulario para crear/editar tarjeta
        document.getElementById('card-form').addEventListener('submit', handleCardFormSubmit);
    };

    /**
     * Maneja el envío del formulario de tablero
     * @param {Event} e - Evento de submit
     */
    const handleBoardFormSubmit = (e) => {
        e.preventDefault();
        
        const form = e.target;
        const nameInput = document.getElementById('board-name');
        const name = nameInput.value.trim();
        const mode = form.dataset.mode;
        
        if (name) {
            if (mode === 'add') {
                // Crear nuevo tablero
                const board = BoardModule.createBoardObject(name);
                StorageService.saveBoard(board);
                
                // Renderizar el nuevo tablero
                const boardsContainer = document.getElementById('boards-container');
                boardsContainer.appendChild(BoardModule.createBoardElement(board));
                
                // Verificar si no hay tableros
                BoardModule.checkEmptyBoards();
                
                // Mostrar notificación
                showNotification(`Tablero "${name}" creado con éxito`, 'success');
            } else if (mode === 'edit') {
                // Editar tablero existente
                const boardId = form.dataset.boardId;
                const boards = StorageService.getBoards();
                const board = boards.find(b => b.id === boardId);
                
                if (board) {
                    board.name = name;
                    StorageService.saveBoards(boards);
                    
                    // Actualizar el nombre en el DOM
                    const boardElement = document.querySelector(`.board[data-id="${boardId}"]`);
                    if (boardElement) {
                        boardElement.querySelector('.board-title').textContent = name;
                    }
                    
                    // Mostrar notificación
                    showNotification(`Tablero "${name}" actualizado con éxito`, 'success');
                }
            }
            
            // Cerrar el modal
            document.getElementById('board-modal').style.display = 'none';
        }
    };

    /**
     * Maneja el envío del formulario de columna
     * @param {Event} e - Evento de submit
     */
    const handleColumnFormSubmit = (e) => {
        e.preventDefault();
        
        const form = e.target;
        const titleInput = document.getElementById('column-title');
        const wipLimitInput = document.getElementById('column-wip-limit');
        const title = titleInput.value.trim();
        const wipLimit = wipLimitInput.value.trim() ? parseInt(wipLimitInput.value) : null;
        const mode = form.dataset.mode;
        const boardId = form.dataset.boardId;
        
        if (title) {
            const boards = StorageService.getBoards();
            const boardIndex = boards.findIndex(b => b.id === boardId);
            
            if (boardIndex !== -1) {
                if (mode === 'add') {
                    // Crear nueva columna
                    const column = ColumnModule.createColumnObject(title, wipLimit);
                    boards[boardIndex].columns.push(column);
                    
                    // Guardar cambios
                    StorageService.saveBoards(boards);
                    
                    // Añadir columna al DOM
                    const boardElement = document.querySelector(`.board[data-id="${boardId}"]`);
                    if (boardElement) {
                        const columnsContainer = boardElement.querySelector('.columns-container');
                        columnsContainer.appendChild(ColumnModule.createColumnElement(column, boardId));
                    }
                    
                    // Mostrar notificación
                    showNotification(`Columna "${title}" creada con éxito`, 'success');
                } else if (mode === 'edit') {
                    // Editar columna existente
                    const columnId = form.dataset.columnId;
                    const columnIndex = boards[boardIndex].columns.findIndex(c => c.id === columnId);
                    
                    if (columnIndex !== -1) {
                        const column = boards[boardIndex].columns[columnIndex];
                        column.title = title;
                        column.wipLimit = wipLimit;
                        
                        // Guardar cambios
                        StorageService.saveBoards(boards);
                        
                        // Actualizar columna en el DOM
                        const columnElement = document.querySelector(`.column[data-id="${columnId}"]`);
                        if (columnElement) {
                            columnElement.querySelector('.column-title').textContent = title;
                            
                            // Actualizar contador WiP
                            ColumnModule.updateWipCounter(columnElement);
                        }
                        
                        // Mostrar notificación
                        showNotification(`Columna "${title}" actualizada con éxito`, 'success');
                    }
                }
            }
            
            // Cerrar el modal
            document.getElementById('column-modal').style.display = 'none';
        }
    };

    /**
     * Maneja el envío del formulario de tarjeta
     * @param {Event} e - Evento de submit
     */
    const handleCardFormSubmit = (e) => {
        e.preventDefault();
        
        const form = e.target;
        const titleInput = document.getElementById('card-title');
        const descriptionInput = document.getElementById('card-description');
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const mode = form.dataset.mode;
        
        if (title) {
            if (mode === 'add') {
                // Crear nueva tarjeta
                const boardId = form.dataset.boardId;
                const columnId = form.dataset.columnId;
                
                // Verificar límite WiP
                const column = ColumnModule.getColumnById(boardId, columnId);
                if (column && column.wipLimit && column.cards.length >= column.wipLimit) {
                    showNotification(`No se puede añadir la tarjeta. Se excedería el límite WiP de la columna "${column.title}" (${column.wipLimit}).`, 'error');
                    return;
                }
                
                const card = CardModule.createCardObject(title, description);
                
                // Añadir tarjeta al modelo de datos
                const boards = StorageService.getBoards();
                const board = boards.find(b => b.id === boardId);
                
                if (board) {
                    const column = board.columns.find(c => c.id === columnId);
                    if (column) {
                        column.cards.push(card);
                        StorageService.saveBoards(boards);
                        
                        // Añadir tarjeta al DOM
                        const columnElement = document.querySelector(`.column[data-id="${columnId}"]`);
                        if (columnElement) {
                            const cardsContainer = columnElement.querySelector('.column-cards');
                            cardsContainer.appendChild(CardModule.createCardElement(card));
                            
                            // Actualizar contador WiP
                            ColumnModule.updateWipCounter(columnElement);
                        }
                        
                        // Mostrar notificación
                        showNotification(`Tarjeta "${title}" creada con éxito`, 'success');
                    }
                }
            } else if (mode === 'edit') {
                // Editar tarjeta existente
                const cardId = form.dataset.cardId;
                const cardElement = document.querySelector(`.card[data-id="${cardId}"]`);
                
                if (cardElement) {
                    const columnElement = cardElement.closest('.column');
                    const boardId = columnElement.closest('.board').dataset.id;
                    const columnId = columnElement.dataset.id;
                    
                    // Actualizar tarjeta
                    const updatedCard = {
                        title: title,
                        description: description
                    };
                    
                    CardModule.updateCard(boardId, columnId, cardId, updatedCard);
                    
                    // Mostrar notificación
                    showNotification(`Tarjeta "${title}" actualizada con éxito`, 'success');
                }
            }
            
            // Cerrar el modal
            document.getElementById('card-modal').style.display = 'none';
        }
    };

    /**
     * Muestra una notificación
     * @param {String} message - Mensaje a mostrar
     * @param {String} type - Tipo de notificación ('success' o 'error')
     */
    const showNotification = (message, type = 'success') => {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notification-message');
        
        // Establecer mensaje y tipo
        messageElement.textContent = message;
        notification.className = 'notification ' + type;
        
        // Mostrar notificación
        notification.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    };

    return {
        init,
        showNotification
    };
})();

// Iniciar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', AppModule.init);