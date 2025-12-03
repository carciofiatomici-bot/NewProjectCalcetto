//
// ====================================================================
// CONTENUTO DEL MODULO ADMIN.JS (Logica Amministrazione)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi UI
    const adminContent = document.getElementById('admin-content');
    const adminDashboardContainer = document.getElementById('admin-dashboard-container');
    const adminLogoutButton = document.getElementById('admin-logout-button');
    const championshipContent = document.getElementById('championship-content');
    const playerManagementContent = document.getElementById('player-management-content'); 
    const playerManagementToolsContainer = document.getElementById('player-management-tools-container'); 
    const teamManagementContent = document.getElementById('team-management-content'); 
    const teamManagementToolsContainer = document.getElementById('team-management-tools-container'); 
    
    // Contenitore per la modale di modifica squadra (da appendere al body/main)
    const mainElement = document.querySelector('main');

    // Variabili per i servizi Firebase
    let db;
    let firestoreTools;
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH; 
    let MARKET_PLAYERS_COLLECTION_PATH; 
    let CHAMPIONSHIP_CONFIG_PATH; 
    let teamsListContainer; // Ora punta al contenitore nel pannello team management
    let modalInstance = null; 
    
    const CONFIG_DOC_ID = 'settings';
    // Accesso alla funzione globale getRandomInt (assumiamo sia esposta in interfaccia.js)
    const getRandomInt = window.getRandomInt || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min); 
    
    const displayMessage = (message, type, elementId) => {
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
     * Inizializza le variabili e gli ascoltatori una volta che l'admin ha effettuato il login.
     */
    const initializeAdminPanel = () => {
        if (typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
            console.error("Servizi Firebase o showScreen non disponibili per il pannello Admin.");
            return;
        }
        
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        // Definisci tutti i percorsi
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;


        console.log(`Pannello Admin inizializzato.`);
        
        // Aggiungi listener ai pulsanti di ritorno dei pannelli secondari
        if (document.getElementById('player-management-back-button')) {
            document.getElementById('player-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }
        if (document.getElementById('team-management-back-button')) {
             document.getElementById('team-management-back-button').addEventListener('click', () => {
                 window.showScreen(adminContent);
            });
        }


        renderAdminDashboardLayout();

        adminLogoutButton.addEventListener('click', handleAdminLogout);
    };

    /**
     * Disegna la Dashboard Admin principale (solo navigazione e riepilogo stati).
     */
    const renderAdminDashboardLayout = async () => {
        
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;
        let marketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;

        adminDashboardContainer.innerHTML = `
            <!-- Pulsanti Navigazione Principale -->
            <div class="mb-6 space-y-4">
                <div class="grid grid-cols-3 gap-4"> <!-- Modificato in 3 colonne -->
                    <button id="btn-championship-settings"
                            class="bg-orange-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-cog mr-2"></i> Impostazioni Campionato
                    </button>
                    <!-- Naviga a Gestione Giocatori -->
                    <button id="btn-player-management"
                            class="bg-yellow-600 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-yellow-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-list-ol mr-2"></i> Gestione Giocatori
                    </button>
                    <!-- Naviga a Gestione Squadre -->
                    <button id="btn-team-management"
                            class="bg-blue-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-blue-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-users mr-2"></i> Gestione Squadre
                    </button>
                </div>
            </div>

            <!-- SEZIONE STATI APERTO/CHIUSO SEPARATI (RIEPILOGO) -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">Riepilogo Stato Mercato & Draft</h3>
            <p id="toggle-status-message" class="text-center mt-3 mb-6 text-red-400"></p>
            <div class="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
                <!-- STATO DRAFT RIEPILOGO -->
                <div class="p-3 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block">Draft: <span class="font-extrabold" id="draft-status-text-summary">${draftOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                </div>

                <!-- STATO MERCATO RIEPILOGO -->
                <div class="p-3 rounded-lg border ${marketOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block">Mercato: <span class="font-extrabold" id="market-status-text-summary">${marketOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                </div>
            </div>
            
            <!-- Pulsanti di Sincronizzazione Rimanenti (Opzionali) -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2 pt-6">Utilità Admin</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
                 <button id="btn-sync-data"
                        class="bg-red-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-600 transition duration-150">
                    Sincronizza Dati Calciatori (Mock)
                </button>
                <div class="text-gray-400 text-sm flex items-center justify-center">
                    (Altre utilità qui)
                </div>
            </div>
        `;
        
        // Cabla gli eventi sui pulsanti principali generati
        setupAdminDashboardEvents();
    };
    
    /**
     * Renderizza il pannello di Gestione Calciatori (Creazione e Liste).
     */
    const renderPlayerManagementPanel = async () => {
         window.showScreen(playerManagementContent);
         
         // Carica gli stati attuali di Draft e Mercato per la visualizzazione qui
        const { doc, getDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const configDoc = await getDoc(configDocRef);
        let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;
        let marketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;
         
         playerManagementToolsContainer.innerHTML = `
            <!-- SEZIONE STATI APERTO/CHIUSO SEPARATI -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">Controllo Stato Mercato & Draft</h3>
            <div class="grid grid-cols-2 gap-4 mb-6">
                <!-- STATO DRAFT -->
                <div class="p-4 rounded-lg border ${draftOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block mb-2">Stato Draft: <span id="draft-status-text" class="font-extrabold">${draftOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                    <button id="btn-toggle-draft" 
                            data-type="draft"
                            data-is-open="${draftOpen}"
                            class="w-full px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${draftOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${draftOpen ? 'CHIUDI Draft' : 'APRI Draft'}
                    </button>
                </div>

                <!-- STATO MERCATO -->
                <div class="p-4 rounded-lg border ${marketOpen ? 'border-green-500 bg-green-900' : 'border-red-500 bg-red-900'}">
                    <span class="font-bold text-lg text-white block mb-2">Stato Mercato: <span id="market-status-text" class="font-extrabold">${marketOpen ? 'APERTO' : 'CHIUSO'}</span></span>
                    <button id="btn-toggle-market" 
                            data-type="market"
                            data-is-open="${marketOpen}"
                            class="w-full px-4 py-2 rounded-lg font-semibold shadow-md transition duration-150 ${marketOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white">
                        ${marketOpen ? 'CHIUDI Mercato' : 'APRI Mercato'}
                    </button>
                </div>
            </div>
            <p id="toggle-status-message" class="text-center mt-3 mb-6 text-red-400"></p>


            <!-- SEZIONE CREAZIONE CALCIATORE -->
            <h3 class="text-2xl font-bold text-yellow-400 mb-4 border-b border-gray-600 pb-2 pt-4">Crea Nuovo Calciatore</h3>
            <div class="p-6 bg-gray-700 rounded-lg space-y-4 mb-6">
                
                 <!-- SELETTORE COLLEZIONE -->
                 <div class="flex flex-col">
                     <label class="text-gray-300 mb-1 font-semibold" for="target-collection">Destinazione Giocatore</label>
                     <select id="target-collection" 
                             class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white focus:ring-yellow-400">
                         <option value="draft">Draft (Selezione a Turni)</option>
                         <option value="market">Mercato (Acquisto Libero)</option>
                     </select>
                     <p class="text-xs text-gray-400 mt-1">Scegli dove aggiungere il giocatore: Draft (DraftPlayers) o Mercato (MarketPlayers).</p>
                 </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Campi Giocatore (Nome, Ruolo, Età, Livelli, Costo) -->
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-name">Nome</label>
                        <input type="text" id="player-name" placeholder="Es: Barella" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-role">Ruolo</label>
                        <select id="player-role" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                            <option value="">Seleziona Ruolo</option><option value="P">P (Portiere)</option><option value="D">D (Difensore)</option><option value="C">C (Centrocampista)</option><option value="A">A (Attaccante)</option>
                        </select>
                    </div>
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-age">Età (15 - 50)</label>
                        <input type="number" id="player-age" min="15" max="50" placeholder="25" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-min">Liv Minimo (1 - 20)</label>
                        <input type="number" id="player-level-min" min="1" max="20" placeholder="10" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-level-max">Liv Massimo (1 - 20)</label>
                        <input type="number" id="player-level-max" min="1" max="20" placeholder="18" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>
                    <div class="flex flex-col">
                        <label class="text-gray-300 mb-1" for="player-cost">Costo (Crediti Seri)</label>
                        <input type="number" id="player-cost" min="1" placeholder="50" class="p-2 rounded-lg bg-gray-600 border border-yellow-600 text-white">
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <button id="btn-random-player"
                            class="bg-purple-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-purple-500 transition duration-150">
                        Crea Giocatore Casuale
                    </button>
                    <button id="btn-create-player"
                            class="bg-green-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-green-400 transition duration-150">
                        Aggiungi Calciatore
                    </button>
                </div>
                
                <p id="player-creation-message" class="text-center mt-3 text-red-400"></p>
            </div>
            
            <!-- SEZIONE LISTE GIOCATORI -->
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2 pt-6">Elenco Giocatori (Draft & Mercato)</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Draft Players List -->
                <div class="p-4 bg-gray-700 rounded-lg border border-yellow-500">
                    <h4 class="text-xl font-bold text-yellow-400 mb-3">Giocatori Draft</h4>
                    <div id="draft-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="draft">
                         <p class="text-gray-500 text-center">Caricamento Draft...</p>
                    </div>
                </div>
                
                <!-- Market Players List -->
                <div class="p-4 bg-gray-700 rounded-lg border border-blue-500">
                    <h4 class="text-xl font-bold text-blue-400 mb-3">Giocatori Mercato</h4>
                    <div id="market-players-list" class="space-y-3 max-h-96 overflow-y-auto" data-collection="market">
                         <p class="text-gray-500 text-center">Caricamento Mercato...</p>
                    </div>
                </div>
            </div>
         `;
         
         // Cabla i listener specifici per questo pannello DOPO l'iniezione HTML
         setupPlayerManagementEvents();
         
         // Inizializza le liste
         loadDraftPlayersAdmin();
         loadMarketPlayersAdmin();
    };

    /**
     * Renderizza il pannello di Gestione Squadre (Liste, Modifica, Toggle).
     */
    const renderTeamManagementPanel = async () => {
        window.showScreen(teamManagementContent);
        
        teamManagementToolsContainer.innerHTML = `
            <h3 class="text-2xl font-bold text-blue-400 mb-4 border-b border-gray-600 pb-2 pt-4">Elenco Squadre Registrate</h3>
            <p class="text-xs text-gray-400 mb-4">Gestisci le squadre, i loro budget e lo stato di partecipazione al campionato.</p>
            
            <!-- Pulsanti Utilità -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                 <button id="btn-mock-action"
                        class="w-full bg-red-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-600 transition duration-150">
                    Azione Mock
                </button>
                
                 <button id="btn-refresh-teams-management"
                        class="w-full bg-gray-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-gray-400 transition duration-150">
                    Ricarica Lista Squadre
                </button>
            </div>

            <!-- Contenitore Lista Squadre -->
            <div id="teams-list-container-management" class="space-y-3">
                <p class="text-gray-400 text-center">Caricamento in corso...</p>
            </div>
        `;
        
        // 1. Assegna il contenitore delle squadre per la gestione
        teamsListContainer = document.getElementById('teams-list-container-management');
        
        // 2. Cabla gli eventi specifici del pannello Squadre
        document.getElementById('btn-refresh-teams-management').addEventListener('click', loadTeams);
        // 3. Utilizziamo un event listener delegato per la lista squadre
        if (teamsListContainer) teamsListContainer.addEventListener('click', handleTeamAction);
        
        // 4. Carica le squadre
        loadTeams();
    };


    /**
     * Cabla gli eventi per la Dashboard Admin principale.
     */
    const setupAdminDashboardEvents = () => {
        // Navigazione al pannello Impostazioni Campionato
        const btnChampionshipSettings = document.getElementById('btn-championship-settings');
        if (btnChampionshipSettings) btnChampionshipSettings.addEventListener('click', () => {
             if (window.showScreen) {
                 window.showScreen(championshipContent);
                 document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
             }
        });
        
        // Navigazione al pannello Gestione Giocatori
        const btnPlayerManagement = document.getElementById('btn-player-management');
        if (btnPlayerManagement) btnPlayerManagement.addEventListener('click', renderPlayerManagementPanel); 

        // Navigazione al pannello Gestione Squadre (NUOVO)
        const btnTeamManagement = document.getElementById('btn-team-management');
        if (btnTeamManagement) btnTeamManagement.addEventListener('click', renderTeamManagementPanel);
        
        // Logica pulsanti Utilità (solo nella Dashboard principale)
        const btnSyncData = document.getElementById('btn-sync-data');
        if (btnSyncData) btnSyncData.addEventListener('click', () => {
             displayMessage("Sincronizzazione dati in corso... (Mock)", 'info', 'toggle-status-message');
             setTimeout(() => displayMessage("Dati sincronizzati.", 'success', 'toggle-status-message'), 1500);
        });
    };
    
    /**
     * Cabla gli eventi per il Pannello Gestione Giocatori (Creation/Lists).
     */
    const setupPlayerManagementEvents = () => {
        
        // PULSANTI DI TOGGLE
        const btnToggleDraft = document.getElementById('btn-toggle-draft');
        if (btnToggleDraft) btnToggleDraft.addEventListener('click', handleToggleState);
        
        const btnToggleMarket = document.getElementById('btn-toggle-market');
        if (btnToggleMarket) btnToggleMarket.addEventListener('click', handleToggleState);
        
        // CREAZIONE GIOCATORI
        const btnRandomPlayer = document.getElementById('btn-random-player');
        if (btnRandomPlayer) btnRandomPlayer.addEventListener('click', handleRandomPlayer);
        
        const btnCreatePlayer = document.getElementById('btn-create-player');
        if (btnCreatePlayer) btnCreatePlayer.addEventListener('click', handleCreatePlayer);
        
        // Gestione Eliminazione Giocatori dal pannello Giocatori
        const draftList = document.getElementById('draft-players-list');
        const marketList = document.getElementById('market-players-list');

        if (draftList) draftList.addEventListener('click', (e) => handlePlayerAction(e, DRAFT_PLAYERS_COLLECTION_PATH));
        if (marketList) marketList.addEventListener('click', (e) => handlePlayerAction(e, MARKET_PLAYERS_COLLECTION_PATH));
    };

    /**
     * Gestisce l'eliminazione dei giocatori dal Draft o dal Mercato.
     * @param {Event} event 
     * @param {string} collectionPath - DRAFT_PLAYERS_COLLECTION_PATH o MARKET_PLAYERS_COLLECTION_PATH
     */
    const handlePlayerAction = async (event, collectionPath) => {
        const target = event.target;
        
        if (target.dataset.action === 'delete') {
            target.textContent = 'CONFERMA?';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (target.dataset.action === 'confirm-delete') {
            const playerIdToDelete = target.dataset.playerId;
            const collectionName = collectionPath.includes('market') ? 'Mercato' : 'Draft';
            const { doc, deleteDoc } = firestoreTools;

            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const playerDocRef = doc(db, collectionPath, playerIdToDelete);
                await deleteDoc(playerDocRef);

                // Rimuove l'elemento dalla lista
                target.closest('.player-item').remove();
                displayMessage(`Giocatore eliminato dal ${collectionName}!`, 'success', 'player-creation-message');
                
                // Ricarica la lista corretta
                if (collectionPath === DRAFT_PLAYERS_COLLECTION_PATH) {
                     loadDraftPlayersAdmin();
                } else {
                     loadMarketPlayersAdmin();
                }

            } catch (error) {
                console.error(`Errore durante l'eliminazione del giocatore ${playerIdToDelete} dal ${collectionName}:`, error);
                displayMessage(`Errore durante l'eliminazione dal ${collectionName}: ${error.message}`, 'error', 'player-creation-message');
            }
        }
    };


    /**
     * Gestisce l'apertura/chiusura degli stati separati (Draft o Mercato).
     */
    const handleToggleState = async (event) => {
        const target = event.target;
        const stateType = target.dataset.type; // 'draft' o 'market'
        const key = stateType === 'draft' ? 'isDraftOpen' : 'isMarketOpen';
        const statusTextId = stateType === 'draft' ? 'draft-status-text' : 'market-status-text';
        
        const { doc, setDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);

        const currentlyOpen = target.dataset.isOpen === 'true';
        const newState = !currentlyOpen;
        
        target.textContent = 'Aggiornamento...';
        target.disabled = true;
        displayMessage(`Aggiornamento stato ${stateType}...`, 'info', 'toggle-status-message');

        try {
            // Aggiorna solo la chiave specifica nel documento di configurazione
            await setDoc(configDocRef, { [key]: newState }, { merge: true });
            
            displayMessage(`Stato ${stateType} aggiornato: ${newState ? 'APERTO' : 'CHIUSO'}`, 'success', 'toggle-status-message');
            
            // Aggiorna l'UI del pulsante e dello stato
            target.dataset.isOpen = newState;
            target.textContent = newState ? `CHIUDI ${stateType}` : `APRI ${stateType}`;
            
            const statusBox = target.closest('div');
            const statusText = document.getElementById(statusTextId);

            statusText.textContent = newState ? 'APERTO' : 'CHIUSO';
            statusBox.classList.remove(newState ? 'border-red-500' : 'border-green-500', newState ? 'bg-red-900' : 'bg-green-900');
            statusBox.classList.add(newState ? 'border-green-500' : 'border-red-500', newState ? 'bg-green-900' : 'bg-red-900');
            target.classList.remove(newState ? 'bg-green-600' : 'bg-red-600', newState ? 'hover:bg-green-700' : 'hover:bg-red-700');
            target.classList.add(newState ? 'bg-red-600' : 'bg-green-600', newState ? 'hover:bg-red-700' : 'hover:bg-red-700');
            
            // Aggiorna anche il riepilogo nella Dashboard Admin principale
            const summaryText = document.getElementById(`${stateType}-status-text-summary`);
            if (summaryText) summaryText.textContent = newState ? 'APERTO' : 'CHIUSO';

        } catch (error) {
            console.error(`Errore nell'aggiornamento dello stato ${stateType}:`, error);
            displayMessage(`Errore durante l'aggiornamento: ${error.message}`, 'error', 'toggle-status-message');
        } finally {
            target.disabled = false;
        }
    };

    /**
     * Carica i giocatori del Draft (Collezione `draftPlayers`).
     */
    const loadDraftPlayersAdmin = async () => {
        const { collection, getDocs, query } = firestoreTools;
        const playersListContainer = document.getElementById('draft-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-yellow-400">Caricamento Draft...</p>';

        try {
            const playersCollectionRef = collection(db, DRAFT_PLAYERS_COLLECTION_PATH);
            const querySnapshot = await getDocs(query(playersCollectionRef)); 
            
            const playersHtml = querySnapshot.docs.map(doc => {
                const player = doc.data();
                const playerId = doc.id;
                const status = player.isDrafted ? `<span class="text-red-400">Venduto a ${player.teamId}</span>` : `<span class="text-green-400">Disponibile</span>`;
                return `
                    <div class="player-item flex justify-between items-center p-2 bg-gray-600 rounded-lg text-white">
                        <div>
                            <p class="font-semibold">${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | ${status}</p>
                        </div>
                        <button data-player-id="${playerId}" data-action="delete"
                                class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                            Elimina
                        </button>
                    </div>
                `;
            }).join('');
            
            playersListContainer.innerHTML = playersHtml || '<p class="text-center text-gray-400">Nessun giocatore Draft.</p>';

        } catch (error) {
            console.error("Errore nel caricamento Draft:", error);
            playersListContainer.innerHTML = `<p class="text-center text-red-500">Errore: ${error.message}</p>`;
        }
    };
    
    /**
     * Carica i giocatori del Mercato (Collezione `marketPlayers`).
     */
    const loadMarketPlayersAdmin = async () => {
        const { collection, getDocs, query } = firestoreTools;
        const playersListContainer = document.getElementById('market-players-list');
        if (!playersListContainer) return;

        playersListContainer.innerHTML = '<p class="text-center text-blue-400">Caricamento Mercato...</p>';

        try {
            const playersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
            const querySnapshot = await getDocs(query(playersCollectionRef));

            const playersHtml = querySnapshot.docs.map(doc => {
                const player = doc.data();
                const playerId = doc.id;
                const status = player.isDrafted ? `<span class="text-red-400">Venduto a ${player.teamId}</span>` : `<span class="text-green-400">Disponibile</span>`;
                return `
                    <div class="player-item flex justify-between items-center p-2 bg-gray-600 rounded-lg text-white">
                        <div>
                            <p class="font-semibold">${player.name} (${player.role})</p>
                            <p class="text-xs text-gray-400">Liv: ${player.levelRange[0]}-${player.levelRange[1]} | ${status}</p>
                        </div>
                        <button data-player-id="${playerId}" data-action="delete"
                                class="bg-red-600 text-white text-xs px-2 py-1 rounded-lg hover:bg-red-700 transition duration-150">
                            Elimina
                        </button>
                    </div>
                `;
            }).join('');
            
            playersListContainer.innerHTML = playersHtml || '<p class="text-center text-gray-400">Nessun giocatore Mercato.</p>';

        } catch (error) {
            console.error("Errore nel caricamento Mercato:", error);
            playersListContainer.innerHTML = `<p class="text-center text-red-500">Errore: ${error.message}</p>`;
        }
    };


    /**
     * Gestisce la creazione e validazione del nuovo calciatore.
     */
    const handleCreatePlayer = async () => {
        const msgId = 'player-creation-message';
        displayMessage('', 'success', msgId);
        
        const targetCollection = document.getElementById('target-collection').value;
        const name = document.getElementById('player-name').value.trim();
        const role = document.getElementById('player-role').value;
        const age = parseInt(document.getElementById('player-age').value);
        const levelMin = parseInt(document.getElementById('player-level-min').value);
        const levelMax = parseInt(document.getElementById('player-level-max').value);
        const cost = parseInt(document.getElementById('player-cost').value);
        
        // Validazione
        if (!name || !role || isNaN(age) || isNaN(levelMin) || isNaN(levelMax) || isNaN(cost) || age < 15 || age > 50 || levelMin < 1 || levelMin > 20 || levelMax < 1 || levelMax > 20 || levelMin > levelMax || cost < 1) {
             displayMessage("Errore: controlla che tutti i campi siano compilati e validi (Età 15-50, Livello 1-20, LivMin <= LivMax, Costo >= 1).", 'error', msgId);
             return;
        }

        const newPlayer = {
            name, role, age, levelRange: [levelMin, levelMax], cost,
            isDrafted: false, teamId: null, creationDate: new Date().toISOString()
        };
        
        try {
            const { collection, addDoc } = firestoreTools;
            const collectionPath = targetCollection === 'draft' ? DRAFT_PLAYERS_COLLECTION_PATH : MARKET_PLAYERS_COLLECTION_PATH;
            const playersCollectionRef = collection(db, collectionPath);
            await addDoc(playersCollectionRef, newPlayer);
            
            displayMessage(`Calciatore ${name} aggiunto al ${targetCollection.toUpperCase()} con successo!`, 'success', msgId);
            
            // Aggiorna la lista corretta
            if (targetCollection === 'draft') {
                 loadDraftPlayersAdmin();
            } else {
                 loadMarketPlayersAdmin();
            }

        } catch (error) {
            console.error("Errore nel salvataggio del calciatore:", error);
            displayMessage(`Errore di salvataggio: ${error.message}`, 'error', msgId);
        }

        // Pulisci i campi (opzionale)
        document.getElementById('player-name').value = '';
    };
    
    /**
     * Genera e riempie i campi del modulo con dati casuali (tranne il Nome).
     */
    const handleRandomPlayer = () => {
        const msgId = 'player-creation-message';
        displayMessage("", 'success', msgId); 
        
        const roles = ['P', 'D', 'C', 'A'];
        const randomRole = roles[getRandomInt(0, roles.length - 1)];
        const randomAge = getRandomInt(18, 35); 
        
        const randomLevelMax = getRandomInt(10, 20); 
        const randomLevelMin = getRandomInt(1, randomLevelMax); 
        
        const randomCost = getRandomInt(20, 150); 

        document.getElementById('player-role').value = randomRole;
        document.getElementById('player-age').value = randomAge;
        document.getElementById('player-level-min').value = randomLevelMin;
        document.getElementById('player-level-max').value = randomLevelMax;
        document.getElementById('player-cost').value = randomCost;
        
        displayMessage("Campi riempiti con valori casuali. Inserisci il Nome e aggiungi.", 'info', msgId);
    };

    
    /**
     * Carica tutte le squadre dalla collezione Firestore e le renderizza.
     */
    const loadTeams = async () => {
        const { collection, getDocs } = firestoreTools;
        if (!teamsListContainer) return;

        teamsListContainer.innerHTML = '<p class="text-center text-gray-400">Caricamento squadre...</p>';

        try {
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const q = teamsCollectionRef;
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                teamsListContainer.innerHTML = '<p class="text-center text-red-400 font-semibold">Nessuna squadra registrata al momento.</p>';
                return;
            }

            let teamsHtml = '';
            querySnapshot.forEach(doc => {
                const teamData = doc.data();
                const teamId = doc.id;
                const isParticipating = teamData.isParticipating || false;
                
                const date = teamData.creationDate ? new Date(teamData.creationDate).toLocaleDateString('it-IT') : 'N/A';
                
                const checkboxColorClasses = isParticipating ? 'bg-green-500 border-green-500' : 'bg-gray-700 border-gray-500';

                teamsHtml += `
                    <div class="team-item flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-blue-500 transition duration-150">
                        <!-- Flag di Partecipazione -->
                        <div class="flex items-center space-x-4 mb-2 sm:mb-0">
                            <input type="checkbox" id="participating-${teamId}" data-team-id="${teamId}" data-action="toggle-participation"
                                   class="form-checkbox h-5 w-5 rounded transition duration-150 ease-in-out ${checkboxColorClasses}"
                                   ${isParticipating ? 'checked' : ''}>
                            <label for="participating-${teamId}" class="text-gray-300 font-bold">Partecipa al Campionato</label>
                        </div>

                        <!-- Dati Squadra -->
                        <div class="w-full sm:w-auto mb-2 sm:mb-0">
                            <p class="text-lg font-bold text-white">${teamData.teamName}</p>
                            <p class="text-xs text-gray-400">ID: ${teamId}</p>
                            <p class="text-sm text-gray-400">Budget: ${teamData.budget} Crediti Seri | Rosa: ${teamData.players.length} gioc. | Creazione: ${date}</p>
                        </div>
                        
                        <!-- Pulsanti Azioni -->
                        <div class="flex space-x-2 mt-2 sm:mt-0">
                            <button data-team-id="${teamId}" data-action="edit"
                                    class="bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 transform hover:scale-105">
                                Modifica
                            </button>
                            <button data-team-id="${teamId}" data-action="delete"
                                    class="delete-btn bg-red-600 text-white font-semibold px-3 py-1 rounded-lg shadow-md hover:bg-red-700 transition duration-150 transform hover:scale-105">
                                Elimina
                            </button>
                        </div>
                    </div>
                `;
            });
            
            teamsListContainer.innerHTML = teamsHtml;

        } catch (error) {
            console.error("Errore nel caricamento delle squadre:", error);
            teamsListContainer.innerHTML = `<p class="text-center text-red-500">Errore di caricamento: ${error.message}</p>`;
        }
    };


    // ...

    /**
     * Gestisce le azioni sui bottoni delle squadre (Elimina/Modifica) e Toggle di partecipazione.
     */
    const handleTeamAction = async (event) => {
        const target = event.target;
        const teamId = target.dataset.teamId;
        const action = target.dataset.action;

        if (!teamId || !action) return;

        if (action === 'toggle-participation') {
            handleToggleParticipation(teamId, target.checked, target);
            return;
        }
        
        // Logica di ELIMINAZIONE
        if (action === 'delete') {
            // Logica di pre-conferma
            target.textContent = 'CONFERMA? (Click di nuovo)';
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-delete';
            return;
        }

        if (action === 'confirm-delete') {
            // Esegue l'eliminazione
            target.textContent = 'Eliminazione...';
            target.disabled = true;

            try {
                const { doc, deleteDoc } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                await deleteDoc(teamDocRef);

                target.closest('.team-item').remove();
                loadTeams(); // Ricarica la lista

            } catch (error) {
                console.error(`Errore durante l'eliminazione della squadra ${teamId}:`, error);
                target.textContent = 'Elimina';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.disabled = false;
                target.dataset.action = 'delete';
            }
            return;
        }
        
        // Logica di MODIFICA
        if (action === 'edit') {
            openEditTeamModal(teamId);
        }
    };

    /**
     * Aggiorna lo stato di partecipazione di una squadra su Firestore.
     */
    const handleToggleParticipation = async (teamId, isChecked, checkboxElement) => {
        const { doc, updateDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        const label = checkboxElement.closest('.team-item').querySelector('label');
        
        // Aggiorna l'UI immediatamente
        checkboxElement.disabled = true;
        label.textContent = 'Salvando...';

        try {
            await updateDoc(teamDocRef, {
                isParticipating: isChecked
            });
            
            // AGGIORNAMENTO CLASSI CORRETTO 
            if (isChecked) {
                checkboxElement.classList.remove('bg-gray-700', 'border-gray-500');
                checkboxElement.classList.add('bg-green-500', 'border-green-500');
            } else {
                checkboxElement.classList.remove('bg-green-500', 'border-green-500');
                checkboxElement.classList.add('bg-gray-700', 'border-gray-500');
            }
            
            // Aggiorna l'UI dopo il salvataggio
            label.textContent = 'Partecipa al Campionato';

        } catch (error) {
            console.error(`Errore nell'aggiornamento partecipazione per ${teamId}:`, error);
            // In caso di errore, ripristina la spunta e l'etichetta
            checkboxElement.checked = !isChecked;
            label.textContent = 'Errore di salvataggio!';
        } finally {
            checkboxElement.disabled = false;
        }
    };

    // -------------------------------------------------------------------
    // LOGICA MODALE DI MODIFICA SQUADRA
    // -------------------------------------------------------------------

    /**
     * Apre la modale per modificare la squadra.
     */
    const openEditTeamModal = async (teamId) => {
        const { doc, getDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
        
        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

            const teamData = teamDoc.data();
            renderEditTeamModal(teamId, teamData);
            
        } catch (error) {
            console.error("Errore nel caricamento dei dati per la modifica:", error);
        }
    };
    
    /**
     * Renderizza la struttura HTML della modale e la aggiunge al DOM.
     */
    const renderEditTeamModal = (teamId, teamData) => {
        // Chiude qualsiasi modale esistente
        if (modalInstance) {
            modalInstance.remove();
            modalInstance = null;
        }

        const playersJsonString = JSON.stringify(teamData.players, null, 2); 

        const modalHtml = `
            <div id="edit-team-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div class="football-box w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 class="text-3xl font-bold text-blue-400 mb-4 border-b border-blue-600 pb-2">Modifica Squadra: ${teamData.teamName}</h3>
                    <p id="edit-message" class="text-center text-sm mb-4 text-red-400"></p>

                    <form id="edit-team-form" data-team-id="${teamId}" class="space-y-4">
                        
                        <!-- Modifica Budget -->
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="edit-budget">Budget (Crediti Seri)</label>
                            <input type="number" id="edit-budget" name="budget" value="${teamData.budget}" min="0"
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white focus:ring-blue-400">
                        </div>

                        <!-- Modifica Rosa (JSON) -->
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="edit-players">Rosa Giocatori (JSON)</label>
                            <textarea id="edit-players" name="players" rows="10" 
                                class="p-3 rounded-lg bg-gray-700 border border-blue-600 text-white font-mono text-sm focus:ring-blue-400">${playersJsonString}</textarea>
                            <p class="text-xs text-gray-400 mt-1">Modifica la lista dei giocatori qui sotto (formato JSON corretto).</p>
                        </div>

                        <div class="flex justify-end space-x-4 pt-4">
                            <button type="button" id="btn-cancel-edit"
                                    class="bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 transition duration-150">
                                Annulla
                            </button>
                            <button type="submit" id="btn-save-edit"
                                    class="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-150">
                                Salva Modifiche
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        mainElement.insertAdjacentHTML('beforeend', modalHtml);
        modalInstance = document.getElementById('edit-team-modal');
        
        document.getElementById('btn-cancel-edit').addEventListener('click', closeEditTeamModal);
        document.getElementById('edit-team-form').addEventListener('submit', handleSaveTeamEdit);
    };

    /**
     * Chiude la modale di modifica se esiste.
     */
    const closeEditTeamModal = () => {
        if (modalInstance) {
            modalInstance.remove();
            modalInstance = null;
        }
    };
    
    /**
     * Gestisce il salvataggio delle modifiche della squadra.
     */
    const handleSaveTeamEdit = async (event) => {
        event.preventDefault();
        const form = event.target;
        const teamId = form.dataset.teamId;
        const budgetInput = document.getElementById('edit-budget');
        const playersInput = document.getElementById('edit-players');
        const saveButton = document.getElementById('btn-save-edit');
        const editMessage = document.getElementById('edit-message');

        let updatedPlayers;
        const updatedBudget = parseInt(budgetInput.value);

        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        editMessage.textContent = 'Validazione e salvataggio in corso...';
        editMessage.classList.remove('text-red-400');
        editMessage.classList.add('text-yellow-400');

        // 1. Validazione JSON della Rosa
        try {
            updatedPlayers = JSON.parse(playersInput.value);
            if (!Array.isArray(updatedPlayers)) {
                throw new Error("La rosa non è in formato array.");
            }
        } catch (e) {
            editMessage.textContent = `Errore di formato JSON nella rosa: ${e.message}`;
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-red-400');
            saveButton.textContent = 'Salva Modifiche';
            saveButton.disabled = false;
            return;
        }

        // 2. Aggiornamento su Firestore
        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);

            await updateDoc(teamDocRef, {
                budget: updatedBudget,
                players: updatedPlayers
            });
            
            editMessage.textContent = 'Modifiche salvate con successo!';
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-green-500');

            // Chiude la modale dopo un breve ritardo e ricarica la lista delle squadre
            setTimeout(() => {
                closeEditTeamModal();
                loadTeams(); 
            }, 1000);

        } catch (error) {
            console.error("Errore nel salvataggio delle modifiche:", error);
            editMessage.textContent = `Errore di salvataggio Firestore: ${error.message}`;
            editMessage.classList.remove('text-yellow-400');
            editMessage.classList.add('text-red-400');
            saveButton.textContent = 'Salva Modifiche';
            saveButton.disabled = false;
        }
    };
    
    /**
     * Gestisce il logout dell'Admin.
     */
    const handleAdminLogout = () => {
        console.log("Logout Admin effettuato. Torno alla schermata di login.");
        
        if (window.handleLogout) {
            window.handleLogout();
        }
    };


    // Ascolta l'evento personalizzato lanciato da interfaccia.js dopo un login admin riuscito
    document.addEventListener('adminLoggedIn', initializeAdminPanel);
    
    // Espone le funzioni di caricamento per l'aggiornamento dinamico
    window.loadDraftPlayersAdmin = loadDraftPlayersAdmin;
    window.loadMarketPlayersAdmin = loadMarketPlayersAdmin;
});