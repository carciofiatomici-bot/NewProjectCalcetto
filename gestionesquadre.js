//
// ====================================================================================
// CONTENUTO DEL MODULO GESTIONESQUADRE.JS (Logica Gestione Rosa e Formazione)
// ====================================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti ai contenitori
    const squadraContent = document.getElementById('squadra-content');
    const squadraToolsContainer = document.getElementById('squadra-tools-container');
    const squadraBackButton = document.getElementById('squadra-back-button');
    const appContent = document.getElementById('app-content');
    const squadraMainTitle = document.getElementById('squadra-main-title');
    const squadraSubtitle = document.getElementById('squadra-subtitle');

    // Variabili di stato per la squadra corrente
    let db;
    let firestoreTools;
    let currentTeamId = null;
    let currentTeamData = null; // Dati della squadra caricati

    // Costanti per le collezioni
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH;

    // Struttura dei moduli e delle posizioni (P, D, C, A)
    const MODULI = {
        '1-2-2': { P: 1, D: 2, C: 0, A: 2, description: "Tattica ultradifensiva, 2 Difensori, 2 Attaccanti. (4 titolari + Portiere)" },
        '1-1-2-1': { P: 1, D: 1, C: 2, A: 1, description: "Modulo equilibrato, 1 Difensore, 2 Centrocampisti, 1 Attaccante. (4 titolari + Portiere)" },
        '1-3-1': { P: 1, D: 3, C: 0, A: 1, description: "Modulo difensivo con 3 difensori, 1 Attaccante. (4 titolari + Portiere)" },
        '1-1-3': { P: 1, D: 1, C: 0, A: 3, description: "Modulo ultra-offensivo, 1 Difensore, 3 Attaccanti. (4 titolari + Portiere)" },
    };
    
    // Ruoli totali
    const ROLES = ['P', 'D', 'C', 'A'];
    
    // Posizioni assolute fittizie per i ruoli sul campo da gioco (percentuale altezza)
    const FIELD_POSITIONS = {
        P: [10], // Portiere in basso (10% dall'alto)
        D: [30, 30, 30], // Difesa (30% dall'alto)
        C: [55, 55, 55], // Centrocampo (55% dall'alto)
        A: [80, 80, 80]  // Attacco (80% dall'alto)
    };


    /**
     * Helper per mostrare messaggi di stato.
     */
    const displayMessage = (containerId, message, type) => {
        const msgElement = document.getElementById(containerId);
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
     * Funzione principale per inizializzare il pannello squadra in modalità Rosa o Formazione.
     * @param {CustomEvent} event - L'evento custom con i dettagli della modalità e del teamId.
     */
    const initializeSquadraPanel = (event) => {
        if (!event.detail || !event.detail.teamId) {
            console.error("ID Squadra non fornito per la gestione.");
            return;
        }

        // Inizializzazione servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId } = firestoreTools;
        
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        DRAFT_PLAYERS_COLLECTION_PATH = `artifacts/${appId}/public/data/draftPlayers`;

        currentTeamId = event.detail.teamId;
        const mode = event.detail.mode;
        
        loadTeamDataAndRender(mode);
    };
    
    /**
     * Carica i dati della squadra da Firestore e li renderizza.
     * @param {string} mode - 'rosa' o 'formazione'.
     */
    const loadTeamDataAndRender = async (mode) => {
        const { doc, getDoc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

        try {
            const teamDoc = await getDoc(teamDocRef);
            if (!teamDoc.exists()) {
                squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Squadra non trovata.</p>`;
                return;
            }

            currentTeamData = teamDoc.data();
            
            if (mode === 'rosa') {
                renderRosaManagement(currentTeamData);
            } else if (mode === 'formazione') {
                renderFormazioneManagement(currentTeamData);
            }
        } catch (error) {
            console.error("Errore nel caricamento dei dati della squadra:", error);
            squadraToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore di caricamento dati: ${error.message}</p>`;
        }
    };
    
    // -------------------------------------------------------------------
    // MODALITÀ GESTIONE ROSA
    // -------------------------------------------------------------------
    
    /**
     * Renderizza l'interfaccia per la Gestione Rosa.
     * @param {object} teamData - I dati della squadra.
     */
    const renderRosaManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Rosa";
        squadraSubtitle.textContent = `Budget Rimanente: ${teamData.budget} Crediti Seri | Giocatori in rosa: ${teamData.players.length}`;

        squadraToolsContainer.innerHTML = `
            <div class="bg-gray-700 p-6 rounded-lg border border-green-500">
                <h3 class="text-2xl font-bold text-green-400 mb-4">I Tuoi Calciatori</h3>
                <div id="player-list-message" class="text-center mb-4 text-green-500"></div>
                <div id="player-list" class="space-y-3">
                    ${teamData.players.length === 0 
                        ? '<p class="text-gray-400">Nessun calciatore in rosa. Vai al Draft per acquistarne!</p>'
                        : teamData.players.map(player => {
                            const refundCost = Math.floor(player.cost / 2);

                            return `
                                <div class="flex justify-between items-center p-4 bg-gray-800 rounded-lg border border-green-700">
                                    <div>
                                        <span class="text-white font-semibold">${player.name} <span class="text-yellow-400">(${player.role})</span></span>
                                        <p class="text-sm text-gray-400">Livello: ${player.level} | Acquistato per: ${player.cost} CS</p>
                                    </div>
                                    <button data-player-id="${player.id}" 
                                            data-original-cost="${player.cost}"
                                            data-refund-cost="${refundCost}"
                                            data-player-name="${player.name}"
                                            data-action="licenzia"
                                            class="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition duration-150 shadow-md">
                                        Licenzia (Rimborso: ${refundCost} CS)
                                    </button>
                                </div>
                            `;
                          }).join('')
                    }
                </div>
            </div>
        `;
        
        const playerList = document.getElementById('player-list');
        if (playerList) {
            playerList.addEventListener('click', handleRosaAction);
        }
    };
    
    /**
     * Gestisce l'azione di licenziamento di un giocatore (rimozione dalla rosa).
     * @param {Event} event 
     */
    const handleRosaAction = async (event) => {
        const target = event.target;
        const msgContainerId = 'player-list-message';

        if (!target.dataset.playerId) return;

        const playerId = target.dataset.playerId;
        const playerName = target.dataset.playerName;
        const refundCost = parseInt(target.dataset.refundCost);
        
        if (target.dataset.action === 'licenzia') {
            target.textContent = `CONFERMA? (+${refundCost} CS)`;
            target.classList.remove('bg-red-600');
            target.classList.add('bg-orange-500');
            target.dataset.action = 'confirm-licenzia';
            return;
        }

        if (target.dataset.action === 'confirm-licenzia') {
            target.textContent = 'Esecuzione...';
            target.disabled = true;
            displayMessage(msgContainerId, `Licenziamento di ${playerName} in corso...`, 'info');

            try {
                const { doc, getDoc, updateDoc } = firestoreTools;
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
                const playerDraftDocRef = doc(db, DRAFT_PLAYERS_COLLECTION_PATH, playerId);

                const teamDoc = await getDoc(teamDocRef);
                const teamData = teamDoc.data();
                const currentPlayers = teamData.players || [];
                
                const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
                
                await updateDoc(teamDocRef, {
                    budget: teamData.budget + refundCost, 
                    players: updatedPlayers
                });

                await updateDoc(playerDraftDocRef, {
                    isDrafted: false,
                    teamId: null,
                });
                
                displayMessage(msgContainerId, `Giocatore ${playerName} licenziato! Rimborsati ${refundCost} Crediti Seri.`, 'success');
                
                loadTeamDataAndRender('rosa');

            } catch (error) {
                console.error("Errore durante il licenziamento:", error);
                displayMessage(msgContainerId, `Errore nel licenziamento di ${playerName}. Riprova.`, 'error');
                target.disabled = false;
                target.textContent = 'Licenzia (Errore)';
                target.classList.remove('bg-orange-500');
                target.classList.add('bg-red-600');
                target.dataset.action = 'licenzia';
            }
        }
    };


    // -------------------------------------------------------------------
    // MODALITÀ GESTIONE FORMAZIONE (Drag & Drop Implementato)
    // -------------------------------------------------------------------
    
    /**
     * Genera la struttura HTML per uno slot (drop target).
     * @param {string} role - Ruolo dello slot (P, D, C, A).
     * @param {number} index - Indice dello slot.
     * @param {object} player - Giocatore attualmente nello slot.
     */
    const createPlayerSlot = (role, index, player) => {
        const slotId = `${role}-${index}`;
        const playerName = player ? `${player.name}` : `Slot ${role}`;
        const levelText = player ? `(Liv: ${player.level})` : '';
        const bgColor = player ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-700 hover:bg-gray-600';
        const textColor = player ? 'text-gray-900' : 'text-gray-400';
        const draggableAttr = player ? `draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"` : '';

        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full p-1 text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer 
                        ${bgColor} ${textColor}
                        ${player ? 'player-card' : 'empty-slot'} z-10" 
                 ondragover="event.preventDefault();"
                 ondrop="window.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ondragstart="window.handleDragStart(event)">
                <span class="font-semibold text-xs select-none">${playerName}</span>
                <span class="text-xs select-none ${player ? 'text-gray-700' : ''}">${levelText}</span>
            </div>
        `;
    };

    /**
     * Renderizza gli slot del campo in base al modulo selezionato e riempie la lista disponibili/panchina.
     * @param {object} teamData - I dati della squadra.
     */
    const renderFieldSlots = (teamData) => {
        const formationData = teamData.formation;
        const currentModule = MODULI[formationData.modulo];
        const titolariSlots = document.getElementById('titolari-slots');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        if (!titolariSlots || !panchinaSlots || !fullSquadList || !currentModule) return;
        
        // 1. Prepara i dati
        const allPlayers = teamData.players;
        const titolariIds = formationData.titolari.map(p => p.id);
        const panchinaIds = formationData.panchina.map(p => p.id);
        
        // La rosa disponibile è costituita da TUTTI i giocatori meno i Titolari e quelli in Panchina
        const availablePlayers = allPlayers.filter(p => !titolariIds.includes(p.id) && !panchinaIds.includes(p.id));
        
        // Raggruppa i titolari per ruolo (crea una COPIA dell'array per poter usare shift() nel rendering)
        const titolariByRole = formationData.titolari.reduce((acc, p) => {
            acc[p.role] = acc[p.role] || [];
            // Usiamo slice() per creare una copia in modo che shift() funzioni senza danneggiare l'array originale
            acc[p.role].push(p); 
            return acc;
        }, {});
        
        // Pulisci i contenitori
        titolariSlots.innerHTML = '';
        panchinaSlots.innerHTML = '';
        fullSquadList.innerHTML = '';
        
        // 2. Renderizza il Campo (Portiere e Linee)
        let fieldHtml = '';
        
        // Struttura Portiere
        // ATTENZIONE: Usiamo .slice().shift() per prendere il primo senza modificare la copia originale
        const portiere = titolariByRole['P'] && titolariByRole['P'].length > 0 ? titolariByRole['P'].slice().shift() : null;
        if (titolariByRole['P'] && titolariByRole['P'].length > 0) titolariByRole['P'].shift(); // Rimuove dalla copia temporanea usata per il rendering

        fieldHtml += `
            <div class="field-position-P w-full flex justify-center">
                <div class="w-24 text-center">
                    ${createPlayerSlot('P', 0, portiere)}
                </div>
            </div>
        `;

        // Struttura Linee (Difesa, Centrocampo, Attacco)
        const rolePositionsY = { 'D': 'field-position-D', 'C': 'field-position-C', 'A': 'field-position-A' };
        
        ROLES.filter(r => r !== 'P').forEach(role => {
            const slotsCount = currentModule[role];
            if (slotsCount === 0) return;

            fieldHtml += `
                <div class="${rolePositionsY[role]} w-full flex justify-center items-center">
                    <h5 class="absolute left-2 text-white font-bold text-sm z-0">${role} (${slotsCount})</h5>
                    
                    <div class="flex justify-around w-full px-12">
                        ${Array(slotsCount).fill().map((_, index) => {
                            // Cerca il giocatore titolare per questo slot (se esiste)
                            const player = titolariByRole[role] && titolariByRole[role].length > 0 ? titolariByRole[role].shift() : null; 
                            
                            return `
                                <div class="w-20">
                                    ${createPlayerSlot(role, index, player)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        titolariSlots.innerHTML = fieldHtml; 
        
        // 3. Renderizza la Panchina
        panchinaSlots.innerHTML = teamData.formation.panchina.map((player, index) => {
            return createPlayerSlot('B', index, player); 
        }).join('');
        
        // Aggiunge slot vuoti se necessario (Max 3)
        panchinaSlots.innerHTML += Array(3 - teamData.formation.panchina.length).fill().map((_, index) => {
            return createPlayerSlot('B', teamData.formation.panchina.length + index, null);
        }).join('');

        // 4. Renderizza la Rosa Completa (i rimanenti)
        if (availablePlayers.length === 0) {
             fullSquadList.innerHTML = '<p class="text-gray-400">Nessun giocatore disponibile (tutti in campo o in panchina).</p>';
        } else {
            fullSquadList.innerHTML = availablePlayers.map(player => `
                <div draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                     class="player-card p-2 bg-gray-600 text-white rounded-lg shadow cursor-grab hover:bg-gray-500 transition duration-100 z-10"
                     ondragstart="window.handleDragStart(event)">
                    ${player.name} (${player.role}) (Liv: ${player.level})
                </div>
            `).join('');
        }
        
        attachDragListeners();
    };
    
    /**
     * Renderizza l'interfaccia per la Gestione Formazione.
     * @param {object} teamData - I dati della squadra.
     */
    const renderFormazioneManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Formazione";
        squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo!`;
        
        squadraToolsContainer.innerHTML = `
            <style>
                /* Stili CSS specifici per il campo da gioco */
                #field-area {
                    /* Sfondo Campo Calcio Verde Scuro */
                    background-image: 
                        linear-gradient(to right, #14532d, #052e16),
                        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100" fill="%2314532d" /><rect x="0" y="0" width="100" height="20" fill="%23052e16" /><rect x="0" y="40" width="100" height="20" fill="%23052e16" /><rect x="0" y="80" width="100" height="20" fill="%23052e16" /></svg>');
                    background-size: cover;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden; /* Nasconde ciò che va fuori */
                    /* Bordo esterno */
                    border: 4px solid white;
                    border-radius: 8px; /* Angoli leggermente arrotondati */
                }
                
                /* Pseudo-elementi per disegnare le linee del campo */
                #field-area::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background-color: white; /* Linea di metà campo */
                    transform: translateY(-50%);
                    z-index: 0; /* ASSICURA CHE SIA SOTTO I GIOCATORI */
                }
                
                #field-area::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    bottom: 0;
                    width: 2px;
                    background-color: white; /* Linea centrale verticale (non tipica, ma utile per visualizzazione) */
                    transform: translateX(-50%);
                    z-index: 0; /* ASSICURA CHE SIA SOTTO I GIOCATORI */
                }

                /* Cerchio di centrocampo */
                #field-area .center-circle {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 100px; /* Diametro cerchio */
                    height: 100px;
                    border: 2px solid white;
                    border-radius: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 0; /* Sotto i giocatori */
                }

                /* Aree di rigore (semplificate) */
                #field-area .penalty-area-top,
                #field-area .penalty-area-bottom {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 80%; /* Larghezza area di rigore */
                    height: 100px; /* Altezza area di rigore */
                    border: 2px solid white;
                    border-top: none;
                    border-bottom: none;
                    z-index: 0; /* Sotto i giocatori */
                }
                #field-area .penalty-area-top {
                    top: 0;
                    border-bottom: 2px solid white;
                }
                #field-area .penalty-area-bottom {
                    bottom: 0;
                    border-top: 2px solid white;
                }

                /* Stili per le card dei giocatori */
                .player-card {
                    cursor: grab;
                }
                .empty-slot {
                    border: 2px dashed #4ade80;
                }
                #titolari-slots {
                    position: relative;
                    height: 100%;
                }
                #panchina-slots {
                    display: flex;
                    align-items: center;
                    justify-center: flex-start;
                    gap: 8px;
                }
                
                /* Posizionamento specifico per i ruoli sul campo */
                .field-position-P { position: absolute; top: 5%; width: 100%; }
                .field-position-D { position: absolute; top: 30%; width: 100%; }
                .field-position-C { position: absolute; top: 55%; width: 100%; }
                .field-position-A { position: absolute; top: 80%; width: 100%; }

                /* Nuovo stile per assicurare che gli slot siano sopra le linee */
                .slot-target {
                    z-index: 10;
                    position: relative; /* Necessario per lo z-index */
                }

            </style>
            
            <div id="formation-message" class="text-center mb-4 text-red-400"></div>

            <div class="flex flex-col lg:flex-row gap-6">
                

<div class="lg:w-1/3 p-4 bg-gray-800 rounded-lg border border-indigo-500 space-y-4">
                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2">Seleziona Modulo</h3>
                    <select id="formation-select" class="w-full p-2 rounded-lg bg-gray-700 text-white border border-indigo-600">
                        ${Object.keys(MODULI).map(mod => `<option value="${mod}" ${teamData.formation.modulo === mod ? 'selected' : ''}>${mod}</option>`).join('')}
                    </select>
                    <p id="module-description" class="text-sm text-gray-400">${MODULI[teamData.formation.modulo].description}</p>
                    
                    <h3 class="text-xl font-bold text-indigo-400 border-b border-gray-600 pb-2 pt-4">Rosa Completa (Disponibili)</h3>
                    <div id="full-squad-list" class="space-y-2 max-h-96 overflow-y-auto min-h-[100px] border border-gray-700 p-2 rounded-lg"
                         ondragover="event.preventDefault();"
                         ondrop="window.handleDrop(event, 'ROSALIBERA')">
                        

<p class="text-center text-gray-400">Trascina qui i giocatori dalla panchina o dal campo per liberarli.</p>
                    </div>
                </div>
                
                

<div class="lg:w-2/3 space-y-4">
                    

<div id="field-area" class="h-[500px] rounded-lg shadow-xl p-4 text-center">
                        <h4 class="text-white font-bold mb-4 z-10 relative">Campo (Titolari) - Modulo: ${teamData.formation.modulo}</h4>
                        

<div class="center-circle"></div>
                        <div class="penalty-area-top"></div>
                        <div class="penalty-area-bottom"></div>
                        
                        <div id="titolari-slots" class="h-full">
                            

</div>
                    </div>
                    
                    

<div id="bench-container" class="bg-gray-800 p-3 rounded-lg border-2 border-indigo-500 h-32">
                        <h4 class="text-indigo-400 font-bold mb-2">Panchina (Max 3 Giocatori)</h4>
                        <div id="panchina-slots" class="h-16 items-center flex space-x-2"
                             ondragover="event.preventDefault();"
                             ondrop="window.handleDrop(event, 'B')">
                             

</div>
                    </div>
                    
                    <button id="btn-save-formation"
                            class="w-full bg-indigo-500 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-indigo-400 transition duration-150 transform hover:scale-[1.01]">
                        Salva Formazione
                    </button>
                </div>
            </div>
        `;
        
        // Cablaggi Iniziali e DnD
        const formationSelect = document.getElementById('formation-select');
        formationSelect.addEventListener('change', (e) => {
            const newModule = e.target.value;

            // --- NUOVA LOGICA DI RESET ---
            // 1. Sposta tutti i giocatori in panchina e titolari nella lista disponibile (svuota gli array)
            currentTeamData.formation.titolari = [];
            currentTeamData.formation.panchina = [];
            
            // 2. Aggiorna il modulo
            currentTeamData.formation.modulo = newModule;
            
            // 3. Ridisegna e mostra il messaggio
            renderFieldSlots(currentTeamData); 
            displayMessage('formation-message', `Modulo cambiato in ${newModule}. Rischiera i tuoi giocatori.`, 'info');
            // -----------------------------
            
            document.getElementById('module-description').textContent = MODULI[newModule].description;
            document.querySelector('#field-area h4').textContent = `Campo (Titolari) - Modulo: ${newModule}`;
        });
        
        document.getElementById('btn-save-formation').addEventListener('click', handleSaveFormation);

        // Inizializza gli slot e i giocatori
        renderFieldSlots(teamData); 
        // L'attacco degli ascoltatori di drag è gestito in renderFieldSlots
    };

    /**
     * Attacca gli ascoltatori di drag ai giocatori esistenti e ai nuovi.
     */
    const attachDragListeners = () => {
        // La funzione createPlayerSlot aggiunge già ondragstart.
        // Questa funzione è mantenuta per futuri cablaggi dinamici, ma non è strettamente necessaria ora.
    };
    
    // -------------------------------------------------------------------
    // LOGICA DRAG & DROP
    // -------------------------------------------------------------------

    let draggedElementData = {}; // Memorizza i dati del giocatore trascinato

    /**
     * Gestisce l'inizio del trascinamento.
     */
    window.handleDragStart = (e) => {
        draggedElementData = {
            id: e.target.dataset.id,
            role: e.target.dataset.role,
            element: e.target
        };
        
        e.dataTransfer.setData('text/plain', draggedElementData.id);
        
        // Aggiunge un feedback visivo
        setTimeout(() => e.target.classList.add('opacity-50', 'border-4', 'border-indigo-400'), 0);
    };

    /**
     * Gestisce il drop in uno slot o nella panchina.
     * @param {Event} e - Evento di drop.
     * @param {string} targetRole - Ruolo dello slot di destinazione (P, D, C, A, B, ROSALIBERA).
     */
    window.handleDrop = (e, targetRole) => {
        e.preventDefault();
        const droppedId = e.dataTransfer.getData('text/plain');
        const draggedCard = draggedElementData.element;
        const formationMessage = document.getElementById('formation-message');
        
        draggedCard.classList.remove('opacity-50', 'border-4', 'border-indigo-400');
        
        const player = currentTeamData.players.find(p => p.id === droppedId);
        if (!player) return displayMessage('formation-message', 'Errore: Giocatore non trovato nella rosa.', 'error');

        // 1. Rimuovi il giocatore dalla sua posizione corrente (titolari o panchina)
        const removePlayerFromCurrentPosition = (playerId) => {
            currentTeamData.formation.titolari = currentTeamData.formation.titolari.filter(p => p.id !== playerId);
            currentTeamData.formation.panchina = currentTeamData.formation.panchina.filter(p => p.id !== playerId);
        };
        removePlayerFromCurrentPosition(player.id);
        
        // 2. Logica di Inserimento
        if (targetRole === 'ROSALIBERA') {
            // Drop sulla Rosa Completa (Non fare nulla, è stato rimosso sopra)
            displayMessage('formation-message', `${player.name} liberato da campo/panchina.`, 'info');
            
        } else if (targetRole === 'B') {
            // Drop sulla Panchina
            if (currentTeamData.formation.panchina.length >= 3) {
                // Se la panchina è piena, non permettere l'inserimento
                 if (currentTeamData.formation.panchina.length >= 3 && !currentTeamData.formation.panchina.some(p => p.id === player.id)) {
                     return displayMessage('formation-message', 'La panchina è piena (Max 3).', 'error');
                 }
            }
            // Aggiunge in panchina, solo se non è già lì (anche se il filtro l'ha tolto, è un'aggiunta sicura)
            if (!currentTeamData.formation.panchina.some(p => p.id === player.id)) {
                 currentTeamData.formation.panchina.push(player);
                 displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');
            }
            
        } else {
            // Drop sul Campo (Titolari - P, D, C, A)
            
            // Verifica Ruolo
            if (targetRole !== player.role) {
                 return displayMessage('formation-message', `Errore: ${player.name} (${player.role}) non può essere messo in posizione ${targetRole}.`, 'error');
            }

            // Verifica Modulo: controlla se il numero massimo di giocatori per quel ruolo nel modulo è già stato raggiunto
            const currentModule = MODULI[currentTeamData.formation.modulo];
            const maxSlotsForRole = currentModule[targetRole] || 0;
            const currentPlayersInRole = currentTeamData.formation.titolari.filter(p => p.role === targetRole).length;
            
            // Se lo slot è pieno, non permettere l'inserimento
            if (currentPlayersInRole >= maxSlotsForRole) {
                 // Controlla se il giocatore che sta provando ad entrare è già nei titolari
                 if (currentTeamData.formation.titolari.some(p => p.id === player.id)) {
                     currentTeamData.formation.titolari.push(player); // Reinserisce il giocatore se era già lì
                     displayMessage('formation-message', `${player.name} confermato in campo.`, 'info');
                     renderFieldSlots(currentTeamData);
                     return;
                 }
                return displayMessage('formation-message', `Limite di ${targetRole} (${maxSlotsForRole}) nel modulo ${currentTeamData.formation.modulo} raggiunto.`, 'error');
            }
            
            // Inserisci il giocatore nei titolari
            currentTeamData.formation.titolari.push(player);
            displayMessage('formation-message', `${player.name} messo in campo come ${targetRole}.`, 'success');
        }
        
        // 3. Ridisegna l'interfaccia
        renderFieldSlots(currentTeamData);
    };


    /**
     * Salva la formazione attuale (titolari, panchina, modulo) su Firestore.
     */
    const handleSaveFormation = async () => {
        const saveButton = document.getElementById('btn-save-formation');
        const msgContainer = document.getElementById('formation-message');
        
        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        displayMessage('formation-message', 'Salvataggio formazione in corso...', 'info');

        const { updateDoc, doc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

        // Controllo finale: 1 Portiere in campo richiesto
        const portieriInCampo = currentTeamData.formation.titolari.filter(p => p.role === 'P').length;
        if (portieriInCampo !== 1) {
             displayMessage('formation-message', 'Errore: Devi schierare esattamente 1 Portiere in campo.', 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        
        // Controllo finale: 5 titolari totali (P+D+C+A)
        const totalTitolari = currentTeamData.formation.titolari.length;
        if (totalTitolari !== 5) {
             displayMessage('formation-message', `Errore: Devi schierare esattamente 5 titolari (hai ${totalTitolari}).`, 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        
        // Controllo finale: Max 3 giocatori in panchina
        const totalPanchina = currentTeamData.formation.panchina.length;
        if (totalPanchina > 3) {
             displayMessage('formation-message', `Errore: Puoi avere un massimo di 3 giocatori in panchina (hai ${totalPanchina}).`, 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }


        try {
            await updateDoc(teamDocRef, {
                formation: currentTeamData.formation
            });

            displayMessage('formation-message', 'Formazione salvata con successo!', 'success');
            
        } catch (error) {
            console.error("Errore nel salvataggio della formazione:", error);
            displayMessage('formation-message', `Errore di salvataggio: ${error.message}`, 'error');
        } finally {
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
        }
    };


    // -------------------------------------------------------------------
    // GESTIONE DELLA NAVIGAZIONE
    // -------------------------------------------------------------------

    // Gestisce il ritorno alla Dashboard Squadra
    squadraBackButton.addEventListener('click', () => {
        if (window.showScreen && appContent) {
            window.showScreen(appContent);
        }
    });

    // Rende le funzioni DnD globali per l'uso con gli attributi HTML ondragover/ondrop
    window.handleDragStart = window.handleDragStart || handleDragStart;
    window.handleDrop = window.handleDrop || handleDrop;

    // Ascolta l'evento lanciato da interfaccia.js per caricare il pannello
    document.addEventListener('squadraPanelLoaded', initializeSquadraPanel);
});