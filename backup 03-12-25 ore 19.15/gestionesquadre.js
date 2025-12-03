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
    
    // VARIABILI GLOBALI PER IL DRAG
    let currentDragTarget = null; 

    // Variabile per memorizzare la forma generata una volta per la sessione (Modalità Formazione)
    let generatedPlayerForms = new Map(); 

    // Costanti per le collezioni
    let TEAMS_COLLECTION_PATH;
    let DRAFT_PLAYERS_COLLECTION_PATH;
    
    const getRandomInt = window.getRandomInt; // Usa il getter globale

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
     * Genera la forma casuale e la applica al giocatore.
     * Questa forma è temporanea per la sessione di gestione Formazione.
     * @param {Object} player - Oggetto giocatore.
     * @returns {Object} Oggetto giocatore con formModifier, formIcon, e currentLevel.
     */
    const applyFormForDisplay = (player) => {
        if (generatedPlayerForms.has(player.id)) {
            return generatedPlayerForms.get(player.id);
        }
        
        // Genera un modificatore di forma tra -3 e +3
        const mod = getRandomInt(-3, 3); 
        let icon;
        
        if (mod > 0) {
            icon = 'text-green-500 fas fa-arrow-up';
        } else if (mod < 0) {
            icon = 'text-red-500 fas fa-arrow-down';
        } else {
            icon = 'text-gray-400 fas fa-minus-circle'; // Quadratino grigio
        }

        const currentLevel = Math.max(1, player.level + mod);

        const formState = {
            ...player,
            formModifier: mod,
            formIcon: icon,
            currentLevel: currentLevel 
        };
        
        generatedPlayerForms.set(player.id, formState);
        return formState;
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
        
        // Resetta la forma quando si cambia modalità
        if (mode !== 'formazione') {
            generatedPlayerForms.clear();
        }

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

            // Dati di base della squadra
            let teamData = teamDoc.data();
            
            // --- LOGICA FORMA (MODALITÀ FORMAZIONE) ---
            if (mode === 'formazione') {
                // 1. Assicurati che TUTTI i giocatori in rosa abbiano la forma calcolata
                teamData.players = teamData.players.map(player => applyFormForDisplay(player));
                
                // 2. Aggiorna titolari e panchina con i dati di forma
                const updateFormationWithForm = (list) => list.map(p => {
                    const formState = generatedPlayerForms.get(p.id);
                    // Se la forma è stata calcolata, usa i dati temporanei, altrimenti usa i dati base
                    return formState || p; 
                });
                
                // Rimuovi giocatori che non sono più in rosa (es. licenziati)
                const validPlayersInFormation = (list) => list.filter(p => teamData.players.some(rp => rp.id === p.id));
                
                teamData.formation.titolari = updateFormationWithForm(validPlayersInFormation(teamData.formation.titolari));
                teamData.formation.panchina = updateFormationWithForm(validPlayersInFormation(teamData.formation.panchina));
            }
            // --- FINE LOGICA FORMA ---
            
            // Imposta i dati globali e renderizza
            currentTeamData = teamData;

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
                
                // Rimuovi anche dalla formazione se presente
                const updatedTitolari = teamData.formation.titolari.filter(p => p.id !== playerId);
                const updatedPanchina = teamData.formation.panchina.filter(p => p.id !== playerId);

                await updateDoc(teamDocRef, {
                    budget: teamData.budget + refundCost, 
                    players: updatedPlayers,
                    formation: {
                        ...teamData.formation,
                        titolari: updatedTitolari,
                        panchina: updatedPanchina
                    }
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
        
        // Usa i dati con forma se presenti
        const playerWithForm = player;
        
        const playerName = playerWithForm ? `${playerWithForm.name}` : `Slot ${role}`;
        const playerRole = playerWithForm ? playerWithForm.role : role; 
        const levelText = playerWithForm ? playerWithForm.currentLevel : ''; 
        const baseLevel = playerWithForm ? playerWithForm.level : '';
        const bgColor = playerWithForm ? 'bg-yellow-500' : 'bg-gray-700'; 
        const textColor = playerWithForm ? 'text-gray-900' : 'text-gray-400';
        
        // AGGIUNTO ondragend qui
        const draggableAttr = playerWithForm ? `draggable="true" data-id="${playerWithForm.id}" data-role="${playerWithForm.role}" data-cost="${playerWithForm.cost}" ondragend="window.handleDragEnd(event)"` : '';
        
        let warningHtml = '';
        let tooltipText = '';

        if (playerWithForm && role !== 'B' && playerWithForm.role !== role) {
            tooltipText = `ATTENZIONE: ${playerWithForm.name} è un ${playerWithForm.role} ma gioca come ${role}. L'impatto in partita sarà minore.`;
            warningHtml = `
                <span class="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 cursor-help" 
                      title="${tooltipText}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600 bg-white rounded-full shadow-lg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </span>
            `;
        }
        
        // NUOVO: Icona forma
        // Assicurati di includere Font Awesome nel tuo HTML per far funzionare le icone
        const formIconHtml = playerWithForm ? 
            `<i class="${playerWithForm.formIcon} mr-1 text-base"></i>` : 
            '';
        
        // NUOVO: Colore del modificatore
        const modColor = playerWithForm && playerWithForm.formModifier > 0 ? 'text-green-500' : (playerWithForm && playerWithForm.formModifier < 0 ? 'text-red-500' : 'text-gray-400');
        const modText = playerWithForm && playerWithForm.formModifier !== 0 ? `(${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier})` : '(0)';

        // LOGICA MIGLIORATA PER IL CONTENUTO DEL BOX:
        const playerContent = playerWithForm ? 
            `<div class="jersey-inner w-full h-full flex flex-col justify-between items-center py-1 font-extrabold select-none">
                <span class="text-xs font-normal text-gray-700">BASE: ${baseLevel}</span>
                <div class="flex items-center text-xl mt-1">
                    ${formIconHtml} 
                    <span class="text-3xl font-extrabold">${levelText}</span>
                </div>
                <span class="text-xs font-semibold ${modColor} mt-auto">${modText}</span>
            </div>`
            : 
            `<span class="font-semibold text-xs select-none">${role}</span>`;

        // Modifica: Aumento del padding interno e del box-sizing
        return `
            <div data-role="${role}" id="${slotId}" class="slot-target w-full text-center rounded-lg shadow-inner-dark transition duration-150 cursor-pointer relative
                        ${bgColor} ${textColor}
                        ${playerWithForm ? 'player-card' : 'empty-slot'} z-10 p-1" 
                 ondragover="event.preventDefault();"
                 ondrop="window.handleDrop(event, '${role}')"
                 ${draggableAttr}
                 ondragstart="window.handleDragStart(event)"
                 title="${playerWithForm ? playerName : ''}">
                
                ${playerContent}
                ${warningHtml}
            </div>
        `;
    };

    /**
     * Rimuove il giocatore dalla sua posizione corrente (titolari o panchina).
     * @param {string} playerId - ID del giocatore da rimuovere.
     */
    const removePlayerFromPosition = (playerId) => {
        // Rimuove dai titolari
        const initialTitolariLength = currentTeamData.formation.titolari.length;
        currentTeamData.formation.titolari = currentTeamData.formation.titolari.filter(p => p.id !== playerId);
        const removedFromTitolari = initialTitolariLength !== currentTeamData.formation.titolari.length;
        
        // Rimuove dalla panchina
        const initialPanchinaLength = currentTeamData.formation.panchina.length;
        currentTeamData.formation.panchina = currentTeamData.formation.panchina.filter(p => p.id !== playerId);
        const removedFromPanchina = initialPanchinaLength !== currentTeamData.formation.panchina.length;
        
        return removedFromTitolari || removedFromPanchina;
    };


    const renderFieldSlots = (teamData) => {
        const formationData = teamData.formation;
        const currentModule = MODULI[formationData.modulo];
        const titolariSlots = document.getElementById('titolari-slots');
        const panchinaSlots = document.getElementById('panchina-slots');
        const fullSquadList = document.getElementById('full-squad-list');

        if (!titolariSlots || !panchinaSlots || !fullSquadList || !currentModule) return;
        
        const allPlayers = teamData.players;
        
        // Calcola i giocatori in campo/panchina
        const usedIds = [...formationData.titolari.map(p => p.id), ...formationData.panchina.map(p => p.id)];
        
        // Giocatori disponibili (nella rosa ma non in formazione)
        const availablePlayers = allPlayers.filter(p => !usedIds.includes(p.id));
        
        // Copia dei titolari per il rendering a slot (perché la lista è piatta)
        let titolariToRender = [...formationData.titolari];
        
        titolariSlots.innerHTML = '';
        panchinaSlots.innerHTML = '';
        fullSquadList.innerHTML = '';
        
        // CORREZIONE: Dichiarazione di fieldHtml
        let fieldHtml = ''; 
        
        // Funzione helper per trovare e rimuovere un giocatore dal pool dei titolari
        const getPlayerForRole = (role) => {
            const index = titolariToRender.findIndex(p => p.role === role);
            if (index !== -1) {
                return titolariToRender.splice(index, 1)[0];
            }
            // Se non trova il ruolo primario, cerca il primo giocatore disponibile (fuori ruolo)
            const firstAvailableIndex = titolariToRender.findIndex(p => p.role !== 'P' && p.role !== 'B'); // Evita portieri non assegnati
             if (role !== 'P' && firstAvailableIndex !== -1) {
                return titolariToRender.splice(firstAvailableIndex, 1)[0];
             }
            return null;
        };

        // Portiere (P)
        let portiere = null;
        const portiereIndex = titolariToRender.findIndex(p => p.role === 'P');
        if (portiereIndex !== -1) {
             portiere = titolariToRender.splice(portiereIndex, 1)[0];
        }

        fieldHtml += `
            <div class="field-position-P w-full flex justify-center">
                <div class="jersey-container w-20 h-20 text-center"> <!-- Dimensione fissa 80px -->
                    ${createPlayerSlot('P', 0, portiere)}
                </div>
            </div>
        `;

        // Linee (D, C, A)
        const rolePositionsY = { 'D': 'field-position-D', 'C': 'field-position-C', 'A': 'field-position-A' };
        
        ROLES.filter(r => r !== 'P').forEach(role => {
            const slotsCount = currentModule[role];
            if (slotsCount === 0) return;

            fieldHtml += `
                <div class="${rolePositionsY[role]} w-full flex justify-center items-center">
                    <h5 class="absolute left-2 text-white font-bold text-sm z-0">${role} (${slotsCount})</h5>
                    
                    <div class="flex justify-around w-full px-12">
                        ${Array(slotsCount).fill().map((_, index) => {
                            const player = getPlayerForRole(role); 
                            return `
                                <div class="jersey-container w-20 h-20"> <!-- Dimensione fissa 80px -->
                                    ${createPlayerSlot(role, index, player)}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        titolariSlots.innerHTML = fieldHtml; 
        
        // Panchina (B)
        panchinaSlots.innerHTML = teamData.formation.panchina.map((player, index) => {
            return `<div class="jersey-container w-20 h-20">${createPlayerSlot('B', index, player)}</div>`; // Dimensione fissa 80px
        }).join('');
        
        panchinaSlots.innerHTML += Array(3 - teamData.formation.panchina.length).fill().map((_, index) => {
            return `<div class="jersey-container w-20 h-20">${createPlayerSlot('B', teamData.formation.panchina.length + index, null)}</div>`; // Dimensione fissa 80px
        }).join('');

        // Rosa Completa
        if (availablePlayers.length === 0) {
             fullSquadList.innerHTML = '<p class="text-gray-400">Nessun giocatore disponibile (tutti in campo o in panchina).</p>';
        } else {
            fullSquadList.innerHTML = availablePlayers.map(player => {
                // Recupera i dati di forma corretti dal Map
                const playerWithForm = generatedPlayerForms.get(player.id) || player; 
                
                return `
                    <div draggable="true" data-id="${player.id}" data-role="${player.role}" data-cost="${player.cost}"
                         class="player-card p-2 bg-gray-600 text-white rounded-lg shadow cursor-grab hover:bg-gray-500 transition duration-100 z-10"
                         ondragstart="window.handleDragStart(event)"
                         ondragend="window.handleDragEnd(event)">
                        ${player.name} (${player.role}) (Liv: ${player.level})
                        <!-- Visualizzazione Form in Rosa Libera -->
                        <span class="float-right text-xs font-semibold ${playerWithForm.formModifier > 0 ? 'text-green-400' : (playerWithForm.formModifier < 0 ? 'text-red-400' : 'text-gray-400')}">
                            ${playerWithForm.formModifier > 0 ? '+' : ''}${playerWithForm.formModifier}
                        </span>
                    </div>
                `;
            }).join('');
        }
    };
    
    const renderFormazioneManagement = (teamData) => {
        squadraMainTitle.textContent = "Gestione Formazione";
        squadraSubtitle.textContent = `Modulo Attuale: ${teamData.formation.modulo} | Trascina i giocatori in campo! (Forma attiva)`;
        
        squadraToolsContainer.innerHTML = `
            <style>
                /* STILI CSS OMAGGIO PER IL CAMPO */
                #field-area {
                    /* ALTEZZA MASSIMA AUMENTATA */
                    height: 700px; 
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
                
                /* POSIZIONI RIBILANCIATE SUI 700PX DI ALTEZZA */
                .field-position-P { position: absolute; top: 5%; width: 100%; } /* Più vicino alla porta (sopra) */
                .field-position-D { position: absolute; top: 30%; width: 100%; } /* Più in alto del centro */
                .field-position-C { position: absolute; top: 55%; width: 100%; } /* Centro-basso */
                .field-position-A { position: absolute; top: 80%; width: 100%; } /* Più vicino alla porta (sotto) */
                
                .slot-target { 
                    z-index: 10; 
                    position: relative; 
                    width: 100%; 
                    height: 100%; 
                    border-radius: 6px; 
                    box-sizing: border-box; 
                    line-height: 1; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .empty-slot.slot-target { 
                    border: 2px dashed #4ade80; 
                    padding: 0.5rem; 
                }
                
                .jersey-inner { 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-around; 
                    padding: 0.2rem;
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
                    </div>
                </div>
                
                <div class="lg:w-2/3 space-y-4">
                    <div id="field-area" class="rounded-lg shadow-xl p-4 text-center">
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
            // Ridisegna immediatamente e avvisa l'utente
            renderFieldSlots(currentTeamData); 
            displayMessage('formation-message', `Modulo cambiato in ${newModule}. Rischiera i tuoi giocatori.`, 'info');
            document.getElementById('module-description').textContent = MODULI[newModule].description;
            document.querySelector('#field-area h4').textContent = `Campo (Titolari) - Modulo: ${newModule}`;
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


    window.handleDrop = (e, targetRole) => {
        e.preventDefault();
        
        // 1. RECUPERO L'ID DEL GIOCATORE TRASCINATO
        const droppedId = e.dataTransfer.getData('text/plain');
        const formationMessage = document.getElementById('formation-message');
        
        if (!droppedId) {
             return displayMessage('formation-message', 'Drop fallito: ID Giocatore non trasferito.', 'error');
        }
        
        const player = currentTeamData.players.find(p => p.id === droppedId);
        if (!player) {
             return displayMessage('formation-message', 'Errore: Giocatore non trovato nella rosa (ID non valido).', 'error');
        }

        // 2. TROVARE IL TARGET REALE (slot o contenitore)
        let actualDropSlot = e.target.closest('.slot-target') || e.target.closest('#panchina-slots') || e.target.closest('#full-squad-list'); 
        
        if (!actualDropSlot) {
             return displayMessage('formation-message', 'Drop non valido.', 'error');
        }

        const finalTargetRole = actualDropSlot.dataset.role || targetRole;
        
        // 3. Verifica slot occupato nello slot di destinazione (solo se il drop è su uno SLOT)
        let playerInSlotBeforeDrop = null;
        if (actualDropSlot.classList.contains('player-card') || (actualDropSlot.classList.contains('slot-target') && actualDropSlot.dataset.id)) {
            const occupiedPlayerId = actualDropSlot.dataset.id || droppedId; // Se droppo su me stesso, occupato è comunque me stesso.
            
            // Troviamo il giocatore che era nello slot (SE DIVERSO)
            if (occupiedPlayerId && occupiedPlayerId !== droppedId) {
                 playerInSlotBeforeDrop = currentTeamData.players.find(p => p.id === occupiedPlayerId);
            }
        }
        
        // 4. Rimuovi il giocatore trascinato dalla sua posizione corrente (PRIMA DI TUTTO)
        removePlayerFromPosition(player.id);
        
        
        // 5. Logica di Inserimento
        if (finalTargetRole === 'ROSALIBERA') {
            // Drop sul contenitore della rosa libera (equivale a rimetterlo fuori rosa)
            if (playerInSlotBeforeDrop) removePlayerFromPosition(playerInSlotBeforeDrop.id);
            displayMessage('formation-message', `${player.name} liberato da campo/panchina.`, 'success');
            
        } else if (finalTargetRole === 'B') {
            // Drop sulla Panchina
            
            if (playerInSlotBeforeDrop) {
                // Se c'era un giocatore nello slot della panchina, lo rimuoviamo (andranno in ROSALIBERA al prossimo render)
                removePlayerFromPosition(playerInSlotBeforeDrop.id); 
                displayMessage('formation-message', `${player.name} in panchina. ${playerInSlotBeforeDrop.name} liberato.`, 'info');
            } else if (currentTeamData.formation.panchina.length >= 3) {
                 // Se non c'era un giocatore da scambiare e la panchina è piena, non permettere l'aggiunta
                 return displayMessage('formation-message', 'La panchina è piena (Max 3). Ridisegna per riprovare.', 'error');
            }
            
            // Aggiunge il giocatore alla panchina
            currentTeamData.formation.panchina.push(player);
            displayMessage('formation-message', `${player.name} spostato in panchina.`, 'success');
            
        } else {
            // Drop sul Campo (Titolari - P, D, C, A)
            
            // Se lo slot di destinazione era occupato, rimuoviamo l'occupante
            if (playerInSlotBeforeDrop) {
                 removePlayerFromPosition(playerInSlotBeforeDrop.id); // Rimuovi l'occupante
                 displayMessage('formation-message', `${player.name} ha preso il posto di ${playerInSlotBeforeDrop.name}.`, 'info');
            } else {
                 displayMessage('formation-message', `${player.name} messo in campo come ${finalTargetRole}.`, 'success');
            }

            // Inserisce il giocatore trascinato come titolare
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
        
        const titolari = currentTeamData.formation.titolari;

        const portieriInCampo = titolari.filter(p => p.role === 'P').length;
        if (portieriInCampo !== 1) {
             displayMessage('formation-message', 'Errore: Devi schierare esattamente 1 Portiere in campo.', 'error');
             saveButton.textContent = 'Salva Formazione';
             saveButton.disabled = false;
             return;
        }
        
        const totalTitolari = titolari.length;
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
            // Aggiorna solo i dati della formazione
            // IMPORTANTE: Salviamo solo l'ID e il Livello Base/Ruolo/etc. senza i dati temporanei di 'formModifier'
            const cleanFormation = (players) => players.map(({ id, name, role, age, cost, level }) => ({ id, name, role, age, cost, level }));

            await updateDoc(teamDocRef, {
                formation: {
                    modulo: currentTeamData.formation.modulo,
                    titolari: cleanFormation(currentTeamData.formation.titolari),
                    panchina: cleanFormation(currentTeamData.formation.panchina)
                }
            });
            displayMessage('formation-message', 'Formazione salvata con successo!', 'success');
            
            // Aggiorna i dati globali della squadra dopo il salvataggio
            if (window.currentTeamData) {
                 // Aggiorna i dati della formazione nel globale, ma usa la versione "pulita"
                 window.currentTeamData.formation = {
                     modulo: currentTeamData.formation.modulo,
                     titolari: cleanFormation(currentTeamData.formation.titolari),
                     panchina: cleanFormation(currentTeamData.formation.panchina)
                 };
            }

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
        // Al ritorno alla Dashboard Utente, ricarica la UI per aggiornare le statistiche
        if (window.showScreen && appContent) {
            window.showScreen(appContent);
            // La dashboard si ricarica automaticamente in interfaccia.js
        }
    });

    // Rende le funzioni DnD globali
    window.handleDragStart = window.handleDragStart || handleDragStart;
    window.handleDrop = window.handleDrop || handleDrop;
    window.handleDragEnd = window.handleDragEnd || handleDragEnd;

    document.addEventListener('squadraPanelLoaded', initializeSquadraPanel);
});