//
// ====================================================================
// CONTENUTO DEL MODULO DRAFT.JS (Logica Gestione Draft)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const draftContent = document.getElementById('draft-content');
    const draftToolsContainer = document.getElementById('draft-tools-container');
    const draftBackButton = document.getElementById('draft-back-button');
    const adminContent = document.getElementById('admin-content');
    const appContent = document.getElementById('app-content'); // Riferimento per la navigazione utente

    // Variabili globali
    let db;
    let firestoreTools;
    
    // Riferimenti per i messaggi di stato
    let playerCreationMessage;
    let currentMode = 'admin'; // 'admin' o 'utente'
    let currentTeamId = null; 

    // Costanti per le collezioni
    const CONFIG_DOC_ID = 'settings'; 
    let DRAFT_PLAYERS_COLLECTION_PATH;
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;

    /**
     * Helper per generare un numero intero casuale tra min (incluso) e max (incluso).
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    const getRandomInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    
    /**
     * Helper per visualizzare i messaggi di stato.
     * Questa funzione ora gestisce due tipi di messaggi a seconda della modalità.
     * @param {string} message - Il testo del messaggio.
     * @param {string} type - 'success', 'error', o 'info'.
     * @param {string} elementId - L'ID dell'elemento messaggio (default: player-creation-message).
     */
    const displayMessage = (message, type, elementId = 'player-creation-message') => {
        const msgElement = document.getElementById(elementId);
        if (!msgElement) return;
        msgElement.textContent = message;
        msgElement.classList.remove('text-red-400', 'text-green-500', 'text-yellow-400');
        
        if (type === 'error') {
            msgElement.classList.add('text-red-400');
        } else if (type === 'success') {
            msgElement.classList.add('text-green-500');
        } else if (type === 'info') {
            msgElement.classList.add('text-yellow-400');
        }
    };


    /**
     * Funzione principale per inizializzare il pannello Draft in base alla modalità.
     * @param {CustomEvent} event - L'evento custom con i dettagli della modalità e del teamId.
     */
    const initializeDraftPanel = (event) => {
        // Inizializza servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        // Imposta la modalità e l'ID della squadra (solo se è utente)
        currentMode = event.detail && event.detail.mode === 'utente' ? 'utente' : 'admin';
        currentTeamId = event.detail ? event.detail.teamId : null;
        
        console.log(`Caricamento pannello Draft, Modalità: ${currentMode}`);

        if (currentMode === 'admin') {
            renderAdminDraftPanel();
        } else {
            renderUserDraftPanel();
        }
    };
    
    // -------------------------------------------------------------------
    // MODALITÀ ADMIN: CREAZIONE GIOCATORI E GESTIONE STATO DRAFT
    // -------------------------------------------------------------------

    const renderAdminDraftPanel = async () => {
        draftBackButton.textContent = "Torna al Pannello Admin";
        draftBackButton.onclick = () => window.showScreen(adminContent);
        
        // Inizializzazione per la gestione dello stato Draft
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;
        
        // Costanti Tipologie
        const types = ['Potenza', 'Tecnica', 'Velocita'];


        // Interfaccia Creazione Calciatore con il pulsante Toggle
        draftToolsContainer.innerHTML = `
            <div class="p-6 bg-gray-800 rounded-lg border border-yellow-600 shadow-inner-lg space-y-8">
                
                <!-- SEZIONE 1: GESTIONE STATO DRAFT -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2">Stato Mercato/Draft</h3>
                <div class="flex items-center justify-between p-4 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span id="draft-status-text" class="font-extrabold text-xl">${draftOpen ? 'DRAFT APERTO' : 'DRAFT CHIUSO'}</span>
                    <button id="btn-toggle-draft" 
                            data-is-open="${draftOpen}"
                            class="px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${draftOpen ? 'CHIUDI Mercato' : 'APRI Mercato'}
                    </button>
                </div>
                <p id="draft-toggle-message" class="text-center mt-3 text-red-400"></p>


                <!-- SEZIONE 2: CREAZIONE CALCIATORE -->
                <h3 class="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2 pt-4">Crea Nuovo Calciatore</h3>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- Nome -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                        <input type="text" id="player-name" placeholder="Es: Barella"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                    
                    <!-- Ruolo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-role">Ruolo</label>
                        <select id="player-role" 
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Ruolo</option>
                            <option value="P">P (Portiere)</option>
                            <option value="D">D (Difensore)</option>
                            <option value="C">C (Centrocampista)</option>
                            <option value="A">A (Attaccante)</option>
                        </select>
                    </div>

                    <!-- Tipologia (Type) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-type">Tipologia (Type)</label>
                        <select id="player-type" 
                                class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                            <option value="">Seleziona Tipo</option>
                            ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
                        </select>
                    </div>
                    
                    <!-- Età (Range 15-50) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-age">Età (15 - 50)</label>
                        <input type="number" id="player-age" min="15" max="50" placeholder="25"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>

                    <!-- Liv Minimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-min">Liv Minimo (1 - 20)</label>
                        <input type="number" id="player-level-min" min="1" max="20" placeholder="10"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                    
                    <!-- Liv Massimo (Range 1-20) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-max">Liv Massimo (1 - 20)</label>
                        <input type="number" id="player-level-max" min="1" max="20" placeholder="18"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                    
                    <!-- Costo -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-cost">Costo (Crediti Seri)</label>
                        <input type="number" id="player-cost" min="1" placeholder="50"
                               class="p-2 rounded-lg bg-gray-700 border border-yellow-600 text-white focus:ring-yellow-400">
                    </div>
                </div>
                
                <!-- Pulsanti Azioni -->
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-random-player"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Crea Giocatore Casuale
                    </button>
                    <button id="btn-create-player"
                            class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150 transform hover:scale-[1.01] mt-4">
                        Aggiungi Calciatore al Draft
                    </button>
                </div>
                
                <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>
                
                <!-- SEZIONE 3: LISTA CALCIATORI ESISTENTI -->
                <h3 class="text-xl font-bold text-gray-400 border-b border-gray-700 pb-2 mt-8 pt-4">Calciatori Disponibili nel Draft</h3>
                <div id="draft-players-list" class="mt-4 space-y-3">
                     <p class="text-gray-500 text-center">Caricamento in corso...</p>
                </div>
                
            </div>
        `;

        playerCreationMessage = document.getElementById('player-creation-message');

        // Cablaggi Admin
        document.getElementById('btn-toggle-draft').addEventListener('click', handleToggleDraft);
        document.getElementById('btn-create-player').addEventListener('click', handleCreatePlayer);
        document.getElementById('btn-random-player').addEventListener('click', handleRandomPlayer); 
        
        // Carica la lista dei giocatori
        loadDraftPlayers();
    };
    
    /**
     * Carica e renderizza la lista dei giocatori nel Draft.
     */
    const loadDraftPlayers = async () => {
        const { collection, getDocs } = firestoreTools;
        const playersListContainer = document.getElementById('draft-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-yellow-400">Caricamento giocatori...</p>';

        try {
            const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
            const querySnapshot = await getDocs(playersCollectionRef);

            if (querySnapshot.empty) {
                playersListContainer.innerHTML = '<p class="text-center text-gray-400">Nessun calciatore presente nel Draft.</p>';
                return;
            }

            let playersHtml = '';
            querySnapshot.forEach(doc => {
                const player = doc.data();
                const playerId = doc.id;
                
                const statusClass = player.isDrafted ? 'bg-red-700' : 'bg-green-700';
                const teamName = player.teamId ? player.teamId : '';
                const statusText = player.isDrafted ? `Venduto a: ${teamName}` : 'Disponibile';
                const playerType = player.type || 'N/A'; // Assicurati che il tipo esista

                playersHtml += `
                    <div class="player-item flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-gray-600 hover:border-yellow-500 transition duration-150">
                        <!-- Dati Giocatore -->
                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${player.name} <span class="text-yellow-400">(${player.role} - ${playerType})</span></p>
                            <p class="text-sm text-gray-400">Età: ${player.age} | Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${player.cost} CS</p>
                        </div>
                        
                        <!-- Stato e Azioni -->
                        <div class="flex items-center space-x-3 w-full sm:w-auto">
                            <span class="text-xs font-semibold px-2 py-1 rounded-full ${statusClass} text-white">${statusText}</span>
                            
                            <button data-player-id="${playerId}" data-action="delete"
                                    class="delete-player-btn bg-red-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-red-700 transition duration-150 transform hover:scale-105">
                                Elimina
                            </button>
                        </div>
                    </div>
                `;
            });
            
            playersListContainer.innerHTML = playersHtml;
            playersListContainer.addEventListener('click', handlePlayerAction); // Cabla l'eliminazione

        } catch (error) {
            console.error("Errore nel caricamento dei giocatori Draft:", error);
            playersListContainer.innerHTML = `<p class="text-center text-red-500">Errore di caricamento: ${error.message}</p>`;
        }
    };
    
    /**
     * Gestisce le azioni sui giocatori (es. eliminazione).
     */
    const handlePlayerAction = async (event) => {
        const target = event.target;
        
        // Gestisce il click sul pulsante Elimina
        if (target.dataset.action === 'delete') {
            // Logica di pre-conferma
            target.textContent = 'CONFERMA?';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        // Gestisce la conferma dell'eliminazione
        if (target.dataset.action === 'confirm-delete') {
            const playerIdToDelete = target.dataset.playerId;
            const { doc, deleteDoc } = firestoreTools;

            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const playerDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerIdToDelete);
                await deleteDoc(playerDocRef);

                // Rimuove l'elemento dalla lista e ricarica i dati
                target.closest('.player-item').remove();
                loadDraftPlayers(); 
                
                displayMessage('Giocatore eliminato con successo!', 'success', 'player-creation-message');

            } catch (error) {
                console.error(`Errore durante l'eliminazione del giocatore ${playerIdToDelete}:`, error);
                displayMessage(`Errore durante l'eliminazione: ${error.message}`, 'error', 'player-creation-message');
            }
        }
    };


    /**
     * Gestisce l'apertura/chiusura del Draft e aggiorna Firestore.
     */
    const handleToggleDraft = async (event) => {
        const target = event.target;
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        const currentlyOpen = target.dataset.isOpen === 'true';
        const newState = !currentlyOpen;
        
        target.textContent = 'Aggiornamento...';
        target.disabled = true;
        displayMessage('Aggiornamento stato Draft in corso...', 'info', 'draft-toggle-message');

        try {
            await setDoc(configDocRef, { isDraftOpen: newState }, { merge: true });
            
            displayMessage(`Stato Draft aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'draft-toggle-message');
            
            // Aggiorna l'UI del pulsante senza ricaricare l'intero pannello
            target.dataset.isOpen = newState;
            target.textContent = newState ? 'CHIUDI Mercato' : 'APRI Mercato';
            
            const statusBox = target.closest('div');
            const statusText = document.getElementById('draft-status-text');

            statusText.textContent = newState ? 'DRAFT APERTO' : 'DRAFT CHIUSO';
            statusBox.classList.remove(newState ? 'border-red-500' : 'border-green-500', newState ? 'bg-red-900' : 'bg-green-900');
            statusBox.classList.add(newState ? 'border-green-500' : 'border-red-500', newState ? 'bg-green-900' : 'bg-red-900');
            target.classList.remove(newState ? 'bg-green-600' : 'bg-red-600', newState ? 'hover:bg-green-700' : 'hover:bg-red-700');
            target.classList.add(newState ? 'bg-red-600' : 'bg-green-600', newState ? 'hover:bg-red-700' : 'hover:bg-red-700');

        } catch (error) {
            console.error("Errore nell'aggiornamento dello stato Draft:", error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'draft-toggle-message');
        } finally {
            target.disabled = false;
        }
    };


    // -------------------------------------------------------------------
    // MODALITÀ UTENTE: ACQUISTO GIOCATORI
    // -------------------------------------------------------------------

    const renderUserDraftPanel = async () => {
        draftBackButton.textContent = "Torna alla Dashboard";
        draftBackButton.onclick = () => window.showScreen(appContent);

        draftToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato mercato...</p>`;
        
        const { doc, getDoc, collection, getDocs } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);

        try {
            const configDoc = await getDoc(configDocRef);
            const isDraftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;

            if (isDraftOpen) {
                // DRAFT APERTO
                const playersSnapshot = await getDocs(playersCollectionRef);
                const availablePlayers = playersSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(player => !player.isDrafted); // Mostra solo i non ancora acquistati

                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-green-500 shadow-xl space-y-4">
                        <p class="text-center text-2xl font-extrabold text-green-400">MERCATO APERTO! Acquista ora.</p>
                        <p class="text-center text-lg text-gray-300">Giocatori disponibili: ${availablePlayers.length}</p>
                    </div>

                    <div id="available-players-list" class="mt-6 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                        ${availablePlayers.length > 0 
                            ? availablePlayers.map(player => `
                                <div class="flex justify-between items-center p-3 bg-gray-600 rounded-lg border border-yellow-500">
                                    <div>
                                        <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni) <span class="text-red-300">(${player.type || 'N/A'})</span></p>
                                        <p class="text-sm text-yellow-300">Livello: ${player.levelRange[0]}-${player.levelRange[1]} | Costo: ${player.cost} CS</p>
                                    </div>
                                    <button data-player-id="${player.id}" 
                                            data-player-cost="${player.cost}"
                                            data-player-level-min="${player.levelRange[0]}"
                                            data-player-level-max="${player.levelRange[1]}"
                                            data-player-name="${player.name}"
                                            data-player-role="${player.role}"
                                            data-player-age="${player.age}"
                                            data-player-type="${player.type}"
                                            data-action="buy"
                                            class="bg-yellow-500 text-gray-900 text-sm px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition duration-150">
                                        Acquista (${player.cost} CS)
                                    </button>
                                </div>
                            `).join('')
                            : '<p class="text-center text-red-400 font-semibold">Nessun calciatore disponibile al momento. Aspetta l\'inserimento di nuovi giocatori.</p>'
                        }
                    </div>
                    <p id="user-draft-message" class="text-center mt-3 text-red-400"></p>
                `;
                
                document.getElementById('available-players-list').addEventListener('click', handleUserDraftAction);

            } else {
                // DRAFT CHIUSO
                draftToolsContainer.innerHTML = `
                    <div class="p-6 bg-gray-700 rounded-lg border-2 border-red-500 shadow-xl">
                        <p class="text-center text-2xl font-extrabold text-red-400">MERCATO CHIUSO.</p>
                        <p class="text-center text-lg text-gray-300 mt-2">Non è possibile acquistare giocatori al momento. Attendi che l'Admin apra il Draft.</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error("Errore nel caricamento Draft Utente:", error);
            draftToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore nel caricamento del Draft. Riprova più tardi.</p>`;
        }
    };
    
    /**
     * Gestisce l'azione di acquisto di un giocatore (Utente).
     * @param {Event} event 
     */
    const handleUserDraftAction = async (event) => {
        const target = event.target;
        const userDraftMessage = document.getElementById('user-draft-message');
        
        if (target.dataset.action === 'buy') {
            const playerId = target.dataset.playerId;
            const playerCost = parseInt(target.dataset.playerCost);
            const levelMin = parseInt(target.dataset.playerLevelMin);
            const levelMax = parseInt(target.dataset.playerLevelMax);

            // Raccogli gli altri dati necessari per la rosa
            const playerName = target.dataset.playerName;
            const playerRole = target.dataset.playerRole;
            const playerAge = parseInt(target.dataset.playerAge);
            const playerType = target.dataset.playerType; // NUOVO: Tipo

            userDraftMessage.textContent = `Acquisto di ${playerName} in corso...`;
            displayMessage(userDraftMessage.textContent, 'info', 'user-draft-message');
            target.disabled = true;

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const playerDraftDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);

                // 1. Ottieni i dati attuali della squadra
                const teamDoc = await getDoc(teamDocRef);
                if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

                const teamData = teamDoc.data();
                const currentBudget = teamData.budget || 0;
                const currentPlayers = teamData.players || [];
                
                // 2. Verifica Budget
                if (currentBudget < playerCost) {
                    throw new Error("Crediti Seri insufficienti.");
                }

                // 3. Assegna Livello Casuale
                const finalLevel = getRandomInt(levelMin, levelMax);
                
                // 4. Prepara il Giocatore per la Rosa della Squadra
                const playerForSquad = {
                    id: playerId, 
                    name: playerName,
                    role: playerRole,
                    age: playerAge,
                    cost: playerCost,
                    level: finalLevel, // Livello acquisito
                    type: playerType, // NUOVO: Tipo
                    isCaptain: false // Assicurati che non sia il capitano di default
                };

                // 5. Aggiorna Firestore
                
                // Transazione 1: Aggiorna il documento della squadra (Aggiunge giocatore e sottrae budget)
                await updateDoc(teamDocRef, {
                    budget: currentBudget - playerCost,
                    players: [...currentPlayers, playerForSquad]
                });

                // Transazione 2: Aggiorna il documento del giocatore Draft (Segna come venduto)
                await updateDoc(playerDraftDocRef, {
                    isDrafted: true,
                    teamId: currentTeamId,
                });

                displayMessage(`Acquisto Riuscito! ${playerName} (${finalLevel}) è nella tua rosa. Budget: ${currentBudget - playerCost} CS.`, 'success', 'user-draft-message');
                
                // Ricarica la lista per mostrare che il giocatore non è più disponibile
                renderUserDraftPanel();
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante l'acquisto:", error);
                displayMessage(`Acquisto Fallito: ${error.message}`, 'error', 'user-draft-message');
                target.disabled = false; // Riattiva il pulsante in caso di fallimento
            }
        }
    };


    // -------------------------------------------------------------------
    // FUNZIONI CONDIVISE (ADMIN MODE)
    // -------------------------------------------------------------------

    /**
     * Gestisce la creazione e validazione del nuovo calciatore.
     */
    const handleCreatePlayer = async () => {
        playerCreationMessage.textContent = '';
        
        // 1. Raccogli i valori
        const name = document.getElementById('player-name').value.trim();
        const role = document.getElementById('player-role').value;
        const type = document.getElementById('player-type').value; // NUOVO: Tipo
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);
        const cost = parseInt(document.getElementById('player-cost').value);
        
        // ... (Validazione) ...
        if (!name || !role || !type || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) || isNaN(cost) || age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 || levelMin > levelMax || cost < 1) {
             displayMessage("Errore: controlla che tutti i campi (incluso Tipologia) siano compilati e validi (Età 15-50, Livello 1-20, LivMin <= LivMax, Costo >= 1).", 'error');
             return;
        }


        // 2. Crea l'oggetto calciatore
        const newPlayer = {
            name,
            role,
            type, // NUOVO: Tipo
            age,
            levelRange: [levelMin, levelMax],
            cost,
            isDrafted: false, 
            teamId: null,      
            creationDate: new Date().toISOString()
        };
        
        // 3. Salvataggio su Firestore
        try {
            const { collection, addDoc } = firestoreTools;
            const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
            await addDoc(playersCollectionRef, newPlayer);
            
            displayMessage(`Calciatore ${name} aggiunto al Draft con successo!`, 'success');
            
            // Aggiorna la lista dopo l'aggiunta
            loadDraftPlayers();

        } catch (error) {
            console.error("Errore nel salvataggio del calciatore:", error);
            displayMessage(`Errore di salvataggio: ${error.message}`, 'error');
        }

        // Pulisci i campi
        document.getElementById('player-name').value = '';
        document.getElementById('player-role').value = '';
        document.getElementById('player-type').value = ''; // Pulisci il tipo
        document.getElementById('player-age').value = '';
        document.getElementById('player-level-min').value = '';
        document.getElementById('player-level-max').value = '';
        document.getElementById('player-cost').value = '';
    };
    
    /**
     * Genera e riempie i campi del modulo con dati casuali (tranne il Nome).
     */
    const handleRandomPlayer = () => {
        // Pulisci i messaggi precedenti
        displayMessage("", 'success'); 
        
        // 1. Genera valori casuali
        const roles = ['P', 'D', 'C', 'A'];
        const types = ['Potenza', 'Tecnica', 'Velocita']; // Lista di tipi
        
        const randomRole = roles[getRandomInt(0, roles.length - 1)];
        const randomType = types[getRandomInt(0, types.length - 1)]; // Tipo casuale
        const randomAge = getRandomInt(18, 35); 
        
        const randomLevelMax = getRandomInt(10, 20); 
        const randomLevelMin = getRandomInt(1, randomLevelMax); 
        
        const randomCost = getRandomInt(20, 150); 

        // 2. Inserisci i valori nei campi
        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-type').value = randomType; // Inserisci il tipo
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;
        document.getElementById('player-cost').value = randomCost;
        
        displayMessage("Campi riempiti con valori casuali. Inserisci il Nome e aggiungi al Draft.", 'info');
    };
    


    // Ascolta l'evento lanciato da admin.js o interfaccia.js per caricare il pannello
    document.addEventListener('draftPanelLoaded', initializeDraftPanel);
});