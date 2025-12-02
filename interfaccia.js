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

document.addEventListener('DOMContentLoaded', () => {
    // Verifica che gli oggetti globali Firebase siano disponibili
    if (typeof window.auth === 'undefined' || typeof window.db === 'undefined' || typeof window.firestoreTools === 'undefined' || typeof window.showScreen === 'undefined') {
        // Se non sono pronti, attendi un momento (o gestisci l'errore)
        console.warn("Servizi Firebase o showScreen non pronti, ritento caricamento interfaccia...");
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
    }

    // Assegna gli oggetti Firebase globali
    auth = window.auth;
    db = window.db;
    firestoreTools = window.firestoreTools;
    const { doc, getDoc, setDoc, appId } = firestoreTools;

    // Riferimenti ai contenitori
    const gateBox = document.getElementById('gate-box');
    const loginBox = document.getElementById('login-box');
    const appContent = document.getElementById('app-content');
    const adminContent = document.getElementById('admin-content');
    const leaderboardContent = document.getElementById('leaderboard-content');
    const scheduleContent = document.getElementById('schedule-content');
    const squadraContent = document.getElementById('squadra-content');
    
    // Riferimenti agli elementi della Dashboard Utente
    const teamDashboardTitle = document.getElementById('team-dashboard-title');
    const teamWelcomeMessage = document.getElementById('team-welcome-message');
    const teamFirestoreId = document.getElementById('team-firestore-id');
    const userLogoutButton = document.getElementById('user-logout-button');
    
    // Riferimenti ai pulsanti di navigazione squadra
    const btnGestioneRosa = document.getElementById('btn-gestione-rosa');
    const btnGestioneFormazione = document.getElementById('btn-gestione-formazione');
    const btnDraftUtente = document.getElementById('btn-draft-utente');

    // Riferimenti ai pulsanti pubblici
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    const btnSchedule = document.getElementById('btn-schedule');
    const leaderboardBackButton = document.getElementById('leaderboard-back-button');
    const scheduleBackButton = document.getElementById('schedule-back-button');


    // Elementi del Gate Box
    const gatePasswordInput = document.getElementById('gate-password');
    const gateButton = document.getElementById('gate-button');
    const gateMessage = document.getElementById('gate-message');
    const MASTER_PASSWORD = "seria"; // Password d'accesso richiesta

    // Elementi del Login Box
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const loginMessage = document.getElementById('login-message');
    
    // Credenziali Admin Hardcoded (solo per mockup prima di usare Firebase Auth)
    const ADMIN_USERNAME = "serieseria";
    const ADMIN_PASSWORD = "admin";
    const ADMIN_USERNAME_LOWER = ADMIN_USERNAME.toLowerCase(); // Costante per il controllo
    
    // Costante per la collezione pubblica delle squadre
    const TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;

    // --- ROSA INIZIALE CORRETTA (Aggiunto 'level: 1' a tutti) ---
    const INITIAL_SQUAD = [
        { id: 'p001', name: 'Portiere', role: 'P', levelRange: [1, 1], age: 50, cost: 0, level: 1 },
        { id: 'd001', name: 'Difensore', role: 'D', levelRange: [1, 1], age: 50, cost: 0, level: 1 },
        { id: 'c001', name: 'Centrocampista 1', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1 },
        { id: 'c002', name: 'Centrocampista 2', role: 'C', levelRange: [1, 1], age: 50, cost: 0, level: 1 },
        { id: 'a001', name: 'Attaccante', role: 'A', levelRange: [1, 1], age: 50, cost: 0, level: 1 }
    ];

    
    /**
     * Aggiorna l'interfaccia utente con i dati della squadra.
     * @param {string} teamName - Il nome della squadra.
     * @param {string} teamDocId - L'ID del documento Firestore.
     * @param {boolean} isNew - Indica se la squadra è appena stata creata.
     */
    const updateTeamUI = (teamName, teamDocId, isNew) => {
        teamDashboardTitle.textContent = `Dashboard di ${teamName}`;
        teamWelcomeMessage.textContent = isNew 
            ? `Benvenuto/a, Manager! La tua squadra '${teamName}' è stata appena creata. Inizia il calciomercato!`
            : `Bentornato/a, Manager di ${teamName}! Sei pronto per la prossima giornata?`;
        teamFirestoreId.textContent = teamDocId;
        currentTeamId = teamDocId; // Salva l'ID corrente
    };

    // Funzione helper per il logout (definita in interfaccia.js per renderla globale)
    window.handleLogout = () => {
        // Logica di disconnessione (non disconnettiamo l'utente Firebase anonimo)
        console.log("Logout Utente effettuato. Torno alla schermata di login.");
        loginPasswordInput.value = ''; // Pulisci la password
        window.showScreen(loginBox); // Usa la funzione globale
        currentTeamId = null;
    };
    
    userLogoutButton.addEventListener('click', window.handleLogout);


    // -------------------------------------------------------------------
    // LOGICA DI NAVIGAZIONE SQUADRA
    // -------------------------------------------------------------------

    // Gestione Rosa / Formazione
    btnGestioneRosa.addEventListener('click', () => {
        window.showScreen(squadraContent);
        // Lancia l'evento per inizializzare Gestione Rosa
        document.dispatchEvent(new CustomEvent('squadraPanelLoaded', { detail: { mode: 'rosa', teamId: currentTeamId } }));
    });
    
    // Gestione Formazione (Riutilizzo la stessa schermata con mode: 'formazione')
    btnGestioneFormazione.addEventListener('click', () => {
        window.showScreen(squadraContent);
        // Lancia l'evento per inizializzare Gestione Formazione
        document.dispatchEvent(new CustomEvent('squadraPanelLoaded', { detail: { mode: 'formazione', teamId: currentTeamId } }));
    });
    
    // Draft Utente (Marketplace)
    btnDraftUtente.addEventListener('click', () => {
        // Riutilizzo il contenitore draft-content (che è un max-w-4xl) per il marketplace utente
        const draftAdminContent = document.getElementById('draft-content');
        if (draftAdminContent) {
            window.showScreen(draftAdminContent);
            // Lancia l'evento per la modalità Draft Utente
            document.dispatchEvent(new CustomEvent('draftPanelLoaded', { detail: { mode: 'utente', teamId: currentTeamId } }));
        }
    });


    // -------------------------------------------------------------------
    // LOGICA DI NAVIGAZIONE PUBBLICA
    // -------------------------------------------------------------------
    
    // Classifica
    btnLeaderboard.addEventListener('click', () => {
        window.showScreen(leaderboardContent);
        document.dispatchEvent(new CustomEvent('leaderboardLoaded')); 
    });
    
    // Calendario
    btnSchedule.addEventListener('click', () => {
        window.showScreen(scheduleContent);
        document.dispatchEvent(new CustomEvent('scheduleLoaded')); 
    });
    
    // Ritorno dal Pubblico al Login
    leaderboardBackButton.addEventListener('click', () => {
        window.showScreen(loginBox);
    });
    scheduleBackButton.addEventListener('click', () => {
        window.showScreen(loginBox);
    });

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

            setTimeout(() => {
                window.showScreen(loginBox); // Usa la funzione globale
                loginUsernameInput.focus();
            }, 1000);

        } else {
            gateMessage.textContent = "Password d'accesso errata. Riprova.";
            gateMessage.classList.remove('text-green-500');
            gateMessage.classList.add('text-red-400');
            gatePasswordInput.value = '';
        }
    };

    gateButton.addEventListener('click', handleGateAccess);
    gatePasswordInput.addEventListener('keypress', (e) => {
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
             loginPasswordInput.value = '';
             return;
        }
        
        // --- BLOCCO NOME RISERVATO (ADMIN) ---
        if (teamDocId === ADMIN_USERNAME_LOWER) {
            // Se è l'admin, procedi con l'autenticazione admin
            if (password !== ADMIN_PASSWORD) {
                loginMessage.textContent = "Password Amministratore non valida.";
                loginMessage.classList.remove('text-green-500');
                loginMessage.classList.add('text-red-400');
                loginPasswordInput.value = '';
                return;
            }
            
            // Se è l'admin e la password è corretta, va alla dashboard admin
            loginMessage.textContent = "Accesso Amministratore Riuscito!";
            setTimeout(() => {
                window.showScreen(adminContent); // Usa la funzione globale
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
            const teamNameForDisplay = inputTeamName; // Usa il nome originale per la UI

            if (teamDoc.exists()) {
                // SQUADRA ESISTENTE: Verifica la password (mockup)
                teamData = teamDoc.data();
                
                if (teamData.password !== password) {
                    throw new Error("Password squadra non valida.");
                }
                
                loginMessage.textContent = `Bentornato ${teamNameForDisplay}! Accesso Riuscito.`;

            } else {
                // NUOVA SQUADRA: Crea il documento
                isNewTeam = true;
                const initialBudget = 500; // Crediti Iniziali
                
                teamData = {
                    teamName: teamNameForDisplay, // Salva il nome originale (con maiuscole) per la visualizzazione
                    ownerUserId: userId,
                    password: password, // MOCKUP
                    budget: initialBudget,
                    creationDate: new Date().toISOString(),
                    players: INITIAL_SQUAD, // INSERISCI LA ROSA INIZIALE CORRETTA
                    formation: {
                        modulo: '1-1-2-1', // Modulo predefinito
                        titolari: [],
                        panchina: []
                    }
                };

                await setDoc(teamDocRef, teamData);

                loginMessage.textContent = `Congratulazioni! Squadra '${teamNameForDisplay}' creata con ${initialBudget} Crediti Seri e 5 giocatori base!`;
            }

            // Mostra la dashboard utente
            setTimeout(() => {
                updateTeamUI(teamNameForDisplay, teamDocRef.id, isNewTeam);
                window.showScreen(appContent); // Usa la funzione globale
                loginPasswordInput.value = '';
            }, 1000);
            
        } catch (error) {
            console.error("Errore di accesso/creazione:", error);
            loginMessage.textContent = `Errore: ${error.message}`;
            loginMessage.classList.remove('text-green-500');
            loginMessage.classList.add('text-red-400');
            loginPasswordInput.value = ''; 
        }
    };

    loginButton.addEventListener('click', handleLoginAccess);
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLoginAccess();
    });
    loginUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLoginAccess();
    });

    // Inizializzazione: Assicurati che solo il Gate Box sia visibile all'inizio
    if (gateBox) {
        gateBox.classList.remove('hidden-on-load');
    }
});