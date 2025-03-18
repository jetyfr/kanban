/**
 * Módulo para gestionar los tableros Kanban
 */
const BoardModule = (() => {
    /**
     * Genera un ID único para un tablero
     * @returns {String} - ID único
     */
    const generateBoardId = () => {
        return 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    };

    /**
     * Crea un objeto de tablero
     * @param {String} name - Nombre del tablero
     * @returns {Object} - Objeto de tablero
     */
    const createBoardObject = (name) => {
        return {
            id: generateBoardId(),
            name: name,
            columns: [],
            createdAt: new Date().toISOString()
        };
    };

    /**
     * Crea el elemento HTML para un tablero
     * @param {Object} board - Objeto de tablero
     * @returns {HTMLElement} - Elemento de tablero
     */
    const createBoardElement = (board) => {
        const boardElement = document.createElement('div');
        boardElement.className = 'board';
        boardElement.dataset.id = board.id;
        
        boardElement.innerHTML = `
            <div class="board-header">
                <h2 class="board-title">${board.name}</h2>
                <div class="board-actions">
                    <button class="btn primary add-column-btn">
                        <i class="fas fa-plus"></i> Añadir Columna
                    </button>
                    <button class="btn secondary edit-board-btn">
                        <i class="fas fa-edit"></i> Editar Tablero
                    </button>
                    <button class="btn danger delete-board-btn">
                        <i class="fas fa-trash"></i> Eliminar Tablero
                    </button>
                </div>
            </div>
            <div class="board-content">
                <div class="columns-container"></div>
                <div class="add-column">
                    <i class="fas fa-plus"></i> Añadir Columna
                </div>
            </div>
        `;
        
        // Agregar event listeners
        boardElement.querySelector('.edit-board-btn').addEventListener('click', () => {
            openEditBoardModal(board);
        });
        
        boardElement.querySelector('.delete-board-btn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que deseas eliminar este tablero? Se eliminarán todas las columnas y tarjetas.')) {
                deleteBoard(board.id);
                boardElement.remove();
                
                // Mostrar mensaje si no hay tableros
                checkEmptyBoards();
            }
        });
        
        const addColumnButtons = boardElement.querySelectorAll('.add-column-btn, .add-column');
        addColumnButtons.forEach(button => {
            button.addEventListener('click', () => {
                openAddColumnModal(board.id);
            });
        });
        
        // Renderizar columnas existentes
        const columnsContainer = boardElement.querySelector('.columns-container');
        board.columns.forEach(column => {
            columnsContainer.appendChild(ColumnModule.createColumnElement(column, board.id));
        });
        
        // Inicializar Sortable para las columnas
        Sortable.create(columnsContainer, {
            group: 'columns',
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.column-header',
            onEnd: function(evt) {
                // Actualizar el orden de las columnas en el modelo de datos
                updateColumnsOrder(board.id, columnsContainer);
            }
        });
        
        return boardElement;
    };

    /**
     * Abre el modal para añadir un nuevo tablero
     */
    const openAddBoardModal = () => {
        const modal = document.getElementById('board-modal');
        const nameInput = document.getElementById('board-name');
        const form = document.getElementById('board-form');
        const modalTitle = document.getElementById('board-modal-title');
        
        modalTitle.textContent = 'Nuevo Tablero';
        nameInput.value = '';
        
        // Configurar el formulario para añadir
        form.dataset.mode = 'add';
        delete form.dataset.boardId;
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Abre el modal para editar un tablero
     * @param {Object} board - Objeto de tablero a editar
     */
    const openEditBoardModal = (board) => {
        const modal = document.getElementById('board-modal');
        const nameInput = document.getElementById('board-name');
        const form = document.getElementById('board-form');
        const modalTitle = document.getElementById('board-modal-title');
        
        modalTitle.textContent = 'Editar Tablero';
        nameInput.value = board.name;
        
        // Configurar el formulario para editar
        form.dataset.mode = 'edit';
        form.dataset.boardId = board.id;
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Abre el modal para añadir una nueva columna
     * @param {String} boardId - ID del tablero
     */
    const openAddColumnModal = (boardId) => {
        const modal = document.getElementById('column-modal');
        const titleInput = document.getElementById('column-title');
        const wipLimitInput = document.getElementById('column-wip-limit');
        const form = document.getElementById('column-form');
        const modalTitle = document.getElementById('column-modal-title');
        
        modalTitle.textContent = 'Nueva Columna';
        titleInput.value = '';
        wipLimitInput.value = '';
        
        // Configurar el formulario para añadir
        form.dataset.mode = 'add';
        form.dataset.boardId = boardId;
        delete form.dataset.columnId;
        
        // Mostrar el modal
        modal.style.display = 'block';
    };

    /**
     * Elimina un tablero
     * @param {String} boardId - ID del tablero a eliminar
     */
    const deleteBoard = (boardId) => {
        StorageService.deleteBoard(boardId);
    };

    /**
     * Actualiza el orden de las columnas en el modelo de datos
     * @param {String} boardId - ID del tablero
     * @param {HTMLElement} columnsContainer - Contenedor de columnas
     */
    const updateColumnsOrder = (boardId, columnsContainer) => {
        const boards = StorageService.getBoards();
        const board = boards.find(b => b.id === boardId);
        
        if (board) {
            // Obtener el nuevo orden de las columnas
            const columnElements = columnsContainer.querySelectorAll('.column');
            const newColumnsOrder = Array.from(columnElements).map(el => {
                const columnId = el.dataset.id;
                return board.columns.find(c => c.id === columnId);
            });
            
            // Actualizar el orden en el modelo
            board.columns = newColumnsOrder;
            StorageService.saveBoards(boards);
        }
    };

    /**
     * Verifica si no hay tableros y muestra un mensaje
     */
    const checkEmptyBoards = () => {
        const boardsContainer = document.getElementById('boards-container');
        const noBoards = document.querySelector('.no-boards-message');
        
        if (boardsContainer.querySelectorAll('.board').length === 0) {
            if (!noBoards) {
                const message = document.createElement('div');
                message.className = 'no-boards-message';
                message.innerHTML = `
                    <h2>No hay tableros creados</h2>
                    <p>Crea tu primer tablero Kanban haciendo clic en "Nuevo Tablero"</p>
                `;
                boardsContainer.appendChild(message);
            }
        } else if (noBoards) {
            noBoards.remove();
        }
    };

    /**
     * Renderiza todos los tableros guardados
     */
    const renderBoards = () => {
        const boards = StorageService.getBoards();
        const boardsContainer = document.getElementById('boards-container');
        
        // Limpiar el contenedor
        boardsContainer.innerHTML = '';
        
        // Renderizar cada tablero
        boards.forEach(board => {
            boardsContainer.appendChild(createBoardElement(board));
        });
        
        // Verificar si no hay tableros
        checkEmptyBoards();
    };

    return {
        generateBoardId,
        createBoardObject,
        createBoardElement,
        openAddBoardModal,
        openEditBoardModal,
        openAddColumnModal,
        deleteBoard,
        updateColumnsOrder,
        checkEmptyBoards,
        renderBoards
    };
})();