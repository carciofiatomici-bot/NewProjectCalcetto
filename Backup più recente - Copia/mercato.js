//
// ====================================================================
// CONTENUTO DEL MODULO MERCATO.JS (Logica Acquisto Fuori Lista)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const mercatoContent = document.getElementById('mercato-content');
    const mercatoToolsContainer = document.getElementById('mercato-tools-container');
    const mercatoBackButton = document.getElementById('mercato-back-button');
    const appContent = document.getElementById('app-content'); 
    
    // Assicurati che il contenitore tools esista
    if (mercatoContent && !mercatoContent.querySelector('#mercato-tools-container')) {
        mercatoContent.innerHTML += `<div id="mercato-tools-container" class="mt-6"></div>`;
    }

    // Variabili globali
    let db;
    let firestoreTools;
    let currentTeamId = null; 
    
    // Costanti per le collezioni
    const CONFIG_DOC_ID = 'settings'; 
    let MARKET_PLAYERS_COLLECTION_PATH; // Collezione specifica per il Mercato
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;
    
    const getRandomInt = window.getRandomInt;
    
    const displayMessage = (message, type, elementId = 'user-mercato-message') => {
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
     * Funzione principale per inizializzare il pannello Mercato.
     */
    const initializeMercatoPanel = (event) => {
        if (!event.detail || !event.detail.teamId) {
            console.error("ID Squadra non fornito per il Mercato.");
            return;
        }
        
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        // COLLEZIONE MARKET DIVERSA DAL DRAFT
        MARKET_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/marketPlayers`;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

        currentTeamId = event.detail.teamId;
        
        // Cabla il bottone di ritorno (se non è già cablato)
        if (mercatoBackButton) {
            mercatoBackButton.onclick = () => {
                if (window.showScreen && appContent) {
                    window.showScreen(appContent);
                    document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));
                }
            };
        }
        
        renderUserMercatoPanel();
    };


    /**
     * Renderizza l'interfaccia di acquisto per l'utente dal Mercato.
     */
    const renderUserMercatoPanel = async () => {
        
        const { doc, getDoc, collection, getDocs } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
        const mercatoToolsContainer = document.getElementById('mercato-tools-container');

        if (!mercatoToolsContainer) return;

        mercatoToolsContainer.innerHTML = `<p class="text-center text-gray-400">Verifica stato Mercato...</p>`;

        try {
            // 1. Carica configurazione e dati squadra
            const [configDoc, teamDoc] = await Promise.all([
                getDoc(configDocRef),
                getDoc(teamDocRef)
            ]);

            // VERIFICA STATO isMarketOpen
            const isMarketOpen = configDoc.exists() ? (configDoc.data().isMarketOpen || false) : false;
            
            if (!teamDoc.exists()) throw new Error("Dati squadra non trovati.");
            const teamData = teamDoc.data();
            const budgetRimanente = teamData.budget || 0;


            // 2. Renderizza il layout base
            mercatoToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border-2 border-blue-500 shadow-xl space-y-4">
                    <p class="text-center text-2xl font-extrabold text-white">
                        Budget: <span class="text-yellow-400">${budgetRimanente} CS</span>
                    </p>
                    <div id="mercato-status-box" class="p-4 rounded-lg text-center font-extrabold text-xl"></div>
                    <p id="user-mercato-message" class="text-center text-red-400"></p>
                </div>

                <div id="available-market-players-list" class="mt-6 space-y-3 max-h-96 overflow-y-auto p-4 bg-gray-800 rounded-lg">
                    <p class="text-gray-500 text-center">Caricamento giocatori...</p>
                </div>
            `;
            
            const statusBox = document.getElementById('mercato-status-box');
            const playersListContainer = document.getElementById('available-market-players-list');
            
            if (!isMarketOpen) {
                 statusBox.textContent = 'MERCATO CHIUSO.';
                 statusBox.classList.add('border-red-500', 'bg-red-900', 'text-red-400');
                 playersListContainer.innerHTML = '<p class="text-center text-gray-300">Non è possibile acquistare giocatori dal Mercato al momento. Attendi che l\'Admin apra il Mercato.</p>';
                 return;
            }
            
            statusBox.textContent = 'MERCATO APERTO!';
            statusBox.classList.add('border-green-500', 'bg-green-900', 'text-green-400');


            // 3. Carica i giocatori disponibili dal Mercato
            const marketPlayersCollectionRef = collection(db, MARKET_PLAYERS_COLLECTION_PATH);
            const playersSnapshot = await getDocs(marketPlayersCollectionRef);
            const availablePlayers = playersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(player => !player.isDrafted); // isDrafted significa 'già acquistato'

            
            // 4. Renderizza la lista dei giocatori
            if (availablePlayers.length > 0) {
                 playersListContainer.innerHTML = availablePlayers.map(player => {
                    const isAffordable = budgetRimanente >= player.cost;
                    const buttonClass = isAffordable ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-gray-500 text-gray-300 cursor-not-allowed';
                    const buttonText = isAffordable ? `Acquista (${player.cost} CS)` : `Costo ${player.cost} CS (No Budget)`;

                    return `
                        <div class="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-700 rounded-lg border border-blue-500">
                            <div>
                                <p class="text-white font-semibold">${player.name} (${player.role}, ${player.age} anni)</p>
                                <p class="text-sm text-blue-300">Livello: ${player.levelRange[0]}-${player.levelRange[1]}</p>
                            </div>
                            <button data-player-id="${player.id}" 
                                    data-player-cost="${player.cost}"
                                    data-player-level-min="${player.levelRange[0]}"
                                    data-player-level-max="${player.levelRange[1]}"
                                    data-player-name="${player.name}"
                                    data-player-role="${player.role}"
                                    data-player-age="${player.age}"
                                    data-action="buy-market"
                                    ${isAffordable ? '' : 'disabled'}
                                    class="text-sm px-4 py-2 rounded-lg font-bold transition duration-150 mt-2 sm:mt-0 ${buttonClass}">
                                ${buttonText}
                            </button>
                        </div>
                    `;
                 }).join('');
                 
                 playersListContainer.addEventListener('click', handleUserMercatoAction);
            } else {
                 playersListContainer.innerHTML = '<p class="text-center text-red-400 font-semibold">Nessun calciatore Mercato disponibile al momento.</p>';
            }

        } catch (error) {
            console.error("Errore nel caricamento Mercato Utente:", error);
            mercatoToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: ${error.message}</p>`;
        }
    };
    
    /**
     * Gestisce l'azione di acquisto di un giocatore (Utente) per il Mercato.
     */
    const handleUserMercatoAction = async (event) => {
        const target = event.target;
        
        if (target.dataset.action === 'buy-market' && !target.disabled) {
            const playerId = target.dataset.playerId;
            const playerCost = parseInt(target.dataset.playerCost);
            const levelMin = parseInt(target.dataset.playerLevelMin);
            const levelMax = parseInt(target.dataset.playerLevelMax);

            const playerName = target.dataset.playerName;
            const playerRole = target.dataset.playerRole;
            const playerAge = parseInt(target.dataset.playerAge);

            displayMessage(`Acquisto di ${playerName} in corso dal Mercato...`, 'info');
            target.disabled = true;

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const playerMarketDocRef = doc(db, MARKET_PLAYERS_COLLECTION_PATH, playerId);

                const teamDoc = await getDoc(teamDocRef);
                if (!teamDoc.exists()) throw new Error("Squadra non trovata.");

                const teamData = teamDoc.data();
                const currentBudget = teamData.budget || 0;
                const currentPlayers = teamData.players || [];
                
                if (currentBudget < playerCost) {
                    throw new Error("Crediti Seri insufficienti.");
                }

                const playerDoc = await getDoc(playerMarketDocRef);
                // Verifica anche che non sia già stato acquistato (isDrafted = true)
                if (!playerDoc.exists() || playerDoc.data().isDrafted) {
                     throw new Error("Il giocatore non è disponibile (già acquistato). Riprova a ricaricare.");
                }
                
                // Genera Livello Casuale
                const finalLevel = getRandomInt(levelMin, levelMax);
                
                const playerForSquad = {
                    id: playerId, 
                    name: playerName,
                    role: playerRole,
                    age: playerAge,
                    cost: playerCost,
                    level: finalLevel,
                };

                // Aggiorna Firestore: Squadra
                await updateDoc(teamDocRef, {
                    budget: currentBudget - playerCost,
                    players: [...currentPlayers, playerForSquad]
                });

                // Aggiorna Firestore: Giocatore Mercato (segnandolo come venduto)
                await updateDoc(playerMarketDocRef, {
                    isDrafted: true, 
                    teamId: currentTeamId,
                });

                displayMessage(`Acquisto Riuscito! ${playerName} (${finalLevel}) è nella tua rosa dal Mercato. Budget: ${currentBudget - playerCost} CS.`, 'success');
                
                // Ricarica la lista per mostrare che il giocatore non è più disponibile
                renderUserMercatoPanel();
                document.dispatchEvent(new CustomEvent('dashboardNeedsUpdate'));

            } catch (error) {
                console.error("Errore durante l'acquisto dal Mercato:", error);
                displayMessage(`Acquisto Fallito dal Mercato: ${error.message}`, 'error');
                target.disabled = false; 
            }
        }
    };


    // GESTIONE NAVIGAZIONE
    // Il bottone di ritorno è gestito in initializeMercatoPanel
    


    // Ascolta l'evento lanciato da interfaccia.js
    document.addEventListener('mercatoPanelLoaded', initializeMercatoPanel);
    
});