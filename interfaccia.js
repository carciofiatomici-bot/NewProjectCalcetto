//
// ====================================================================
// CONTENUTO DEL MODULO INTERFACCIA.JS (Logica)
// ====================================================================
//

// Dichiarazioni globali per i servizi Firebase (vengono inizializzate in index.html)
let auth;
let db;
let firestoreTools;
let currentTeamId = null; // Memorizza l'ID della squadra corrente
let currentTeamData = null; // VARIABILE GLOBALE PER I DATI COMPLETI DELLA SQUADRA
let teamLogosMap = {}; // Mappa per salvare {teamId: logoUrl} di tutte le squadre
let captainCandidates = []; // NUOVO: candidati capitano

document.addEventListener('DOMContentLoaded', () => {
    // Verifica che gli oggetti globali Firebase siano disponibili
    if (typeof window.auth === 'undefined' || typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
        // Se non sono pronti, attendi un momento (ou gestisci l'errore)
        console.warn("Servizi Firebase o showScreen non pronti, ritento caricamento interfaccia...");
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
    }
    
    // --- HELPER GLOBALE PER NUMERI CASUALI --
    /**
     * Helper per generare un numero intero casuale tra min (incluso) e max (incluso).
     * Esposto globalmente per essere usato da tutti i moduli.
     * @param {number} min 
     * @param {number} max 
     * @returns {number}
     */
    const getRandomInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };
    window.getRandomInt = getRandomInt; // Esposta per tutti i moduli
    // --- FINE HELPER GLOBALE ---


    // Assegna gli oggetti Firebase globali
    auth = window.auth;
    db = window.db;
    firestoreTools = window.firestoreTools;
    const { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, appId } = firestoreTools; // AGGIUNTO deleteDoc
    
    // Riferimenti ai contenitori
    const gateBox = document.getElementById('gate-box');
    const loginBox = document.getElementById('login-box');
    const appContent = document.getElementById('app-content');
    const adminContent = document.getElementById('admin-content');
    const leaderboardContent = document.getElementById('leaderboard-content');
    const scheduleContent = document.getElementById('schedule-content');
    const squadraContent = document.getElementById('squadra-content');
    const mercatoContent = document.getElementById('mercato-content'); 
    const coachSelectionBox = document.getElementById('coach-selection-box'); // NUOVO RIFERIMENTO
    const captainSelectionBox = document.getElementById('captain-selection-box'); 

    // Riferimenti agli elementi della Dashboard Utente
    const teamDashboardTitle = document.getElementById('team-dashboard-title');
    const teamWelcomeMessage = document.getElementById('team-welcome-message');
    const teamFirestoreId = document.getElementById('team-firestore-id');
    const userLogoutButton = document.getElementById('user-logout-button');
    const btnDeleteTeam = document.getElementById('btn-delete-team'); // NUOVO RIFERIMENTO
    const teamLogoElement = document.getElementById('team-logo');
    const nextMatchPreview = document.getElementById('next-match-preview');
    
    // Nuovi Riferimenti per le Statistiche
    const statRosaLevel = document.getElementById('stat-rosa-level');
    const statFormazioneLevel = document.getElementById('stat-formazione-level');
    const statRosaCount = document.querySelector('#stat-rosa-level').nextElementSibling; 
    
    // Riferimenti Allenatore Dashboard
    const statCoachName = document.getElementById('stat-coach-name');
    const statCoachLevel = document.getElementById('stat-coach-level');


    // Riferimenti ai pulsanti di navigazione squadra
    const btnGestioneRosa = document.getElementById('btn-gestione-rosa');
    const btnGestioneFormazione = document.getElementById('btn-gestione-formazione');
    const btnDraftUtente = document.getElementById('btn-draft-utente');
    const btnMercatoUtente = document.getElementById('btn-mercato-utente'); 
    const btnDashboardLeaderboard = document.getElementById('btn-dashboard-leaderboard');
    const btnDashboardSchedule = document.getElementById('btn-dashboard-schedule');


    // Riferimenti ai pulsanti pubblici
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    const btnSchedule = document.getElementById('btn-schedule');
    const leaderboardBackButton = document.getElementById('leaderboard-back-button');
    const scheduleBackButton = document.getElementById('schedule-back-button');
    
    // Riferimenti Selezione Allenatore
    const coachNameInput = document.getElementById('coach-name-input');
    const btnConfirmCoach = document.getElementById('btn-confirm-coach');
    const coachSelectionMessage = document.getElementById('coach-selection-message');
    
    // Riferimenti Selezione Capitano
    const captainCandidatesContainer = document.getElementById('captain-candidates-container');
    const btnConfirmCaptain = document.getElementById('btn-confirm-captain');
    const captainSelectionError = document.getElementById('captain-selection-error');

    // Riferimenti Modale Eliminazione
    const deleteTeamModal = document.getElementById('delete-team-modal');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDeleteFinal = document.getElementById('btn-confirm-delete-final');
    const deleteConfirmationInput = document.getElementById('delete-confirmation-input');
    const deleteMessage = document.getElementById('delete-message');
    const teamNameToDeleteSpan = document.getElementById('team-name-to-delete');


    // Contenitori interni
    const scheduleDisplayContainer = scheduleContent ? scheduleContent.querySelector('.football-box > div:not([id])') : null;
    const leaderboardDisplayContainer = leaderboardContent ? leaderboardContent.querySelector('.football-box > div:not([id])') : null;


    // Elementi del Login Box
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const loginMessage = document.getElementById('login-message');
    
    // Elementi del Gate Box
    const gatePasswordInput = document.getElementById('gate-password');
    const gateButton = document.getElementById('gate-button');
    const gateMessage = document.getElementById('gate-message');
    const MASTER_PASSWORD = "seria"; 

    
    // Credenziali Admin Hardcoded
    const ADMIN_USERNAME = "serieseria";
    const ADMIN_PASSWORD = "admin";
    const ADMIN_USERNAME_LOWER = ADMIN_USERNAME.toLowerCase();
    
    // Costante per la collezione pubblica delle squadre
    const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
    const SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
    const LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`; 
    const SCHEDULE_DOC_ID = 'full_schedule';
    const LEADERBOARD_DOC_ID = 'standings'; 
    
    // Costante Logo Placeholder
    const DEFAULT_LOGO_URL = "https://github.com/carciofiatomici-bot/immaginiserie/blob/main/placeholder.jpg?raw=true";
    
    // URL Placeholder per i Capitani
    const CAPTAIN_PLACEHOLDER_URL = "https://placehold.co/100x100/A0522D/ffffff?text=Capitano";


    // --- NUOVE COSTANTI TIPOLOGIA (TYPE) ---
    const TYPE_POTENZA = 'Potenza';
    const TYPE_TECNICA = 'Tecnica';
    const TYPE_VELOCITA = 'Velocita';
    
    // Helper per ottenere un tipo casuale (usato per i nuovi draft/mercato)
    window.getRandomType = () => {
         const types = [TYPE_POTENZA, TYPE_TECNICA, TYPE_VELOCITA];
         return types[getRandomInt(0, 2)];
    };
    // --- FINE NUOVE COSTANTI TIPOLOGIA ---


    // --- ROSA INIZIALE (5 GIOCATORI: P, D, C, C, A) ---
    // Questa è la rosa base che verrà creata per ogni nuova squadra.
    const INITIAL_SQUAD = [
        // Tutti i giocatori base partono con un livello minimo ma con un tipo assegnato
        { id: 'p001', name: 'Portiere Base', role: 'P', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: TYPE_POTENZA },
        { id: 'd001', name: 'Difensore Base', role: 'D', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: TYPE_POTENZA },
        // Distribuiamo i tipi sui centrocampisti per avere varietà
        { id: 'c001', name: 'Centrocampista Base 1', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: TYPE_TECNICA },
        { id: 'c002', name: 'Centrocampista Base 2', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: TYPE_VELOCITA }, 
        { id: 'a001', name: 'Attaccante Base', role: 'A', levelRange: [1, 1], age: 50, cost: 0, level: 1, isCaptain: false, type: TYPE_POTENZA }
    ];
    
    // --- CANDIDATI CAPITANO CON NOMI AGGIORNATI E TIPO ASSEGNATO ---
    const CAPTAIN_CANDIDATES_TEMPLATES = [
        // Capitano Portiere -> Simone Ciuffo (Tipo: Potenza)
        { id: 'cap-p', role: 'P', name: 'Simone Ciuffo', levelRange: [8, 12], age: getRandomInt(25, 35), cost: 100, isCaptain: true, level: 0, photoUrl: CAPTAIN_PLACEHOLDER_URL.replace('Capitano', 'P'), type: TYPE_POTENZA },
        // Capitano Difensore -> Diego Croc (Tipo: Tecnica)
        { id: 'cap-d', role: 'D', name: 'Diego Croc', levelRange: [9, 13], age: getRandomInt(22, 32), cost: 150, isCaptain: true, level: 0, photoUrl: CAPTAIN_PLACEHOLDER_URL.replace('Capitano', 'D'), type: TYPE_TECNICA },
        // Capitano Centrocampista -> Antonello Scimmia (Tipo: Velocità)
        { id: 'cap-c', role: 'C', name: 'Antonello Scimmia', levelRange: [10, 14], age: getRandomInt(20, 30), cost: 200, isCaptain: true, level: 0, photoUrl: CAPTAIN_PLACEHOLDER_URL.replace('Capitano', 'C'), type: TYPE_VELOCITA },
        // Capitano Attaccante -> Matteo Cap (Tipo: Potenza)
        { id: 'cap-a', role: 'A', name: 'Matteo Cap', levelRange: [11, 15], age: getRandomInt(20, 28), cost: 250, isCaptain: true, level: 0, photoUrl: CAPTAIN_PLACEHOLDER_URL.replace('Capitano', 'A'), type: TYPE_POTENZA }
    ];

    /**
     * Genera la lista completa dei candidati Capitano con i livelli iniziali calcolati.
     * @returns {Array<Object>}
     */
    const generateCaptainCandidates = () => {
        return CAPTAIN_CANDIDATES_TEMPLATES.map(template => {
            // IMPOSTA IL LIVELLO INIZIALE SEMPRE A 10
            const finalLevel = 10;
            return { 
                ...template, 
                level: finalLevel,
                age: template.age, // L'età è già stata randomizzata
                id: crypto.randomUUID(), // Genera un ID univoco per il documento del Capitano
                // NOTA: il costo serve solo per il riepilogo, non viene sottratto
            };
        });
    };
    

    /**
     * Calcola il livello medio da una lista di giocatori.
     * @param {Array<Object>} players - Array di oggetti giocatore con proprietà `level` (o `currentLevel` se è stata applicata la forma).
     * @returns {number} Livello medio arrotondato.
     */
    const calculateAverageLevel = (players) => {
        if (!players || players.length === 0) return 0;
        // Usa `currentLevel` se esiste (per la formazione), altrimenti `level`
        const totalLevel = players.reduce((sum, player) => sum + (player.currentLevel || player.level || 1), 0);
        return parseFloat((totalLevel / players.length).toFixed(1));
    };
    window.calculateAverageLevel = calculateAverageLevel; // Esposta per tutti i moduli

    
    /**
     * Restituisce i 5 giocatori titolari attuali.
     * @param {Object} teamData - L'oggetto dati della squadra.
     * @returns {Array<Object>} Array con i 5 titolari (o un array vuoto).
     */
    const getFormationPlayers = (teamData) => {
         if (!teamData || !teamData.formation || !teamData.formation.titolari) return [];
         return teamData.formation.titolari.filter(p => p.level); // Assicura che abbiano un livello valido
    };
    window.getFormationPlayers = getFormationPlayers; // Espongo la funzione


    /**
     * Helper per generare l'HTML del logo.
     */
    const getLogoHtml = (teamId) => {
        const url = teamLogosMap[teamId] || DEFAULT_LOGO_URL;
        return `<img src="${url}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle">`;
    };
    
    // Rendo le funzioni accessibili globalmente per campionato.js
    window.getLogoHtml = getLogoHtml;


    /**
     * Carica tutti i loghi delle squadre e li mappa {id: url}
     */
    const fetchAllTeamLogos = async () => {
        try {
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);
            
            const logos = {};
            teamsSnapshot.forEach(doc => {
                const data = doc.data();
                logos[doc.id] = data.logoUrl || DEFAULT_LOGO_URL;
            });
            
            teamLogosMap = logos;
            console.log("Mappa loghi caricata con successo.");

        } catch (error) {
            console.error("Errore nel caricamento dei loghi:", error);
            teamLogosMap = {}; // Fallback a mappa vuota
        }
    };
    
    // Rendo la funzione accessibile globalmente per campionato.js
    window.fetchAllTeamLogos = fetchAllTeamLogos;

    
    /**
     * Aggiorna l'interfaccia utente con i dati della squadra.
     * @param {string} teamName - Nome della squadra.
     * @param {string} teamDocId - ID del documento Firestore.
     * @param {string} logoUrl - URL del logo.
     * @param {boolean} isNew - Se è una nuova squadra.
     */
    const updateTeamUI = (teamName, teamDocId, logoUrl, isNew) => {
        teamDashboardTitle.textContent = `Dashboard di ${teamName}`;
        teamWelcomeMessage.textContent = isNew 
            ? `Benvenuto/a, Manager! La tua squadra '${teamName}' è stata appena creata. Inizia il calciomercato!`
            : `Bentornato/a, Manager di ${teamName}! Sei pronto per la prossima giornata?`;
        teamFirestoreId.textContent = teamDocId;
        currentTeamId = teamDocId; // Salva l'ID corrente
        teamLogoElement.src = logoUrl || DEFAULT_LOGO_URL; // Aggiorna il logo
        
        // Calcolo e aggiornamento statistiche
        const allPlayers = currentTeamData.players || [];
        const formationPlayers = getFormationPlayers(currentTeamData);
        
        const rosaLevel = calculateAverageLevel(allPlayers);
        // Per il calcolo della formazione nella dashboard, applichiamo la forma base (senza modificatori)
        const formationLevel = calculateAverageLevel(formationPlayers.map(p => ({ level: p.level })));
        
        statRosaLevel.textContent = rosaLevel.toFixed(1);
        statRosaCount.textContent = `(${allPlayers.length} giocatori)`;
        statFormazioneLevel.textContent = formationLevel.toFixed(1);
        
        // NUOVO: Aggiorna i dati dell'allenatore
        const coach = currentTeamData.coach || { name: 'Allenatore Sconosciuto', level: 0 };
        statCoachName.textContent = coach.name;
        statCoachLevel.textContent = coach.level;

        // Carica la prossima partita al caricamento della Dashboard
        loadNextMatch();
    };
    
    /**
     * Ricarica solo i dati della squadra (utile dopo acquisti/licenziamenti/assegnazione capitano) e aggiorna la UI.
     */
    const reloadTeamDataAndUpdateUI = async () => {
        if (!currentTeamId) return;

        try {
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            const teamDoc = await getDoc(teamDocRef);
            
            if (teamDoc.exists()) {
                // Aggiorna la variabile globale con i dati freschi
                currentTeamData = teamDoc.data(); 
                // Aggiorna l'interfaccia con i nuovi dati (inclusi i dati dell'Allenatore e Rosa)
                updateTeamUI(currentTeamData.teamName, teamDocRef.id, currentTeamData.logoUrl, false);
            } else {
                 console.error("Errore: Impossibile trovare i dati della squadra corrente per l'aggiornamento.");
            }
        } catch (error) {
             console.error("Errore nel ricaricamento dati squadra:", error);
        }
    };
    
    // Gestisce l'evento personalizzato per l'aggiornamento della dashboard
    document.addEventListener('dashboardNeedsUpdate', reloadTeamDataAndUpdateUI);


    // --- GESTIONE PERSISTENZA SESSIONE ---

    /**
     * Salva i dati della sessione in localStorage.
     * @param {string} teamId - L'ID del documento della squadra o l'ID Admin (serieseria).
     * @param {string} userType - 'admin' o 'user'.
     */
    const saveSession = (teamId, userType) => {
        try {
            localStorage.setItem('fanta_session_id', teamId);
            localStorage.setItem('fanta_session_type', userType);
        } catch (e) {
            console.error("Impossibile salvare la sessione in localStorage.", e);
        }
    };

    /**
     * Cancella i dati della sessione da localStorage.
     */
    const clearSession = () => {
        try {
            localStorage.removeItem('fanta_session_id');
            localStorage.removeItem('fanta_session_type');
            localStorage.removeItem('fanta_coach_name'); // NUOVO: Rimuove il nome Allenatore temporaneo
        } catch (e) {
            console.error("Impossibile pulire la sessione da localStorage.", e);
        }
    };
    
    /**
     * Carica i dati della sessione salvata e tenta l'accesso diretto.
     */
    const restoreSession = async () => {
        const teamId = localStorage.getItem('fanta_session_id');
        const userType = localStorage.getItem('fanta_session_type');
        
        if (!teamId || !userType) {
            return false; // Nessuna sessione salvata
        }
        
        // Se la squadra non ha ancora scelto l'allenatore, usa i dati temporanei in localStorage
        const requiresCoachSelection = localStorage.getItem('fanta_needs_coach') === 'true';
        const requiresCaptainSelection = localStorage.getItem('fanta_needs_captain') === 'true';

        // Tenta l'accesso Admin
        if (userType === 'admin' && teamId === ADMIN_USERNAME_LOWER) {
            console.log("Sessione Admin ripristinata.");
            window.showScreen(adminContent);
            document.dispatchEvent(new CustomEvent('adminLoggedIn'));
            return true;
        }

        // Tenta l'accesso Utente
        if (userType === 'user') {
            try {
                const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamId);
                const teamDoc = await getDoc(teamDocRef);

                if (teamDoc.exists()) {
                    const teamData = teamDoc.data();
                    currentTeamData = teamData;
                    await fetchAllTeamLogos(); 
                    
                    if (requiresCoachSelection && !teamData.coach) {
                         // Ricarica la schermata di selezione allenatore
                         console.log("Sessione Utente ripristinata. In attesa di selezione Allenatore.");
                         window.showScreen(coachSelectionBox);
                         initializeCoachSelection();
                         return true;
                    }

                    if (requiresCaptainSelection && !teamData.captainId) {
                         // Ricarica la schermata di selezione capitano
                         console.log("Sessione Utente ripristinata. In attesa di selezione Capitano.");
                         window.showScreen(captainSelectionBox);
                         initializeCaptainSelection();
                         return true;
                    }

                    console.log(`Sessione Utente per ${teamData.teamName} ripristinata.`);
                    updateTeamUI(teamData.teamName, teamDocRef.id, teamData.logoUrl, false);
                    window.showScreen(appContent);
                    return true;
                }
            } catch (error) {
                console.error("Errore nel ripristino della sessione utente:", error);
                clearSession(); // Pulisce la sessione rotta
                return false;
            }
        }
        
        clearSession(); // Sessione non valida o rotta
        return false;
    };
    
    // --- FINE GESTIONE PERSISTENZA SESSIONE ---
    
    
    /**
     * Gestisce il click sul logo per richiedere un nuovo URL.
     */
    const handleLogoClick = async () => {
        // ... (handleLogoClick rimane invariata) ...
        if (!currentTeamId) return;

        const newLogoUrl = prompt("Inserisci il link (URL) del nuovo logo della squadra:", teamLogoElement.src);
        
        if (newLogoUrl === null) {
            return;
        }

        const trimmedUrl = newLogoUrl.trim();
        
        if (trimmedUrl === "" || !trimmedUrl.startsWith('http')) {
             const finalUrl = trimmedUrl.startsWith('http') ? trimmedUrl : DEFAULT_LOGO_URL;
             if (trimmedUrl !== "" && !trimmedUrl.startsWith('http')) {
                 // Sostituito alert() con una simulazione (ideale sarebbe una modale personalizzata)
                 console.warn("Per favore, inserisci un URL valido (deve iniziare con http/https). Verrà utilizzato il placeholder.");
             }
             teamLogoElement.src = finalUrl;
             currentTeamData.logoUrl = finalUrl;
             await saveLogoUrl(finalUrl);
             return;
        }
        
        teamLogoElement.src = trimmedUrl;
        currentTeamData.logoUrl = trimmedUrl;
        
        await saveLogoUrl(trimmedUrl);
    };

    /**
     * Salva l'URL del logo su Firestore.
     */
    const saveLogoUrl = async (url) => {
        // ... (saveLogoUrl rimane invariata) ...
        try {
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            await updateDoc(teamDocRef, {
                logoUrl: url
            });
            teamLogosMap[currentTeamId] = url;
            console.log("Logo aggiornato su Firestore con successo.");
        } catch (error) {
            console.error("Errore nel salvataggio del logo:", error);
            // Sostituito alert()
            console.error("Errore nel salvataggio del logo su Firestore. Controlla la console.");
        }
    };
    
    /**
     * Carica e visualizza la prossima partita da giocare per la squadra corrente.
     */
    const loadNextMatch = async () => {
        // ... (loadNextMatch rimane invariata) ...
        if (!currentTeamId || !currentTeamData || !nextMatchPreview) return;
        
        nextMatchPreview.innerHTML = `<p class="text-gray-400 font-semibold">Ricerca prossima sfida...</p>`;

        try {
            const { doc, getDoc } = firestoreTools;
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);
            
            if (!scheduleDoc.exists() || !scheduleDoc.data().matches) {
                nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Calendario non generato dall'Admin.</p>`;
                return;
            }
            
            const allRounds = scheduleDoc.data().matches;
            let nextMatch = null;

            for (const round of allRounds) {
                if (!round.matches) continue; 

                const match = round.matches.find(m => 
                    m.result === null && (m.homeId === currentTeamId || m.awayId === currentTeamId)
                );
                if (match) {
                    nextMatch = match;
                    break;
                }
            }

            if (nextMatch) {
                const opponentId = nextMatch.homeId === currentTeamId ? nextMatch.awayId : nextMatch.homeId;
                const opponentName = nextMatch.homeId === currentTeamId ? nextMatch.awayName : nextMatch.homeName;
                const isHome = nextMatch.homeId === currentTeamId;
                const statusColor = isHome ? 'text-green-300' : 'text-red-300';
                const statusText = isHome ? 'IN CASA' : 'FUORI CASA';
                
                // --- LOGICA LOGHI ---
                const homeLogo = getLogoHtml(nextMatch.homeId);
                const awayLogo = getLogoHtml(nextMatch.awayId);
                // --- FINE LOGICA LOGHI ---
                
                nextMatchPreview.innerHTML = `
                    <p class="text-sm text-gray-300 font-semibold mb-1">PROSSIMA SFIDA (Giornata ${nextMatch.round} / ${nextMatch.type})</p>
                    <div class="flex justify-center items-center space-x-4">
                        
                        <!-- SQUADRA CASA: Logo a Sinistra del Nome -->
                        <span class="text-xl font-extrabold text-white flex items-center">
                            ${homeLogo} <span class="ml-2">${nextMatch.homeName}</span>
                        </span>
                        
                        <span class="text-2xl font-extrabold text-orange-400">VS</span>
                        
                        <!-- SQUADRA OSPITE: Logo a Destra del Nome -->
                        <span class="text-xl font-extrabold text-white flex items-center">
                            <span class="mr-2">${nextMatch.awayName}</span> ${awayLogo}
                        </span>

                    </div>
                    <p class="text-sm font-semibold mt-1 ${statusColor}">Giochi ${statusText}</p>
                `;
            } else {
                nextMatchPreview.innerHTML = `<p class="text-green-400 font-semibold">Hai giocato tutte le partite! Campionato concluso.</p>`;
            }

        } catch (error) {
            console.error("Errore nel caricamento prossima partita:", error);
            nextMatchPreview.innerHTML = `<p class="text-red-400 font-semibold">Errore nel caricamento sfida. Controlla la console.</p>`;
        }
    };
    

    // Collega l'evento click al logo
    document.addEventListener('click', (e) => {
        if (e.target.id === 'team-logo') {
            handleLogoClick();
        }
    });

    // Funzione helper per il logout (definita in interfaccia.js per renderla globale)
    window.handleLogout = () => {
        console.log("Logout Utente effettuato. Torno alla schermata di login.");
        
        clearSession(); // Pulisce la sessione
        localStorage.removeItem('fanta_needs_captain'); // Pulisce lo stato Capitano
        localStorage.removeItem('fanta_needs_coach'); // NUOVO: Pulisce lo stato Allenatore
        
        loginPasswordInput.value = '';
        window.showScreen(loginBox);
        currentTeamId = null;
        currentTeamData = null; 
        if (teamLogoElement) teamLogoElement.src = DEFAULT_LOGO_URL;
        
        // Resetta le statistiche nella dashboard
        if (statRosaLevel) statRosaLevel.textContent = 'N/A';
        if (statFormazioneLevel) statFormazioneLevel.textContent = 'N/A';
        if (statRosaCount) statRosaCount.textContent = `(${0} giocatori)`;
        if (statCoachName) statCoachName.textContent = 'N/A'; // NUOVO: resetta Allenatore
        if (statCoachLevel) statCoachLevel.textContent = '1';  // NUOVO: resetta Livello
    };
    
    userLogoutButton.addEventListener('click', window.handleLogout);


    // -------------------------------------------------------------------
    // LOGICA ELIMINAZIONE SQUADRA (NUOVO)
    // -------------------------------------------------------------------

    /**
     * Apre la modale di conferma per l'eliminazione della squadra.
     */
    const openDeleteTeamModal = () => {
        if (!currentTeamData || !deleteTeamModal) return;

        teamNameToDeleteSpan.textContent = currentTeamData.teamName;
        deleteConfirmationInput.value = '';
        deleteMessage.textContent = '';
        btnConfirmDeleteFinal.disabled = true;

        deleteTeamModal.classList.remove('hidden');
        deleteTeamModal.style.display = 'flex'; // Assicura che sia visibile
    };

    /**
     * Chiude la modale di conferma.
     */
    const closeDeleteTeamModal = () => {
        if (deleteTeamModal) {
            deleteTeamModal.classList.add('hidden');
            deleteTeamModal.style.display = 'none';
        }
    };
    
    /**
     * Controlla l'input di conferma e abilita/disabilita il bottone finale.
     */
    const checkConfirmationInput = () => {
        const value = deleteConfirmationInput.value.trim();
        if (value === "ELIMINA") {
            btnConfirmDeleteFinal.disabled = false;
            deleteMessage.textContent = "Pronto per l'eliminazione.";
            deleteMessage.classList.remove('text-red-400');
            deleteMessage.classList.add('text-green-500');
        } else {
            btnConfirmDeleteFinal.disabled = true;
            deleteMessage.textContent = '';
        }
    };
    
    /**
     * Esegue l'eliminazione effettiva del documento della squadra.
     */
    const handleFinalTeamDeletion = async () => {
        if (!currentTeamId || deleteConfirmationInput.value !== "ELIMINA") return;

        btnConfirmDeleteFinal.disabled = true;
        btnConfirmDeleteFinal.textContent = 'Eliminazione in corso...';
        deleteMessage.textContent = 'Contatto Firestore per eliminare il documento...';
        deleteMessage.classList.remove('text-green-500');
        deleteMessage.classList.add('text-yellow-400');

        try {
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            
            // Elimina il documento della squadra
            await deleteDoc(teamDocRef);

            deleteMessage.textContent = 'Squadra eliminata con successo! Reindirizzamento...';
            deleteMessage.classList.remove('text-yellow-400');
            deleteMessage.classList.add('text-green-500');
            
            // Logout e reindirizzamento
            setTimeout(() => {
                closeDeleteTeamModal();
                window.handleLogout(); // Questa funzione pulisce la sessione e reindirizza al login
            }, 1500);

        } catch (error) {
            console.error("Errore durante l'eliminazione della squadra:", error);
            deleteMessage.textContent = `Errore critico: ${error.message}. Riprova o contatta l'Admin.`;
            deleteMessage.classList.remove('text-yellow-400');
            deleteMessage.classList.add('text-red-400');
            btnConfirmDeleteFinal.textContent = 'Conferma Eliminazione';
            btnConfirmDeleteFinal.disabled = false;
        }
    };

    // Cablaggi per la Modale Eliminazione
    if (btnDeleteTeam) btnDeleteTeam.addEventListener('click', openDeleteTeamModal);
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteTeamModal);
    if (deleteConfirmationInput) deleteConfirmationInput.addEventListener('input', checkConfirmationInput);
    if (btnConfirmDeleteFinal) btnConfirmDeleteFinal.addEventListener('click', handleFinalTeamDeletion);
    
    // Assicurati che l'input sia in maiuscolo
    if (deleteConfirmationInput) deleteConfirmationInput.style.textTransform = 'uppercase';

    // -------------------------------------------------------------------
    // LOGICA DI NAVIGAZIONE SQUADRA (Gestione interna)
    // -------------------------------------------------------------------
    btnGestioneRosa.addEventListener('click', () => {
        window.showScreen(squadraContent);
        document.dispatchEvent(new CustomEvent('squadraPanelLoaded', { detail: { mode: 'rosa', teamId: currentTeamId } }));
    });
    btnGestioneFormazione.addEventListener('click', () => {
        window.showScreen(squadraContent);
        document.dispatchEvent(new CustomEvent('squadraPanelLoaded', { detail: { mode: 'formazione', teamId: currentTeamId } }));
    });
    btnDraftUtente.addEventListener('click', () => {
        const draftAdminContent = document.getElementById('draft-content');
        if (draftAdminContent) {
            window.showScreen(draftAdminContent);
            document.dispatchEvent(new CustomEvent('draftPanelLoaded', { detail: { mode: 'utente', teamId: currentTeamId } }));
        }
    });
    
    // NUOVO: BOTTONE MERCATO
    btnMercatoUtente.addEventListener('click', () => {
        const mercatoContentRef = document.getElementById('mercato-content');
        if (mercatoContentRef) {
            window.showScreen(mercatoContentRef);
            document.dispatchEvent(new CustomEvent('mercatoPanelLoaded', { detail: { teamId: currentTeamId } }));
        }
    });
    
    // CABLAGGI PER LA DASHBOARD UTENTE
    if (btnDashboardLeaderboard) {
        btnDashboardLeaderboard.addEventListener('click', () => {
            window.showScreen(leaderboardContent);
            loadLeaderboard(); 
        });
    }
    if (btnDashboardSchedule) {
        btnDashboardSchedule.addEventListener('click', () => {
            window.showScreen(scheduleContent);
            loadSchedule(); 
        });
    }


    // -------------------------------------------------------------------
    // LOGICA DI NAVIGAZIONE PUBBLICA (Classifica e Calendario)
    // -------------------------------------------------------------------
    
    // Classifica (Login Page)
    btnLeaderboard.addEventListener('click', () => {
        window.showScreen(leaderboardContent);
        loadLeaderboard();
    });
    
    // Calendario (Login Page)
    btnSchedule.addEventListener('click', () => {
        window.showScreen(scheduleContent);
        loadSchedule(); 
    });
    
    // Ritorno dal Pubblico
    leaderboardBackButton.addEventListener('click', () => {
        window.showScreen(currentTeamId ? appContent : loginBox);
    });
    scheduleBackButton.addEventListener('click', () => {
        window.showScreen(currentTeamId ? appContent : loginBox);
    });
    
    /**
     * Carica e visualizza il calendario completo delle partite.
     */
    const loadSchedule = async () => {
        const { doc, getDoc } = firestoreTools;
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);

        const scheduleDisplayContainer = document.getElementById('schedule-content') ? document.getElementById('schedule-content').querySelector('.football-box > div:not([id])') : null;
        if (!scheduleDisplayContainer) return;


        scheduleDisplayContainer.innerHTML = `
            <p class="text-white font-semibold">Caricamento Calendario...</p>
            <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-teal-500 text-center shadow-lg">
                 <p class="text-gray-400">Recupero dati da Firestore.</p>
            </div>
        `;

        try {
            await fetchAllTeamLogos(); 

            const scheduleDoc = await getDoc(scheduleDocRef);
            
            if (!scheduleDoc.exists() || !scheduleDoc.data().matches || scheduleDoc.data().matches.length === 0) {
                scheduleDisplayContainer.innerHTML = `
                    <p class="text-white font-semibold text-center mb-4">Nessun Calendario Disponibile.</p>
                    <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                        <p class="text-red-400 font-semibold">Il calendario deve essere generato dall'Admin nell'area Impostazioni Campionato.</p>
                    </div>
                `;
                return;
            }

            const scheduleData = scheduleDoc.data().matches;
            const totalRounds = scheduleData.length > 0 ? scheduleData[scheduleData.length - 1].round : 0;

            let scheduleHtml = `<p class="text-white font-semibold text-xl mb-4">Calendario Completo: ${totalRounds} Giornate</p>`;

            scheduleData.forEach(roundData => {
                const roundNum = roundData.round;
                const roundType = roundData.matches[0].type;
                const roundBg = roundType === 'Ritorno' ? 'bg-teal-700' : 'bg-gray-700';

                scheduleHtml += `
                    <div class="mb-6 p-4 rounded-lg ${roundBg} border border-teal-500 shadow-md">
                        <h4 class="font-bold text-lg text-yellow-300 border-b border-gray-600 pb-1">
                            GIORNATA ${roundNum} (${roundType})
                        </h4>
                        <ul class="mt-2 space-y-1 text-white">
                            ${roundData.matches.map(match => `
                                <li class="text-sm p-1 rounded hover:bg-gray-600 transition flex items-center justify-between">
                                    
                                    <!-- SQUADRA CASA: Logo a Sinistra -->
                                    <span class="flex items-center">
                                        ${getLogoHtml(match.homeId)} <span class="ml-2">${match.homeName}</span>
                                    </span> 
                                    
                                    ${match.result ? `<span class="font-bold text-red-300">${match.result}</span>` : '<span class="text-gray-400">vs</span>'} 
                                    
                                    <!-- SQUADRA OSPITE: Logo a Destra -->
                                    <span class="flex items-center text-right">
                                        <span class="mr-2">${match.awayName}</span> ${getLogoHtml(match.awayId)}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `;
            });


            scheduleDisplayContainer.innerHTML = scheduleHtml;

        } catch (error) {
            console.error("Errore nel caricamento del calendario:", error);
            scheduleDisplayContainer.innerHTML = `
                <p class="text-white font-semibold text-center mb-4">Errore di Connessione</p>
                <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                    <p class="text-red-400">Impossibile caricare il calendario. Controlla la tua connessione.</p>
                </div>
            `;
        }
    };
    
    /**
     * Carica e visualizza la classifica completa.
     */
    const loadLeaderboard = async () => {
        const { doc, getDoc } = firestoreTools;
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);

        const leaderboardDisplayContainer = document.getElementById('leaderboard-content') ? document.getElementById('leaderboard-content').querySelector('.football-box > div:not([id])') : null;
        if (!leaderboardDisplayContainer) return;

        leaderboardDisplayContainer.innerHTML = `
            <p class="text-white font-semibold text-center">Caricamento Classifica...</p>
            <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-blue-500 text-center shadow-lg">
                 <p class="text-gray-400">Recupero dati da Firestore.</p>
            </div>
        `;

        try {
            await fetchAllTeamLogos(); 

            const leaderboardDoc = await getDoc(leaderboardDocRef);
            
            if (!leaderboardDoc.exists() || !leaderboardDoc.data().standings || leaderboardDoc.data().standings.length === 0) {
                leaderboardDisplayContainer.innerHTML = `
                    <p class="text-white font-semibold text-center mb-4">Classifica non disponibile.</p>
                    <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                        <p class="text-red-400 font-semibold">Simula la prima giornata per generare la classifica.</p>
                    </div>
                `;
                return;
            }

            const standings = leaderboardDoc.data().standings;
            let leaderboardHtml = `
                <h3 class="text-2xl font-extrabold text-blue-400 mb-4 text-center">Classifica Generale</h3>
                <div class="bg-gray-800 rounded-lg overflow-x-auto shadow-xl">
                    <table class="min-w-full divide-y divide-gray-700">
                        <thead class="bg-blue-600 text-white">
                            <tr>
                                <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">#</th>
                                <th class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Squadra</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">Pti</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">G</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">V</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">N</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">P</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">GF</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">GS</th>
                                <th class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider">DG</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-700 text-white">
                            ${standings.map((team, index) => `
                                <tr class="${index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-gray-500 transition duration-150">
                                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium">${index + 1}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm font-semibold flex items-center">
                                        ${getLogoHtml(team.teamId)} <span class="ml-2">${team.teamName}</span>
                                    </td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-extrabold text-yellow-300">${team.points}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.played}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-green-400">${team.wins}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-300">${team.draws}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center text-red-400">${team.losses}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.goalsFor}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center">${team.goalsAgainst}</td>
                                    <td class="px-3 py-2 whitespace-nowrap text-sm text-center font-bold">${team.goalsFor - team.goalsAgainst}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            leaderboardDisplayContainer.innerHTML = leaderboardHtml;

        } catch (error) {
            console.error("Errore nel caricamento della classifica:", error);
            leaderboardDisplayContainer.innerHTML = `
                <p class="text-white font-semibold text-center mb-4">Errore di Connessione</p>
                <div class="mt-8 p-6 bg-gray-700 rounded-lg border-2 border-red-500 text-center shadow-lg">
                    <p class="text-red-400">Impossibile caricare la classifica. Controlla la tua connessione.</p>
                </div>
            `;
        }
    };


    // -------------------------------------------------------------------
    // NUOVA LOGICA: SELEZIONE ALLENATORE
    // -------------------------------------------------------------------
    
    /**
     * Inizializza la schermata di selezione Allenatore.
     */
    const initializeCoachSelection = () => {
         coachNameInput.value = localStorage.getItem('fanta_coach_name') || ''; // Tenta di ripristinare il nome
         coachSelectionMessage.textContent = 'Inserisci il nome del tuo Allenatore.';
         coachSelectionMessage.classList.remove('text-green-500');
         coachSelectionMessage.classList.add('text-red-400');
         btnConfirmCoach.disabled = false;
         
         btnConfirmCoach.addEventListener('click', handleCoachConfirmation);
         coachNameInput.addEventListener('keypress', (e) => {
             if (e.key === 'Enter') handleCoachConfirmation();
         });
    };
    
    /**
     * Gestisce la conferma dell'Allenatore e passa alla selezione Capitano.
     */
    const handleCoachConfirmation = async () => {
        const coachName = coachNameInput.value.trim();
        
        if (!coachName) {
            coachSelectionMessage.textContent = "Il nome dell'allenatore è obbligatorio!";
            return;
        }

        btnConfirmCoach.textContent = 'Confermato. Vai al Capitano...';
        btnConfirmCoach.disabled = true;
        
        // Salva temporaneamente il nome dell'allenatore in localStorage
        localStorage.setItem('fanta_coach_name', coachName); 
        localStorage.removeItem('fanta_needs_coach'); // Coach è stato scelto, rimuoviamo il flag
        localStorage.setItem('fanta_needs_captain', 'true'); // Passiamo al flag Capitano

        // Carica la schermata di selezione Capitano
        setTimeout(() => {
            window.showScreen(captainSelectionBox);
            initializeCaptainSelection();
        }, 500);
    };


    // -------------------------------------------------------------------
    // NUOVA LOGICA: SELEZIONE CAPITANO (Modificata per la sostituzione)
    // -------------------------------------------------------------------

    /**
     * Inizializza la schermata di selezione Capitano.
     */
    const initializeCaptainSelection = () => {
        
        // Genera i candidati solo se non sono già stati generati
        if (captainCandidates.length === 0) {
            captainCandidates = generateCaptainCandidates();
        }
        
        captainCandidatesContainer.innerHTML = captainCandidates.map(player => `
             <div data-player-id="${player.id}"
                  data-role="${player.role}"
                  class="captain-card p-4 bg-gray-700 rounded-lg border-2 border-orange-700 shadow-xl text-center cursor-pointer hover:bg-gray-600 transition duration-150">
                 
                 <!-- Immagine del Capitano -->
                 <img src="${player.photoUrl.replace('Capitano', player.name.split(' ')[0])}" 
                      alt="Capitano ${player.role}" 
                      class="w-24 h-24 rounded-full mx-auto mb-3 object-cover border-4 border-gray-500">
                 
                 <p class="text-lg font-extrabold text-white">${player.name}</p>
                 <p class="text-sm font-semibold text-yellow-400">${player.role}</p>
                 <p class="text-xs text-gray-400">Livello Iniziale: ${player.level} (Fisso)</p>
                 <p class="text-xs text-gray-400">Costo Stimato: ${player.cost} CS</p>
                 <p class="captain-flag text-green-400 font-bold mt-2 hidden">CAPITANO SCELTO!</p>
             </div>
        `).join('');
        
        captainSelectionError.textContent = 'Per favore, scegli un giocatore.';
        
        captainCandidatesContainer.addEventListener('click', handleCaptainCardClick);
        btnConfirmCaptain.addEventListener('click', handleCaptainConfirmation);
        // Abilita il bottone se un capitano era già selezionato (in caso di restore sessione)
        const previouslySelected = btnConfirmCaptain.dataset.selectedCaptainId;
        btnConfirmCaptain.disabled = !previouslySelected; 
    };

    /**
     * Gestisce la selezione di una carta Capitano.
     */
    const handleCaptainCardClick = (event) => {
        const card = event.target.closest('.captain-card');
        if (!card) return;
        
        const selectedId = card.dataset.playerId;
        
        // Rimuovi selezione precedente e nascondi flag
        captainCandidatesContainer.querySelectorAll('.captain-card').forEach(c => {
            c.classList.remove('border-green-500', 'bg-gray-600', 'transform', 'scale-[1.05]');
            c.classList.add('border-orange-700');
            c.querySelector('.captain-flag').classList.add('hidden');
        });
        
        // Aggiungi nuova selezione
        card.classList.remove('border-orange-700');
        card.classList.add('border-green-500', 'bg-gray-600', 'transform', 'scale-[1.05]');
        card.querySelector('.captain-flag').classList.remove('hidden');
        
        // Abilita il bottone di conferma e salva l'ID temporaneamente
        btnConfirmCaptain.dataset.selectedCaptainId = selectedId;
        btnConfirmCaptain.disabled = false;
        captainSelectionError.textContent = `Capitano selezionato! Premi conferma.`;
        captainSelectionError.classList.remove('text-red-400');
        captainSelectionError.classList.add('text-green-500');
    };

    /**
     * Gestisce la conferma del Capitano e salva in Firestore.
     */
    const handleCaptainConfirmation = async () => {
        const selectedCaptainId = btnConfirmCaptain.dataset.selectedCaptainId;
        const savedCoachName = localStorage.getItem('fanta_coach_name'); // Recupera il nome Allenatore

        if (!selectedCaptainId || !currentTeamId) {
             captainSelectionError.textContent = "Errore critico: Capitano o ID Squadra mancante. Riprova il login.";
             captainSelectionError.classList.add('text-red-400');
             btnConfirmCaptain.disabled = true;
             return;
        }
        
        if (!savedCoachName) {
             captainSelectionError.textContent = "Errore critico: Nome Allenatore mancante. Torna al login.";
             captainSelectionError.classList.add('text-red-400');
             btnConfirmCaptain.disabled = true;
             return;
        }

        const selectedCaptain = captainCandidates.find(p => p.id === selectedCaptainId);
        
        if (!selectedCaptain) {
             captainSelectionError.textContent = "Errore critico: Capitano non trovato. Riprova il login.";
             captainSelectionError.classList.add('text-red-400');
             btnConfirmCaptain.disabled = true;
             return;
        }
        
        btnConfirmCaptain.textContent = 'Salvataggio Rosa...';
        btnConfirmCaptain.disabled = true;

        try {
            const { doc, updateDoc } = firestoreTools;
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, currentTeamId);
            
            // 1. ROSA INIZIALE CORRENTE (quella creata al login: P, D, C1, C2, A)
            const initialSquad = [...INITIAL_SQUAD];
            
            // 2. Ruolo del Capitano scelto
            const captainRole = selectedCaptain.role; // P, D, C, o A

            // 3. Trova e sostituisci il giocatore base con lo stesso ruolo
            let playerReplaced = false;
            let finalCaptainId = selectedCaptain.id; // Fallback, ma useremo l'ID del giocatore base
            
            const finalSquad = initialSquad.map(player => {
                // Sostituisci solo la prima occorrenza del ruolo corrispondente
                if (player.role === captainRole && !playerReplaced) {
                    playerReplaced = true;
                    // MANTENIAMO L'ID del giocatore base sostituito per consistenza nel DB
                    finalCaptainId = player.id; 
                    // Assegna i dati del Capitano (nome, livello, tipo, isCaptain=true) ma con l'ID del giocatore base
                    return { ...selectedCaptain, id: finalCaptainId }; 
                }
                return player;
            });
            
            // Se la sostituzione non è avvenuta (non dovrebbe succedere con i ruoli P, D, C, A)
            if (!playerReplaced) {
                 finalSquad.push({ ...selectedCaptain, id: crypto.randomUUID() });
                 console.warn("ATTENZIONE: Nessun giocatore base con ruolo corrispondente trovato per la sostituzione. Rosa allungata.");
            }
            

            // 4. Oggetto Allenatore
            const coachData = {
                name: savedCoachName,
                level: 1, // Livello iniziale 1
                xp: 0
            };

            // 5. Aggiorna i dati della squadra (rosa, formazione, ID capitano, e ALLENATORE)
            await updateDoc(teamDocRef, {
                players: finalSquad,
                // Salviamo l'ID finale del Capitano
                captainId: finalCaptainId, 
                coach: coachData, // Inserisce i dati dell'allenatore
                // Inizializza la formazione con la nuova rosa di 5
                formation: {
                    modulo: '1-1-2-1',
                    titolari: finalSquad, 
                    panchina: []
                }
            });
            
            // 6. Aggiorna i dati globali e la sessione
            currentTeamData.players = finalSquad;
            currentTeamData.captainId = finalCaptainId;
            currentTeamData.coach = coachData;
            currentTeamData.formation = {
                 modulo: '1-1-2-1',
                 titolari: finalSquad, 
                 panchina: []
            };
            localStorage.removeItem('fanta_needs_captain'); // Rimuove il flag di stato
            localStorage.removeItem('fanta_coach_name'); // Rimuove il nome Allenatore temporaneo
            
            captainSelectionError.textContent = `Capitano ${selectedCaptain.name} confermato!`;
            captainSelectionError.classList.remove('text-red-400');
            captainSelectionError.classList.add('text-green-500');
            
            // Reindirizza alla Dashboard
            setTimeout(() => {
                updateTeamUI(currentTeamData.teamName, teamDocRef.id, currentTeamData.logoUrl, true);
                window.showScreen(appContent);
            }, 1000);

        } catch (error) {
            console.error("Errore nel salvataggio del Capitano:", error);
            captainSelectionError.textContent = `Errore di salvataggio: ${error.message}`;
            captainSelectionError.classList.add('text-red-400');
            btnConfirmCaptain.textContent = 'Riprova la Conferma';
            btnConfirmCaptain.disabled = false;
        }
    };


    // -------------------------------------------------------------------
    // LOGICA GATE (Password Iniziale)
    // -------------------------------------------------------------------

    const handleGateAccess = () => {
        const password = gatePasswordInput.value.trim();
        
        gateMessage.textContent = "";

        if (password === MASTER_PASSWORD) { 
            gateMessage.textContent = "Accesso Gate Confermato. Prosegui al Login...";
            gateMessage.classList.remove('text-red-400');
            gateMessage.classList.add('text-green-500');

            // Salta il gate, ma non salvare la sessione gate
            setTimeout(() => {
                window.showScreen(loginBox);
                loginUsernameInput.focus();
            }, 1000);

        } else {
            gateMessage.textContent = "Password d'accesso errata. Riprova.";
            gateMessage.classList.remove('text-green-500');
            gateMessage.classList.add('text-red-400');
            gatePasswordInput.value = '';
        }
    };

    // Cablaggi per il Gate Box
    if (gateButton) gateButton.addEventListener('click', handleGateAccess);
    if (gatePasswordInput) gatePasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGateAccess();
    });
    
    // -------------------------------------------------------------------
    // LOGICA LOGIN (Nome Squadra / Password) - Gestisce Admin o Utente
    // -------------------------------------------------------------------

    const handleLoginAccess = async () => {
        const inputTeamName = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value.trim();
        const userId = auth.currentUser ? auth.currentUser.uid : 'anon_user';
        
        loginMessage.textContent = "Accesso in corso...";
        loginMessage.classList.remove('text-red-400');
        loginMessage.classList.add('text-green-500');
        
        if (!inputTeamName || !password) {
            loginMessage.textContent = "Inserisci Nome Squadra e Password.";
            loginMessage.classList.remove('text-green-500');
            loginMessage.classList.add('text-red-400');
            return;
        }

        // --- PULIZIA E NORMALIZZAZIONE DELL'USERNAME ---
        const cleanedTeamName = inputTeamName.replace(/\s/g, ''); // Rimuove tutti gli spazi bianchi
        const teamDocId = cleanedTeamName.toLowerCase(); // L'ID del documento è tutto minuscolo

        if (inputTeamName.includes(' ') || inputTeamName !== cleanedTeamName) {
             loginMessage.textContent = "Errore: Il Nome Squadra non può contenere spazi bianchi. Riprova.";
             loginMessage.classList.remove('text-green-500');
             loginMessage.classList.add('text-red-400');
             return;
        }
        
        // --- BLOCCO NOME RISERVATO (ADMIN) ---
        if (teamDocId === ADMIN_USERNAME_LOWER) {
            if (password !== ADMIN_PASSWORD) {
                loginMessage.textContent = "Password Amministratore non valida.";
                loginMessage.classList.remove('text-green-500');
                loginMessage.classList.add('text-red-400');
                return;
            }
            
            // Accesso Admin Riuscito -> SALVA SESSIONE ADMIN
            saveSession(teamDocId, 'admin');

            loginMessage.textContent = "Accesso Amministratore Riuscito!";
            setTimeout(() => {
                window.showScreen(adminContent);
                document.dispatchEvent(new CustomEvent('adminLoggedIn')); 
            }, 1000);
            return;
        }
        // --- FINE BLOCCO NOME RISERVATO ---

        try {
            // Logica di accesso UTENTE STANDARD (Firestore)
            const teamDocRef = doc(db, TEAMS_COLLECTION_PATH, teamDocId);
            const teamDoc = await getDoc(teamDocRef);
            
            let isNewTeam = false;
            let teamData = {};
            const teamNameForDisplay = inputTeamName;

            if (teamDoc.exists()) {
                teamData = teamDoc.data();
                
                if (teamData.password !== password) {
                    throw new Error("Password squadra non valida.");
                }
                
                loginMessage.textContent = `Bentornato ${teamNameForDisplay}! Accesso Riuscito.`;
                
                currentTeamData = teamData;
                await fetchAllTeamLogos();

                // 1. Verifica Allenatore (se manca)
                if (!teamData.coach) {
                    // La squadra è stata creata ma manca l'Allenatore: reindirizza alla selezione
                    saveSession(teamDocId, 'user');
                    localStorage.setItem('fanta_needs_coach', 'true');
                    
                    setTimeout(() => {
                        currentTeamId = teamDocRef.id;
                        window.showScreen(coachSelectionBox);
                        initializeCoachSelection();
                        loginPasswordInput.value = '';
                    }, 1000);
                    return;
                }
                
                // 2. Verifica Capitano (se manca)
                if (!teamData.captainId) {
                    // La squadra ha l'Allenatore ma manca il Capitano: reindirizza alla selezione
                    saveSession(teamDocId, 'user');
                    localStorage.setItem('fanta_needs_captain', 'true');
                    
                    setTimeout(() => {
                        currentTeamId = teamDocRef.id;
                        window.showScreen(captainSelectionBox);
                        initializeCaptainSelection();
                        loginPasswordInput.value = '';
                    }, 1000);
                    return;
                }

            } else {
                // NUOVA SQUADRA: Crea il documento con i 5 giocatori base (P, D, C1, C2, A)
                isNewTeam = true;
                const initialBudget = 500;
                
                teamData = {
                    teamName: teamNameForDisplay,
                    ownerUserId: userId,
                    password: password, 
                    budget: initialBudget,
                    creationDate: new Date().toISOString(),
                    logoUrl: DEFAULT_LOGO_URL, // Logo di default
                    players: INITIAL_SQUAD, 
                    coach: null, // Manca l'allenatore
                    captainId: null, // Flag che indica che la selezione è in sospeso
                    formation: {
                        modulo: '1-1-2-1',
                        titolari: INITIAL_SQUAD, 
                        panchina: []
                    },
                    isParticipating: false // Flag di partecipazione di default a false
                };

                await setDoc(teamDocRef, teamData);
                
                // SALVA SESSIONE TEMPORANEA E REINDIRIZZA ALL'ALLENATORE
                saveSession(teamDocId, 'user');
                localStorage.setItem('fanta_needs_coach', 'true'); // Flag per il ripristino
                
                // Imposta l'ID corrente
                currentTeamId = teamDocRef.id;
                currentTeamData = teamData; // Imposta i dati temporanei globali
                
                loginMessage.textContent = `Congratulazioni! Squadra '${teamNameForDisplay}' creata! Scegli il tuo Allenatore...`;
                
                setTimeout(() => {
                    window.showScreen(coachSelectionBox);
                    initializeCoachSelection();
                    loginPasswordInput.value = '';
                }, 1000);
                return;
            }

            // Accesso Utente Riuscito (Squadra esistente, Allenatore e Capitano scelti) -> SALVA SESSIONE UTENTE
            saveSession(teamDocId, 'user');
            localStorage.removeItem('fanta_needs_coach');
            localStorage.removeItem('fanta_needs_captain');
            
            // Mostra la dashboard utente
            setTimeout(() => {
                updateTeamUI(teamNameForDisplay, teamDocRef.id, teamData.logoUrl, isNewTeam);
                window.showScreen(appContent);
                loginPasswordInput.value = '';
            }, 1000);
            
        } catch (error) {
            console.error("Errore di accesso/creazione:", error);
            loginMessage.textContent = `Errore: ${error.message}`;
            loginMessage.classList.remove('text-green-500');
            loginMessage.classList.add('text-red-400');
        }
    };

    loginButton.addEventListener('click', handleLoginAccess);
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLoginAccess();
    });
    loginUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLoginAccess();
    });

    // --- LOGICA DI AVVIO ---
    
    // Inizializzazione: Assicurati che solo il Gate Box sia visibile all'inizio
    const initApp = async () => {
        if (gateBox) {
            // Tenta di ripristinare la sessione all'avvio
            const sessionRestored = await restoreSession(); 
            
            if (!sessionRestored) {
                // Se non c'è sessione, mostra il Gate Box
                gateBox.classList.remove('hidden-on-load');
                window.showScreen(gateBox);
            }
        }
    };

    // Chiama la funzione di inizializzazione dopo che il DOM è pronto e Firebase è pronto
    setTimeout(initApp, 0); // Esegui subito dopo il thread principale del DOMContentLoaded
    // --- FINE LOGICA DI AVVIO ---
    
});