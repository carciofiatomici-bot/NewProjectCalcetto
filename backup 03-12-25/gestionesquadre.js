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
    
    // VARIABILI GLOBALI PER IL DRAG (Solo per il feedback visivo)
    let currentDragTarget = null; 

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
    
    const createPlayerSlot = (role, index, player) => {
        const slotId = `${role}-${index}`;
        const playerName = player ? `${player.name}` : `Slot ${role}`;
        const playerRole = player ? player.role : role; 
        const levelText = player ? player.level : ''; 
        const bgColor = player ? 'bg-yellow-500' : 'bg-gray-700'; 
        const textColor = player ? 'text-gray-900' : 'text-gray-400';
        
        // AGGIUNTO ondragend qui
        const draggableAttr = player ? `draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}" ondragend="window.handleDragEnd(event)"` : '';
        
        let warningHtml = '';
        let tooltipText = '';

        if (player && role !== 'B' && player.role !== role) {
            tooltipText = `ATTENZIONE: ${player.name} è un ${player.role} ma gioca come ${role}. L'impatto in partita sarà minore.`;
            warningHtml = `
                <span class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 cursor-help" 
                      title="${tooltipText}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600 bg-white rounded-full shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </span>
            `;
        }

        const playerContent = player ? 
            `<div class="jersey-inner w-full h-full flex flex-col justify-center items-center font-extrabold select-none">
                <span class="text-lg">${playerRole}</span>
                <span class="text-3xl">${levelText}</span>
            </div>`
            : 
            `<span class="font-semibold text-xs select-none">${role}</span>`;

        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full p-1 text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer relative
                        ${bgColor} ${textColor}
                        ${player ? 'player-card' : 'empty-slot'} z-10" 
                 ondragover="event.preventDefault();"
                 ondrop="window.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ondragstart="window.handleDragStart(event)"
                 title="${player ? playerName : ''}">
                
                ${playerContent}
                ${warningHtml}
            </div>
        `;
    };

    const renderFieldSlots = (teamData) => {
        const formationData = teamData.formation;
        const currentModule = MODULI[formationData.modulo];
        const titolariSlots = document.getElementById('titolari-slots');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        if (!titolariSlots || !panchinaSlots || !fullSquadList || !currentModule) return;
        
        const allPlayers = teamData.players;
        const titolariIds = formationData.titolari.map(p => p.id);
        const panchinaIds = formationData.panchina.map(p => p.id);
        
        const availablePlayers = allPlayers.filter(p => !titolariIds.includes(p.id) && !panchinaIds.includes(p.id));
        
        const titolariByRole = formationData.titolari.reduce((acc, p) => {
            acc[p.role] = acc[p.role] || [];
            acc[p.role].push(p); 
            return acc;
        }, {});
        
        titolariSlots.innerHTML = '';
        panchinaSlots.innerHTML = '';
        fullSquadList.innerHTML = '';
        
        let fieldHtml = '';
        
        // Portiere
        const portiere = titolariByRole['P'] && titolariByRole['P'].length > 0 ? titolariByRole['P'].slice().shift() : null;
        if (titolariByRole['P'] && titolariByRole['P'].length > 0) titolariByRole['P'].shift();

        fieldHtml += `
            <div class="field-position-P w-full flex justify-center">
                <div class="jersey-container w-16 h-16 text-center">
                    ${createPlayerSlot('P', 0, portiere)}
                </div>
            </div>
        `;

        // Linee
        const rolePositionsY = { 'D': 'field-position-D', 'C': 'field-position-C', 'A': 'field-position-A' };
        
        ROLES.filter(r => r !== 'P').forEach(role => {
            const slotsCount = currentModule[role];
            if (slotsCount === 0) return;

            fieldHtml += `
                <div class="${rolePositionsY[role]} w-full flex justify-center items-center">
                    <h5 class="absolute left-2 text-white font-bold text-sm z-0">${role} (${slotsCount})</h5>
                    
                    <div class="flex justify-around w-full px-12">
                        ${Array(slotsCount).fill().map((_, index) => {
                            const player = titolariByRole[role] && titolariByRole[role].length > 0 ? titolariByRole[role].shift() : null; 
                            return `
                                <div class="jersey-container w-16 h-16">
                                    ${createPlayerSlot(role, index, player)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        titolariSlots.innerHTML = fieldHtml; 
        
        // Panchina
        panchinaSlots.innerHTML = teamData.formation.panchina.map((player, index) => {
            return `<div class="jersey-container w-16 h-16">${createPlayerSlot('B', index, player)}</div>`; 
        }).join('');
        
        panchinaSlots.innerHTML += Array(3 - teamData.formation.panchina.length).fill().map((_, index) => {
            return `<div class="jersey-container w-16 h-16">${createPlayerSlot('B', teamData.formation.panchina.length + index, null)}</div>`;
        }).join('');

        // Rosa Completa
        if (availablePlayers.length === 0) {
             fullSquadList.innerHTML = '<p class="text-gray-400">Nessun giocatore disponibile (tutti in campo o in panchina).</p>';
        } else {
            fullSquadList.innerHTML = availablePlayers.map(player => `
                <div draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                     class="player-card p-2 bg-gray-600 text-white rounded-lg shadow cursor-grab hover:bg-gray-500 transition duration-100 z-10"
                     ondragstart="window.handleDragStart(event)"
                     ondragend="window.handleDragEnd(event)">
                    ${player.name} (${player.role}) (Liv: ${player.level})
                </div>
            `).join('');
        }
    };
    
    const renderFormazioneManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Formazione";
        squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo!`;
        
        squadraToolsContainer.innerHTML = `
            <style>
                /* STILI CSS OMAGGIO PER IL CAMPO */
                #field-area {
                    background-image: 
                        linear-gradient(to right, #14532d, #052e16),
                        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100" fill="%2314532d" /><rect x="0" y="0" width="100" height="20" fill="%23052e16" /><rect x="0" y="40" width="100" height="20" fill="%23052e16" /><rect x="0" y="80" width="100" height="20" fill="%23052e16" /></svg>');
                    background-size: cover;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden;
                    border: 4px solid white;
                    border-radius: 8px;
                }
                #field-area::before {
                    content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background-color: white; transform: translateY(-50%); z-index: 0; 
                }
                #field-area::after {
                    content: ''; position: absolute; top: 0; left: 50%; bottom: 0; width: 2px; background-color: white; transform: translateX(-50%); z-index: 0; 
                }
                #field-area .center-circle {
                    position: absolute; top: 50%; left: 50%; width: 100px; height: 100px; border: 2px solid white; border-radius: 50%; transform: translate(-50%, -50%); z-index: 0; 
                }
                #field-area .penalty-area-top, #field-area .penalty-area-bottom {
                    position: absolute; left: 50%; transform: translateX(-50%); width: 80%; height: 100px; border: 2px solid white; border-top: none; border-bottom: none; z-index: 0; 
                }
                #field-area .penalty-area-top { top: 0; border-bottom: 2px solid white; }
                #field-area .penalty-area-bottom { bottom: 0; border-top: 2px solid white; }

                .player-card { cursor: grab; }
                .empty-slot { border: 2px dashed #4ade80; }
                #titolari-slots { position: relative; height: 100%; }
                #panchina-slots { display: flex; align-items: center; justify-content: flex-start; gap: 8px; }
                .jersey-container { padding: 0.25rem; }
                .field-position-P { position: absolute; top: 5%; width: 100%; }
                .field-position-D { position: absolute; top: 30%; width: 100%; }
                .field-position-C { position: absolute; top: 55%; width: 100%; }
                .field-position-A { position: absolute; top: 80%; width: 100%; }
                .slot-target { z-index: 10; position: relative; width: 100%; height: 100%; border-radius: 6px; padding: 0; box-sizing: border-box; line-height: 1; }
                .empty-slot.slot-target { border: 2px dashed #4ade80; padding: 0.5rem; }
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
                    </div>
                </div>
                
                <div class="lg:w-2/3 space-y-4">
                    <div id="field-area" class="h-[500px] rounded-lg shadow-xl p-4 text-center">
                        <h4 class="text-white font-bold mb-4 z-10 relative">Campo (Titolari) - Modulo: ${teamData.formation.modulo}</h4>
                        <div class="center-circle"></div>
                        <div class="penalty-area-top"></div>
                        <div class="penalty-area-bottom"></div>
                        <div id="titolari-slots" class="h-full"></div>
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
        
        const formationSelect = document.getElementById('formation-select');
        formationSelect.addEventListener('change', (e) => {
            const newModule = e.target.value;
            currentTeamData.formation.titolari = [];
            currentTeamData.formation.panchina = [];
            currentTeamData.formation.modulo = newModule;
            renderFieldSlots(currentTeamData); 
            displayMessage('formation-message', `Modulo cambiato in ${newModule}. Rischiera i tuoi giocatori.`, 'info');
            document.getElementById('module-description').textContent = MODULI[newModule].description;
            document.querySelector('#field-area h4').textContent = `Campo (Titolari) - Modulo: ${newData.formation.modulo}`;
        });
        
        document.getElementById('btn-save-formation').addEventListener('click', handleSaveFormation);
        renderFieldSlots(teamData); 
    };

    window.handleDragStart = (e) => {
        const dragTarget = e.target.closest('.slot-target') || e.target.closest('.player-card');
        if (!dragTarget || !dragTarget.dataset.id) {
             e.preventDefault();
             return;
        }
        
        // 1. SALVATAGGIO DELL'ID SU DATA TRANSFER (FIX AFFIDABILE)
        e.dataTransfer.setData('text/plain', dragTarget.dataset.id);
        
        // 2. Solo per il feedback visivo
        currentDragTarget = dragTarget; 
        setTimeout(() => dragTarget.classList.add('opacity-50', 'border-4', 'border-indigo-400'), 0);
    };

    /**
     * Pulisce lo stato globale al termine del drag.
     */
    window.handleDragEnd = (e) => {
        if (currentDragTarget) {
            currentDragTarget.classList.remove('opacity-50', 'border-4', 'border-indigo-400');
        }
        currentDragTarget = null; 
    };

    /**
     * Rimuove il giocatore dalla sua posizione corrente (titolari o panchina).
     */
    const removePlayerFromCurrentPosition = (playerId) => {
        currentTeamData.formation.titolari = currentTeamData.formation.titolari.filter(p => p.id !== playerId);
        currentTeamData.formation.panchina = currentTeamData.formation.panchina.filter(p => p.id !== playerId);
    };

    window.handleDrop = (e, targetRole) => {
        e.preventDefault();
        
        // 1. RECUPERO L'ID DAL DATATRASFER
        const droppedId = e.dataTransfer.getData('text/plain');
        const formationMessage = document.getElementById('formation-message');
        
        // FIX CRITICO: Controlla che l'ID esista PRIMA di cercare.
        if (!droppedId) {
             return displayMessage('formation-message', 'Drop fallito: ID Giocatore non trasferito.', 'error');
        }
        
        const player = currentTeamData.players.find(p => p.id === droppedId);
        
        // Se non c'è ID, il drop è fallito o i dati sono rotti.
        if (!player) {
             return displayMessage('formation-message', 'Errore: Giocatore non trovato nella rosa (ID non valido).', 'error');
        }

        // 2. TROVARE IL TARGET REALE
        let actualDropSlot = e.target.closest('.slot-target'); 
        
        // Se il drop non è su uno slot specifico, controlla se è su uno dei contenitori generici
        if (!actualDropSlot) {
            actualDropSlot = e.target.closest('#panchina-slots') || e.target.closest('#full-squad-list');
        }
        if (!actualDropSlot) {
             return displayMessage('formation-message', 'Drop non valido.', 'error');
        }

        const finalTargetRole = actualDropSlot.dataset.role || targetRole;
        
        
        // 3. Verifica slot occupato (per gestire lo scambio)
        let playerInSlotBeforeDrop = null;
        
        // Cerca il giocatore nello slot di destinazione (se occupato)
        if (actualDropSlot.classList.contains('player-card')) {
            const occupiedPlayerId = actualDropSlot.dataset.id;
            
            // Se lo slot è occupato da un giocatore DIVERSO da quello che sto trascinando
            if (occupiedPlayerId && occupiedPlayerId !== player.id) {
                 playerInSlotBeforeDrop = currentTeamData.players.find(p => p.id === occupiedPlayerId);
            }
        }
        
        // 4. Rimuovi il giocatore trascinato dalla sua posizione corrente (PRIMA DEL DROP)
        removePlayerFromCurrentPosition(player.id);
        
        
        // 5. Logica di Inserimento
        if (finalTargetRole === 'ROSALIBERA') {
            if (playerInSlotBeforeDrop) removePlayerFromCurrentPosition(playerInSlotBeforeDrop.id);
            displayMessage('formation-message', `${player.name} liberato da campo/panchina.`, 'success');
            
        } else if (finalTargetRole === 'B') {
            // Drop sulla Panchina
            
            if (playerInSlotBeforeDrop) {
                // Se c'era un giocatore, lo rimuoviamo e andrà in ROSALIBERA al prossimo render
                removePlayerFromCurrentPosition(playerInSlotBeforeDrop.id); 
                displayMessage('formation-message', `${player.name} in panchina. ${playerInSlotBeforeDrop.name} liberato.`, 'info');
            } else if (currentTeamData.formation.panchina.length >= 3) {
                 return displayMessage('formation-message', 'La panchina è piena (Max 3).', 'error');
            }
            currentTeamData.formation.panchina.push(player);
            displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');
            
        } else {
            // Drop sul Campo (Titolari - P, D, C, A)
            
            if (playerInSlotBeforeDrop) {
                 // Rimuovi il giocatore che era nello slot titolare (andranno in ROSALIBERA)
                 removePlayerFromCurrentPosition(playerInSlotBeforeDrop.id);
                 displayMessage('formation-message', `${player.name} ha preso il posto di ${playerInSlotBeforeDrop.name}.`, 'info');
            } else {
                 displayMessage('formation-message', `${player.name} messo in campo come ${finalTargetRole}.`, 'success');
            }

            // Inserisce il giocatore trascinato
            currentTeamData.formation.titolari.push(player);
        }
        
        // 6. Ridisegna l'interfaccia
        renderFieldSlots(currentTeamData);
    };

    const handleSaveFormation = async () => {
        const saveButton = document.getElementById('btn-save-formation');
        saveButton.textContent = 'Salvataggio...';
        saveButton.disabled = true;
        displayMessage('formation-message', 'Salvataggio formazione in corso...', 'info');

        const { updateDoc, doc } = firestoreTools;
        const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);

        const portieriInCampo = currentTeamData.formation.titolari.filter(p => p.role === 'P').length;
        if (portieriInCampo !== 1) {
             displayMessage('formation-message', 'Errore: Devi schierare esattamente 1 Portiere in campo.', 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        const totalTitolari = currentTeamData.formation.titolari.length;
        if (totalTitolari !== 5) {
             displayMessage('formation-message', `Errore: Devi schierare esattamente 5 titolari (hai ${totalTitolari}).`, 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
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
            console.error("Errore nel salvataggio:", error);
            displayMessage('formation-message', `Errore di salvataggio: ${error.message}`, 'error');
        } finally {
            saveButton.textContent = 'Salva Formazione';
            saveButton.disabled = false;
        }
    };

    // GESTIONE NAVIGAZIONE
    squadraBackButton.addEventListener('click', () => {
        if (window.showScreen && appContent) window.showScreen(appContent);
    });

    // Rende le funzioni DnD globali
    window.handleDragStart = window.handleDragStart || handleDragStart;
    window.handleDrop = window.handleDrop || handleDrop;
    window.handleDragEnd = window.handleDragEnd || handleDragEnd;

    document.addEventListener('squadraPanelLoaded', initializeSquadraPanel);
});