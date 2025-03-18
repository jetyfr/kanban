/**
 * Módulo para gestionar las columnas del tablero Kanban
 */
const ColumnModule = (() => {
    /**
     * Genera un ID único para una columna
     * @returns {String} - ID único
     */
    const generateColumnId = () => {
        return 'column_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    /**
     * Crea un objeto de columna
     * @param {String} title - Título de la columna
     * @param {Number} wipLimit - Límite de trabajo en progreso (opcional)
     * @returns {Object} - Objeto de columna
     */
    const createColumnObject = (title, wipLimit = null) => {
        return {
            id: generateColumnId(),
            title: title,
            wipLimit: wipLimit ? parseInt(wipLimit) : null,
            cards: []
        };
    };

    /**
     * Crea el elemento HTML para una columna
     * @param {Object} column - Objeto de columna
     * @param {String} boardId - ID del tablero al que pertenece la columna
     * @returns {HTMLElement} - Elemento de columna
     */
    const createColumnElement = (column, boardId) => {
        const columnElement = document.createElement('div');
        columnElement.className = 'column';
        columnElement.dataset.id = column.id;
        
        columnElement.innerHTML = `
            <div class="column-header">
                <div class="column-title">${column.title}</div>
                <div class="column-wip" title="Tarjetas / Límite WiP">
                    ${column.cards.length}${column.wipLimit ? '/' + column.wipLimit : ''}
                </div>
                <div class="column-actions">
                    <button class="btn ghost edit-column-btn" title="Editar columna">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn ghost delete-column-btn" title="Eliminar columna">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="column-cards"></div>
            <div class="add-card">
                <i class="fas fa-plus"></i> Añadir tarjeta
            </div>
        `;
        
        // Agregar event listeners
        columnElement.querySelector('.edit-column-btn').addEventListener('click', () => {
            openEditColumnModal(column, boardId);
        });
        
        columnElement.querySelector('.delete-column-btn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas eliminar esta columna? Se eliminarán todas las tarjetas contenidas en ella.')) {
                deleteColumn(boardId, column.id);
                columnElement.remove();
            }
        });
        
        // Agregar event listener para añadir tarjeta
        columnElement.querySelector('.add-card').addEventListener('click', () => {
            openAddCardModal(boardId, column.id);
        });
        
        // Renderizar tarjetas existentes
        const cardsContainer = columnElement.querySelector('.column-cards');
        column.cards.forEach(card => {
            cardsContainer.appendChild(CardModule.createCardElement(card));
        });
        
        // Inicializar Sortable para las tarjetas
        Sortable.create(cardsContainer, {
            group: 'cards',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: function(evt) {
                const cardId = evt.item.dataset.id;
                const fromColumnId = evt.from.closest('.column').dataset.id;
                const toColumnId = evt.to.closest('.column').dataset.id;
                
                // Verificar límite WiP
                if (fromColumnId !== toColumnId) {
                    const toColumn = getColumnById(boardId, toColumnId);
                    if (toColumn.wipLimit && evt.to.childElementCount > toColumn.wipLimit) {
                        // Revertir el movimiento
                        evt.from.appendChild(evt.item);
                        
                        // Mostrar notificación
                        AppModule.showNotification(`No se puede mover la tarjeta. Se excedería el límite WiP de la columna "${toColumn.title}" (${toColumn.wipLimit}).`, 'error');
                        return;
                    }
                }
                
                // Actualizar el modelo de datos
                moveCard(boardId, fromColumnId, toColumnId, cardId);
                
                // Actualizar contadores WiP
                updateWipCounter(evt.from.closest('.column'));
                if (fromColumnId !== toColumnId) {
                    updateWipCounter(evt.to.closest('.column'));
                }
            }
        });
        
        // Actualizar el contador WiP
        updateWipCounter(columnElement);
        
        return columnElement;
    };

    /**
     * Abre el modal para añadir una nueva tarjeta
     * @param {String} boardId - ID del tablero
     * @param {String} columnId - ID de la columna
     */
    const openAddCardModal = (boardId, columnId) => {
        const modal = document.getElementById('card-modal');
        const titleInput = document.getElementById('card-title');
        const descriptionInput = document.getElementById('card-description');
        const form = document.getElementById('card-form');
        const modalTitle = document.getElementById('card-modal-title');
        
        modalTitle.textContent = 'Nueva Tarjeta';
        titleInput.value = '';
        descriptionInput.value = '';
        
        // Guardar referencias para el formulario
        form.dataset.boardId = boardId;
        form.dataset.columnId = columnId;
        form.dataset.mode = 'add';
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Abre el modal para editar una columna
     * @param {Object} column - Objeto de columna a editar
     * @param {String} boardId - ID del tablero
     */
    const openEditColumnModal = (column, boardId) => {
        const modal = document.getElementById('column-modal');
        const titleInput = document.getElementById('column-title');
        const wipLimitInput = document.getElementById('column-wip-limit');
        const form = document.getElementById('column-form');
        const modalTitle = document.getElementById('column-modal-title');
        
        modalTitle.textContent = 'Editar Columna';
        titleInput.value = column.title;
        wipLimitInput.value = column.wipLimit || '';
        
        // Guardar referencias para el formulario
        form.dataset.columnId = column.id;
        form.dataset.boardId = boardId;
        form.dataset.mode = 'edit';
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Actualiza el contador WiP de una columna
     * @param {HTMLElement} columnElement - Elemento de columna
     */
    const updateWipCounter = (columnElement) => {
        const wipElement = columnElement.querySelector('.column-wip');
        const cardsCount = columnElement.querySelectorAll('.card').length;
        
        // Verificar que columnElement está dentro de un board antes de acceder a dataset.id
        const boardElement = columnElement.closest('.board');
        if (!boardElement) {
            return; // Salir si no hay un board padre
        }
        
        const boardId = boardElement.dataset.id;
        const columnId = columnElement.dataset.id;
        
        // Obtener el límite WiP de la columna
        const column = getColumnById(boardId, columnId);
        const wipLimit = column ? column.wipLimit : null;
        
        // Actualizar el texto del contador
        wipElement.textContent = cardsCount + (wipLimit ? '/' + wipLimit : '');
        
        // Aplicar estilo si se alcanza el límite
        if (wipLimit && cardsCount >= wipLimit) {
            wipElement.classList.add('limit-reached');
        } else {
            wipElement.classList.remove('limit-reached');
        }
    };

    /**
     * Obtiene una columna por su ID
     * @param {String} boardId - ID del tablero
     * @param {String} columnId - ID de la columna
     * @returns {Object|null} - Objeto de columna o null si no se encuentra
     */
    const getColumnById = (boardId, columnId) => {
        const boards = StorageService.getBoards();
        const board = boards.find(b => b.id === boardId);
        
        if (board) {
            return board.columns.find(c => c.id === columnId) || null;
        }
        
        return null;
    };

    /**
     * Elimina una columna
     * @param {String} boardId - ID del tablero
     * @param {String} columnId - ID de la columna
     */
    const deleteColumn = (boardId, columnId) => {
        const boards = StorageService.getBoards();
        const boardIndex = boards.findIndex(b => b.id === boardId);
        
        if (boardIndex !== -1) {
            boards[boardIndex].columns = boards[boardIndex].columns.filter(c => c.id !== columnId);
            StorageService.saveBoards(boards);
        }
    };

    /**
     * Mueve una tarjeta entre columnas
     * @param {String} boardId - ID del tablero
     * @param {String} fromColumnId - ID de la columna origen
     * @param {String} toColumnId - ID de la columna destino
     * @param {String} cardId - ID de la tarjeta
     */
    const moveCard = (boardId, fromColumnId, toColumnId, cardId) => {
        const boards = StorageService.getBoards();
        const board = boards.find(b => b.id === boardId);
        
        if (board) {
            const fromColumn = board.columns.find(c => c.id === fromColumnId);
            const toColumn = board.columns.find(c => c.id === toColumnId);
            
            if (fromColumn && toColumn) {
                // Encontrar la tarjeta y su índice
                const cardIndex = fromColumn.cards.findIndex(c => c.id === cardId);
                
                if (cardIndex !== -1) {
                    // Mover la tarjeta
                    const card = fromColumn.cards[cardIndex];
                    fromColumn.cards.splice(cardIndex, 1);
                    toColumn.cards.push(card);
                    
                    // Guardar cambios
                    StorageService.saveBoards(boards);
                }
            }
        }
    };

    return {
        generateColumnId,
        createColumnObject,
        createColumnElement,
        openAddCardModal,
        openEditColumnModal,
        updateWipCounter,
        getColumnById,
        deleteColumn,
        moveCard
    };
})();