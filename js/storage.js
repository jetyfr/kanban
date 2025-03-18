/**
 * Módulo de almacenamiento para gestionar la persistencia de datos en localStorage
 */
const StorageService = (() => {
    const STORAGE_KEY = 'kanban_boards';

    /**
     * Guarda los tableros en localStorage
     * @param {Array} boards - Array de objetos de tablero
     */
    const saveBoards = (boards) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
    };

    /**
     * Recupera los tableros desde localStorage
     * @returns {Array} - Array de objetos de tablero
     */
    const getBoards = () => {
        const boards = localStorage.getItem(STORAGE_KEY);
        return boards ? JSON.parse(boards) : [];
    };

    /**
     * Guarda un tablero específico
     * @param {Object} board - Objeto de tablero
     */
    const saveBoard = (board) => {
        const boards = getBoards();
        const existingIndex = boards.findIndex(b => b.id === board.id);
        
        if (existingIndex >= 0) {
            boards[existingIndex] = board;
        } else {
            boards.push(board);
        }
        
        saveBoards(boards);
    };

    /**
     * Elimina un tablero por su ID
     * @param {String} boardId - ID del tablero a eliminar
     */
    const deleteBoard = (boardId) => {
        const boards = getBoards();
        const filteredBoards = boards.filter(board => board.id !== boardId);
        saveBoards(filteredBoards);
    };

    return {
        saveBoards,
        getBoards,
        saveBoard,
        deleteBoard
    };
})();