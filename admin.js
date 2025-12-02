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
    const draftContent = document.getElementById('draft-content');
    const championshipContent = document.getElementById('championship-content');
    
    // Contenitore per la modale di modifica squadra (da appendere al body/main)
    const mainElement = document.querySelector('main');

    // Variabili per i servizi Firebase
    let db;
    let firestoreTools;
    let TEAMS_COLLECTION_PATH;
    let teamsListContainer; // Variabile per il contenitore delle squadre
    let modalInstance = null; // Istanza della modale aperta

    /**
     * Inizializza le variabili e gli ascoltatori una volta che l'admin ha effettuato il login.
     */
    const initializeAdminPanel = () => {
        // Assicurati che i servizi globali siano disponibili
        if (typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
            console.error("Servizi Firebase o showScreen non disponibili per il pannello Admin.");
            return;
        }
        
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        // Definisci il percorso della collezione pubblica delle squadre
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        console.log(`Pannello Admin inizializzato. Collezione squadre: ${TEAMS_COLLECTION_PATH}`);
        
        // Renderizza la dashboard (che include i pulsanti)
        renderAdminDashboardLayout();

        // Aggiunge l'ascoltatore per il logout
        adminLogoutButton.addEventListener('click', handleAdminLogout);
    };

    /**
     * Disegna i pulsanti principali di navigazione Admin.
     */
    const renderAdminDashboardLayout = () => {
        adminDashboardContainer.innerHTML = `
            <div class="mb-6 space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <!-- Pulsante per le Impostazioni Campionato (Regole) -->
                    <button id="btn-championship-settings"
                            class="bg-orange-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-cog mr-2"></i> Impostazioni Campionato
                    </button>
                    
                    <!-- Pulsante per la Gestione Draft (Stato e Creazione Giocatori) -->
                    <button id="btn-draft-mode"
                            class="bg-yellow-600 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-yellow-500 transition duration-150 transform hover:scale-[1.01]">
                        <i class="fas fa-list-ol mr-2"></i> Gestione Draft/Mercato
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
                    <!-- Pulsante Mockup per Sincronizzazione -->
                    <button id="btn-sync-data"
                            class="bg-red-700 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-600 transition duration-150">
                        Sincronizza Dati Calciatori (Mock)
                    </button>
                    
                    <!-- Pulsante per Ricaricare le Squadre -->
                     <button id="btn-refresh-teams"
                            class="bg-gray-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-gray-400 transition duration-150">
                        Ricarica Squadre
                    </button>
                </div>
            </div>
            
            <h3 class="text-2xl font-bold text-red-400 mb-4 border-b border-gray-600 pb-2">Elenco Squadre</h3>
            <div id="teams-list-container" class="space-y-3">
                <p class="text-gray-400 text-center">Caricamento in corso...</p>
            </div>
        `;
        
        // Ri-assegna il contenitore delle squadre e ri-aggancia l'event listener
        teamsListContainer = document.getElementById('teams-list-container');
        if (teamsListContainer) {
            teamsListContainer.addEventListener('click', handleTeamAction);
        }
        
        // Cabla i pulsanti di navigazione
        document.getElementById('btn-draft-mode').addEventListener('click', () => {
             if (window.showScreen) {
                 window.showScreen(draftContent);
                 // Lancia l'evento in modalità 'admin'
                 document.dispatchEvent(new CustomEvent('draftPanelLoaded', { detail: { mode: 'admin' } })); 
             }
        });
        
        document.getElementById('btn-championship-settings').addEventListener('click', () => {
             if (window.showScreen) {
                 window.showScreen(championshipContent);
                 document.dispatchEvent(new CustomEvent('championshipPanelLoaded'));
             }
        });

        document.getElementById('btn-refresh-teams').addEventListener('click', loadTeams);

        // Carica e visualizza le squadre
        loadTeams();
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
                
                const date = teamData.creationDate ? new Date(teamData.creationDate).toLocaleDateString('it-IT') : 'N/A';

                teamsHtml += `
                    <div class="team-item flex flex-col sm:flex-row justify-between items-center p-4 bg-gray-800 rounded-lg border border-gray-600 hover:border-red-500 transition duration-150">
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

    /**
     * Gestisce le azioni sui bottoni delle squadre (Elimina/Modifica).
     */
    const handleTeamAction = async (event) => {
        const target = event.target;
        const teamId = target.dataset.teamId;
        const action = target.dataset.action;

        if (!teamId || !action) return;
        
        // Logica di ELIMINAZIONE (come prima)
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
                // In caso di errore, ripristina lo stato del pulsante
                target.textContent = 'Elimina';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.disabled = false;
                target.dataset.action = 'delete';
            }
            return;
        }
        
        // Logica di MODIFICA (NUOVA)
        if (action === 'edit') {
            openEditTeamModal(teamId);
        }
    };
    
    // -------------------------------------------------------------------
    // LOGICA MODALE DI MODIFICA SQUADRA
    // -------------------------------------------------------------------

    /**
     * Apre la modale per modificare la squadra.
     * @param {string} teamId - L'ID della squadra da modificare.
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
            // Mostra un messaggio di errore nel pannello Admin
            document.getElementById('teams-list-container').innerHTML = `<p class="text-center text-red-500">Errore nel caricamento dei dati di modifica: ${error.message}</p>`;
        }
    };
    
    /**
     * Renderizza la struttura HTML della modale e la aggiunge al DOM.
     * @param {string} teamId - L'ID della squadra.
     * @param {object} teamData - I dati attuali della squadra.
     */
    const renderEditTeamModal = (teamId, teamData) => {
        // Chiude qualsiasi modale esistente
        closeEditTeamModal();

        // Trasforma l'array di giocatori in una stringa JSON per l'editing
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

        // Aggiunge la modale al DOM (al body o main)
        mainElement.insertAdjacentHTML('beforeend', modalHtml);
        modalInstance = document.getElementById('edit-team-modal');
        
        // Cabla gli ascoltatori della modale
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
});