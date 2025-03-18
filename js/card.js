/**
 * Módulo para gestionar las tarjetas del tablero Kanban
 */
const CardModule = (() => {
    /**
     * Genera un ID único para una tarjeta
     * @returns {String} - ID único
     */
    const generateCardId = () => {
        return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    /**
     * Crea un objeto de tarjeta
     * @param {String} title - Título de la tarjeta
     * @param {String} description - Descripción de la tarjeta
     * @returns {Object} - Objeto de tarjeta
     */
    const createCardObject = (title, description = '') => {
        return {
            id: generateCardId(),
            title: title,
            description: description,
            createdAt: new Date().toISOString()
        };
    };

    /**
     * Crea el elemento HTML para una tarjeta
     * @param {Object} card - Objeto de tarjeta
     * @returns {HTMLElement} - Elemento de tarjeta
     */
    const createCardElement = (card) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.dataset.id = card.id;
        
        cardElement.innerHTML = `
            <div class="card-title">${card.title}</div>
            ${card.description ? `<div class="card-description">${card.description}</div>` : ''}
            <div class="card-actions">
                <button class="btn ghost edit-card-btn" title="Editar tarjeta">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn ghost delete-card-btn" title="Eliminar tarjeta">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Agregar event listeners
        cardElement.querySelector('.edit-card-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openEditCardModal(card);
        });
        
        cardElement.querySelector('.delete-card-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar esta tarjeta?')) {
                const columnElement = cardElement.closest('.column');
                const columnId = columnElement.dataset.id;
                const boardId = columnElement.closest('.board').dataset.id;
                
                deleteCard(boardId, columnId, card.id);
                cardElement.remove();
                
                // Actualizar contador WiP
                ColumnModule.updateWipCounter(columnElement);
            }
        });
        
        return cardElement;
    };

    /**
     * Abre el modal para editar una tarjeta
     * @param {Object} card - Objeto de tarjeta a editar
     */
    const openEditCardModal = (card) => {
        const modal = document.getElementById('card-modal');
        const titleInput = document.getElementById('card-title');
        const descriptionInput = document.getElementById('card-description');
        const form = document.getElementById('card-form');
        const modalTitle = document.getElementById('card-modal-title');
        
        modalTitle.textContent = 'Editar Tarjeta';
        titleInput.value = card.title;
        descriptionInput.value = card.description || '';
        
        // Guardar referencia a la tarjeta que se está editando
        form.dataset.cardId = card.id;
        form.dataset.mode = 'edit';
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Elimina una tarjeta
     * @param {String} boardId - ID del tablero
     * @param {String} columnId - ID de la columna
     * @param {String} cardId - ID de la tarjeta
     */
    const deleteCard = (boardId, columnId, cardId) => {
        const boards = StorageService.getBoards();
        const board = boards.find(b => b.id === boardId);
        
        if (board) {
            const column = board.columns.find(c => c.id === columnId);
            if (column) {
                column.cards = column.cards.filter(c => c.id !== cardId);
                StorageService.saveBoards(boards);
            }
        }
    };

    /**
     * Actualiza una tarjeta existente
     * @param {String} boardId - ID del tablero
     * @param {String} columnId - ID de la columna
     * @param {String} cardId - ID de la tarjeta
     * @param {Object} updatedCard - Datos actualizados de la tarjeta
     */
    const updateCard = (boardId, columnId, cardId, updatedCard) => {
        const boards = StorageService.getBoards();
        const board = boards.find(b => b.id === boardId);
        
        if (board) {
            const column = board.columns.find(c => c.id === columnId);
            if (column) {
                const cardIndex = column.cards.findIndex(c => c.id === cardId);
                if (cardIndex !== -1) {
                    column.cards[cardIndex] = {
                        ...column.cards[cardIndex],
                        ...updatedCard
                    };
                    StorageService.saveBoards(boards);
                    
                    // Actualizar el elemento de la tarjeta en el DOM
                    const cardElement = document.querySelector(`.card[data-id="${cardId}"]`);
                    if (cardElement) {
                        cardElement.querySelector('.card-title').textContent = updatedCard.title;
                        
                        const descriptionElement = cardElement.querySelector('.card-description');
                        if (updatedCard.description) {
                            if (descriptionElement) {
                                descriptionElement.textContent = updatedCard.description;
                            } else {
                                const newDescriptionElement = document.createElement('div');
                                newDescriptionElement.className = 'card-description';
                                newDescriptionElement.textContent = updatedCard.description;
                                cardElement.insertBefore(newDescriptionElement, cardElement.querySelector('.card-actions'));
                            }
                        } else if (descriptionElement) {
                            descriptionElement.remove();
                        }
                    }
                }
            }
        }
    };

    return {
        generateCardId,
        createCardObject,
        createCardElement,
        openEditCardModal,
        deleteCard,
        updateCard
    };
})();