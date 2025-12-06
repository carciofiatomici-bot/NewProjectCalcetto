//
// ====================================================================
// CONTENUTO DEL MODULO CAMPIONATO.JS (Logica Gestione Campionato)
// ====================================================================
//

document.addEventListener('DOMContentLoaded', () => {
    const championshipContent = document.getElementById('championship-content');
    const championshipToolsContainer = document.getElementById('championship-tools-container');
    const championshipBackButton = document.getElementById('championship-back-button');
    const adminContent = document.getElementById('admin-content');
    
    let db;
    let firestoreTools;
    let CHAMPIONSHIP_CONFIG_PATH;
    let TEAMS_COLLECTION_PATH;
    let SCHEDULE_COLLECTION_PATH; 
    let LEADERBOARD_COLLECTION_PATH; 

    // Struttura fissa dei documenti
    const CONFIG_DOC_ID = 'settings';
    const SCHEDULE_DOC_ID = 'full_schedule';
    const LEADERBOARD_DOC_ID = 'standings'; 
    const DEFAULT_LOGO_URL = "https://github.com/carciofiatomici-bot/immaginiserie/blob/main/placeholder.jpg?raw=true";


    /**
     * Helper per generare l'HTML del logo
     */
    const getLogoHtml = (teamId) => {
        if (window.getLogoHtml) {
             return window.getLogoHtml(teamId);
        }
        // Fallback sicuro
        return `<img src="${DEFAULT_LOGO_URL}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle mr-2">`;
    };

    /**
     * Helper per mostrare messaggi di stato.
     * @param {string} message - Il testo del messaggio.
     * @param {string} type - 'success', 'error', o 'info'.
     */
    const displayConfigMessage = (message, type) => {
        const msgElement = document.getElementById('championship-message');
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
     * Helper per generare un numero intero casuale.
     */
    const getRandomInt = window.getRandomInt; // Usa il getter globale


    // --- LOGICA FORMA E PUNTEGGIO TATTICO ---
    
    /**
     * Genera un modificatore di forma casuale tra -3 e +3.
     */
    const getRandomFormModifier = () => {
        const mod = getRandomInt(-3, 3);
        let icon = 'text-gray-400 fas fa-minus-circle'; // Default 0
        if (mod > 0) icon = 'text-green-500 fas fa-arrow-circle-up';
        if (mod < 0) icon = 'text-red-500 fas fa-arrow-circle-down';
        
        return { modifier: mod, icon: icon };
    };

    /**
     * Calcola il punteggio tattico di una squadra basato sul livello medio dei titolari (con forma applicata).
     * @param {Array<Object>} titolari - Array di giocatori titolari (con livello già modificato dalla forma).
     * @returns {number} Il punteggio tattico arrotondato.
     */
    const calculateTeamTacticScoreLocal = (titolari) => {
        if (!titolari || titolari.length !== 5) {
             // 1 punto se la formazione è incompleta (forte malus)
             return 1; 
        }
        
        // Utilizza la funzione globale calculateAverageLevel che gestisce p.level o p.currentLevel
        const avgLevel = window.calculateAverageLevel ? window.calculateAverageLevel(titolari) : 1; 
        
        // Punteggio Tattico (Livello Medio arrotondato)
        return Math.max(1, Math.round(avgLevel)); 
    };

    // --- FINE LOGICA FORMA ---
    
    /**
     * Funzione principale per disegnare l'interfaccia Campionato.
     */
    const renderChampionshipPanel = async () => {
        // Inizializza servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        const { appId, doc, getDoc, collection, getDocs } = firestoreTools;
        CHAMPIONSHIP_CONFIG_PATH = `artifacts/${appId}/public/data/config`;
        TEAMS_COLLECTION_PATH = `artifacts/${appId}/public/data/teams`;
        SCHEDULE_COLLECTION_PATH = `artifacts/${appId}/public/data/schedule`;
        LEADERBOARD_COLLECTION_PATH = `artifacts/${appId}/public/data/leaderboard`;
        
        championshipToolsContainer.innerHTML = `<p class="text-center text-gray-400">Caricamento configurazione e squadre...</p>`;

        try {
            // 1. Carica stati
            const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
            const configDoc = await getDoc(configDocRef);
            const configData = configDoc.exists() ? configDoc.data() : {};

            let draftOpen = configData.isDraftOpen || false;
            let marketOpen = configData.isMarketOpen || false; 
            let isSeasonOver = configData.isSeasonOver || false; // STATO STAGIONE

            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);
            
            // --- LOGICA CRITICA DI FILTRAGGIO ---
            const allTeams = teamsSnapshot.docs.map(doc => ({ 
                id: doc.id, 
                name: doc.data().teamName, 
                isParticipating: doc.data().isParticipating || false 
            }));
            const participatingTeams = allTeams.filter(t => t.isParticipating);
            const numTeamsParticipating = participatingTeams.length;
            // --- FINE LOGICA CRITICA DI FILTRAGGIO ---


            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            const scheduleDoc = await getDoc(scheduleDocRef);
            const schedule = scheduleDoc.exists() ? scheduleDoc.data().matches : [];
            
            // Trova la prossima giornata non giocata
            const nextRound = schedule.find(round => 
                round.matches.some(match => match.result === null)
            );
            const nextRoundNumber = nextRound ? nextRound.round : (schedule.length > 0 ? schedule.length + 1 : 1);
            const totalRounds = schedule.length > 0 ? schedule[schedule.length - 1].round : 0;
            const isFinished = !nextRound && totalRounds > 0;
            
            // Importa i loghi (necessario per l'admin preview)
            if (window.fetchAllTeamLogos) {
                 await window.fetchAllTeamLogos();
            }
            
            const isReadyForEnd = isFinished && !isSeasonOver;
            
            // CONDIZIONE CRITICA PER GENERARE: Deve essere in Pausa E avere abbastanza squadre.
            const canGenerate = isSeasonOver && numTeamsParticipating >= 2;

            // --- Elemento di stato campionato ---
            const statusText = isSeasonOver ? 'TERMINATO (Pausa)' : 'IN CORSO';
            const statusClass = isSeasonOver ? 'bg-red-900 border-red-500 text-red-400' : 'bg-green-900 border-green-500 text-green-400';


            // Renderizza il pannello
            championshipToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border border-orange-600 shadow-inner-lg space-y-6">
                    
                    <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2">Stato Generale</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <p class="text-gray-300">Squadre partecipanti: <span class="font-bold text-yellow-400">${numTeamsParticipating}</span></p>
                        <p class="text-gray-300">Draft Aperto: <span class="font-bold ${draftOpen ? 'text-green-500' : 'text-red-400'}">${draftOpen ? 'SI' : 'NO'}</span></p>
                        <p class="text-gray-300">Mercato Aperto: <span class="font-bold ${marketOpen ? 'text-green-500' : 'text-red-400'}">${marketOpen ? 'SI' : 'NO'}</span></p>
                        
                        <!-- INDICATORE DI STATO DEL CAMPIONATO -->
                        <div class="col-span-2 p-3 rounded-lg border-2 ${statusClass} text-center font-extrabold shadow-md">
                            Stagione: ${statusText}
                        </div>
                    </div>

                    <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 pt-4">Regole Generali</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="num-teams-setting">Squadre nel Calendario</label>
                            <input type="number" id="num-teams-setting" value="${numTeamsParticipating}" disabled
                                class="p-2 rounded-lg bg-gray-700 border border-orange-600 text-white focus:ring-orange-400 opacity-70">
                                <p class="text-xs text-gray-400 mt-1">Modifica l'elenco nel pannello Admin principale.</p>
                        </div>
                        
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="format">Formato Competizione</label>
                            <select id="format" class="w-full p-2 rounded-lg bg-gray-700 text-white border border-orange-600 focus:ring-orange-400">
                                <option value="all-vs-all" selected>Tutti contro Tutti (Andata/Ritorno)</option>
                                <option value="elimination" disabled>Eliminazione Diretta (Coppa - coming soon)</option>
                            </select>
                        </div>
                    </div>
                    
                    
                    <!-- SEZIONE: GESTIONE CALENDARIO -->
                    <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 pt-4">Generazione & Simulazione Calendario</h3>
                    
                    <button id="btn-generate-schedule"
                            class="w-full bg-red-600 text-white font-extrabold py-3 rounded-lg shadow-xl hover:bg-red-700 transition duration-150 transform hover:scale-[1.01]"
                            ${canGenerate ? '' : 'disabled'}>
                        Genera Nuovo Calendario (Avvia nuova stagione)
                    </button>
                    ${!canGenerate 
                        ? `<p class="text-red-400 text-center text-sm font-semibold">${!isSeasonOver ? 'Termina il campionato attuale' : (numTeamsParticipating < 2 ? 'Flagga almeno 2 squadre' : 'Errore Sconosciuto')}</p>` 
                        : (isSeasonOver ? `<p class="text-green-400 text-center text-sm font-semibold">Stagione conclusa. Pronto per generare il nuovo calendario.</p>` : '')
                    }

                    
                    <!-- PULSANTE TERMINA CAMPIONATO / SIMULA -->
                    <div class="mt-4 p-4 bg-gray-700 rounded-lg border border-red-500 space-y-3">
                         <p class="text-white font-semibold">Prossima Azione:</p>
                         ${isSeasonOver 
                            ? `<p class="text-yellow-300 font-bold">Stagione TERMINATA. Genera un nuovo calendario per iniziare la prossima.</p>`
                            : isFinished 
                                ? `<p class="text-green-400 font-bold">Campionato Concluso! Premi SOTTO per assegnare i premi.</p>`
                                : `<p class="text-yellow-300 font-bold">Simula Giornata ${nextRoundNumber} di ${totalRounds}</p>`
                         }
                        
                        <button id="btn-simulate-round"
                                class="w-full bg-red-500 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 transform hover:scale-[1.01]"
                                ${isFinished || schedule.length === 0 || isSeasonOver ? 'disabled' : ''}>
                            Simula Prossima Partita
                        </button>
                        
                        <!-- PULSANTE CONFERMA: TERMINA CON PREMI -->
                        <button data-action="end-season"
                                class="w-full bg-red-800 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-red-900 transition duration-150 transform hover:scale-[1.01] mb-2"
                                ${!isReadyForEnd ? 'disabled' : ''}>
                            TERMINA CAMPIONATO (Assegna Premi & Livelli)
                        </button>

                        <!-- PULSANTE CONFERMA: TERMINA SENZA PREMI (TEST) -->
                        <button data-action="test-reset"
                                class="w-full bg-orange-500 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-orange-600 transition duration-150 transform hover:scale-[1.01]"
                                ${isFinished || schedule.length === 0 || isSeasonOver ? '' : 'disabled'}> 
                            TERMINA SENZA PREMI (Solo Test)
                        </button>
                    </div>

                    <div id="schedule-display-container" class="mt-4 p-4 bg-gray-700 rounded-lg max-h-60 overflow-y-auto">
                        ${renderSchedulePreview(schedule, numTeamsParticipating)}
                    </div>

                    <p id="championship-message" class="text-center mt-3 text-red-400"></p>
                    
                    <button id="btn-save-settings"
                            class="w-full bg-orange-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-400 transition duration-150 transform hover:scale-[1.01]">
                        Salva Impostazioni Campionato (Mock)
                    </button>
                    
                </div>
            `;
            
            // Aggiungi un listener delegato per i pulsanti di terminazione
            const seasonEndContainer = championshipToolsContainer.querySelector('.space-y-3');
            if (seasonEndContainer) {
                seasonEndContainer.addEventListener('click', handleTerminationButtons);
            }


            // Cabla gli ascoltatori rimanenti
            document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);
            
            // La generazione è permessa solo se canGenerate è true
            if (canGenerate) {
                 document.getElementById('btn-generate-schedule').addEventListener('click', () => generateSchedule(participatingTeams));
            }
            
            if (!isFinished && schedule.length > 0 && !isSeasonOver) {
                 document.getElementById('btn-simulate-round').addEventListener('click', () => simulateNextRound(schedule, allTeams));
            }

        } catch (error) {
            console.error("Errore nel caricamento configurazione:", error);
            championshipToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: Impossibile caricare la configurazione.</p>`;
        }
    };
    
    /**
     * Gestisce i click sui pulsanti di terminazione e mostra la conferma.
     */
    const handleTerminationButtons = (e) => {
        const target = e.target;
        const action = target.dataset.action;
        
        if (action === 'end-season' && !target.disabled) {
            confirmSeasonEnd(false); // False = non è solo per test
        } else if (action === 'test-reset' && !target.disabled) {
            confirmSeasonEnd(true); // True = è per test
        }
    };
    
    /**
     * Mostra la modale di conferma per la terminazione del campionato.
     * @param {boolean} isTestMode - True se è il reset di test, False se è la terminazione ufficiale.
     */
    const confirmSeasonEnd = (isTestMode) => {
        const message = isTestMode
            ? "ATTENZIONE: Stai per terminare il campionato SENZA assegnare crediti o livellare gli allenatori. Il calendario verrà eliminato. Continuare?"
            : "AZIONE CRITICA: Stai per terminare la stagione UFFICIALMENTE. Premi, crediti e progressione allenatori verranno assegnati. Il calendario verrà eliminato. Continuare?";
        
        const title = isTestMode ? "Conferma Reset Campionato (TEST)" : "Conferma Chiusura Stagione Ufficiale";
        
        // Simulo una modale usando window.prompt (per semplicità nell'ambiente a file unico)
        const confirmation = prompt(`${title}\n\n${message}\n\nDigita 'SI' per confermare:`);
        
        if (confirmation && confirmation.toUpperCase() === 'SI') {
            if (isTestMode) {
                handleSeasonEndForTesting();
            } else {
                handleSeasonEnd();
            }
        } else if (confirmation !== null) {
            displayConfigMessage("Azione annullata dall'Admin.", 'info');
        }
    };

    /**
     * Funzione principale per terminare il campionato, assegnare premi e livellare gli allenatori.
     */
    const handleSeasonEnd = async () => {
        const button = document.querySelector('[data-action="end-season"]');
        if (button) button.disabled = true;
        
        displayConfigMessage("Terminazione Campionato in corso: Calcolo premi e progressione allenatori...", 'info');
        
        const { doc, setDoc, getDoc, updateDoc, collection, getDocs, deleteDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);
        
        try {
            // 1. Carica la classifica finale
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            if (!leaderboardDoc.exists() || !leaderboardDoc.data().standings || leaderboardDoc.data().standings.length === 0) {
                 throw new Error("Classifica non trovata o vuota. Impossibile assegnare i premi.");
            }
            const standings = leaderboardDoc.data().standings;
            const numTeams = standings.length;
            
            // 2. Determina le ricompense in Crediti Seri (CS) per posizione
            const rewardsMap = new Map(); // Mappa: teamId -> reward amount

            standings.forEach((team, index) => {
                let reward;
                // Le prime 3 (index 0, 1, 2)
                if (index < 3) { 
                    reward = 100;
                } 
                // Le ultime 3 (index numTeams-3, numTeams-2, numTeams-1)
                else if (index >= numTeams - 3) { 
                    reward = 200;
                }
                // Tutte le altre
                else {
                    reward = 150;
                }
                rewardsMap.set(team.teamId, reward);
            });

            // 3. Processa tutte le squadre: Assegna crediti e tenta la progressione allenatore
            const teamsCollectionRef = collection(db, TEAMS_COLLECTION_PATH);
            const teamsSnapshot = await getDocs(teamsCollectionRef);
            
            let successfulLevelUps = 0;

            for (const docSnapshot of teamsSnapshot.docs) {
                const teamData = docSnapshot.data();
                const teamId = docSnapshot.id;
                
                const reward = rewardsMap.get(teamId) || 150; // Usa 150 default se non in classifica (es. squadre non partecipanti)
                const currentBudget = teamData.budget || 0;
                const currentCoach = teamData.coach || { name: 'Sconosciuto', level: 0, xp: 0 };
                
                let coachLevel = currentCoach.level;

                // 20% di possibilità di salire di livello (solo se l'allenatore è >= 1)
                if (coachLevel >= 1 && getRandomInt(1, 100) <= 20) {
                    coachLevel += 1;
                    successfulLevelUps++;
                }
                
                // Aggiorna la squadra su Firestore
                await updateDoc(doc(db, TEAMS_COLLECTION_PATH, teamId), {
                    budget: currentBudget + reward,
                    coach: {
                        ...currentCoach,
                        level: coachLevel,
                    }
                });
            }
            
            // 4. Pulisci il calendario (elimina il documento)
            await deleteDoc(scheduleDocRef);
            
            // 5. Aggiorna lo stato del campionato a "Terminato/Pausa"
            await setDoc(configDocRef, { isSeasonOver: true, isDraftOpen: false, isMarketOpen: false }, { merge: true });
            
            displayConfigMessage(`Campionato TERMINATO! Assegnati premi a ${numTeams} squadre. ${successfulLevelUps} allenatori sono saliti di livello (20% chance). Calendario eliminato.`, 'success');
            
            // Ricarica il pannello Admin per aggiornare lo stato e i pulsanti
            renderChampionshipPanel();


        } catch (error) {
            console.error("Errore durante la terminazione del campionato:", error);
            displayConfigMessage(`Errore critico durante la terminazione: ${error.message}`, 'error');
            if (button) button.disabled = false;
        }
    };
    
    /**
     * Termina il campionato SENZA assegnare premi o livellare allenatori.
     */
    const handleSeasonEndForTesting = async () => {
        const button = document.querySelector('[data-action="test-reset"]');
        if (button) button.disabled = true;
        
        displayConfigMessage("Terminazione Campionato forzata per testing... (NESSUN PREMIO O LIVELLO ASSEGNATO)", 'info');
        
        // Ricarica i riferimenti a Firestore all'interno dello scope
        const { doc, setDoc, deleteDoc } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);

        try {
            // 1. Pulisci il calendario (elimina il documento)
            await deleteDoc(scheduleDocRef);
            
            // 2. Aggiorna lo stato del campionato a "Terminato/Pausa"
            await setDoc(configDocRef, { isSeasonOver: true, isDraftOpen: false, isMarketOpen: false }, { merge: true });
            
            displayConfigMessage(`Campionato TERMINATO per TESTING. Calendario eliminato. Budget e Livelli Allenatori NON modificati.`, 'success');
            
            // Ricarica il pannello Admin per aggiornare lo stato e i pulsanti
            renderChampionshipPanel();

        } catch (error) {
            console.error("Errore durante la terminazione per testing:", error);
            displayConfigMessage(`Errore critico durante la terminazione per testing: ${error.message}`, 'error');
            if (button) button.disabled = false;
        }
    };


    /**
     * Algoritmo Round-Robin per generare le partite di andata e ritorno.
     */
    const generateSchedule = async (teams) => {
        // Ricarica i riferimenti a Firestore all'interno dello scope
        const { doc, setDoc, deleteDoc, collection, getDocs } = firestoreTools;
        const configDocRef = doc(db, CHAMPIONSHIP_CONFIG_PATH, CONFIG_DOC_ID);
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);

        if (!teams || teams.length < 2) {
            return displayConfigMessage("Errore: Necessarie almeno 2 squadre flaggate per generare il calendario.", 'error');
        }
        
        displayConfigMessage("Generazione calendario in corso...", 'info');
        const button = document.getElementById('btn-generate-schedule');
        button.disabled = true;

        let numTeams = teams.length;
        let teamsList = teams.map(t => t.id); // ID per l'algoritmo
        let schedule = [];
        
        const isOdd = numTeams % 2 !== 0;
        if (isOdd) {
            teamsList.push("BYE");
            numTeams++;
        }

        const totalRounds = numTeams - 1; 
        
        for (let round = 0; round < totalRounds; round++) {
            const roundMatches = [];
            for (let i = 0; i < numTeams / 2; i++) {
                const homeTeamId = teamsList[i];
                const awayTeamId = teamsList[numTeams - 1 - i];
                
                // Mappa ID a Nome per il salvataggio
                const homeTeamName = teams.find(t => t.id === homeTeamId)?.name || 'BYE';
                const awayTeamName = teams.find(t => t.id === awayTeamId)?.name || 'BYE';


                if (homeTeamId !== "BYE" && awayTeamId !== "BYE") {
                    roundMatches.push({
                        homeId: homeTeamId,
                        awayId: awayTeamId,
                        homeName: homeTeamName,
                        awayName: awayTeamName,
                        round: round + 1,
                        type: 'Andata',
                        result: null 
                    });
                }
            }
            schedule.push({ round: round + 1, matches: roundMatches });

            const fixedTeam = teamsList.shift(); 
            const lastTeam = teamsList.pop();   
            teamsList.unshift(lastTeam);       
            teamsList.unshift(fixedTeam);      
        }

        const returnSchedule = schedule.map(roundData => ({
            round: roundData.round + totalRounds,
            matches: roundData.matches.map(match => ({
                homeId: match.awayId, 
                awayId: match.homeId,
                homeName: match.awayName,
                awayName: match.homeName,
                round: match.round + totalRounds,
                type: 'Ritorno',
                result: null
            }))
        }));
        
        const finalSchedule = [...schedule, ...returnSchedule];

        // 4. Salvataggio su Firestore
        try {
            // Salviamo il calendario
            await setDoc(scheduleDocRef, { 
                matches: finalSchedule,
                generationDate: new Date().toISOString(),
                totalRounds: totalRounds * 2,
                numTeams: teams.length
            });
            
            // Inizializza la classifica A ZERO SOLO per le squadre partecipanti
            await initializeLeaderboard(teams);
            
            // Imposta lo stato della stagione su IN CORSO (false)
            await setDoc(configDocRef, { isSeasonOver: false }, { merge: true });
            
            displayConfigMessage(`Calendario di ${finalSchedule.length} giornate (Andata/Ritorno) generato e salvato per ${teams.length} squadre flaggate! Classifica azzerata.`, 'success');
            button.disabled = false;
            
            renderChampionshipPanel(); // Ricarica il pannello per aggiornare lo stato

        } catch (error) {
            console.error("Errore nel salvataggio del calendario:", error);
            displayConfigMessage(`Errore di salvataggio: ${error.message}`, 'error');
            button.disabled = false;
        }
    };
    
    /**
     * Inizializza le statistiche di una squadra (fallback).
     */
    const initializeLeaderboard = async (teams) => {
        const { doc, setDoc } = firestoreTools;
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);

        const initialStandings = teams.map(team => ({
            teamId: team.id,
            teamName: team.name,
            points: 0,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
        }));

        await setDoc(leaderboardDocRef, { standings: initialStandings, lastUpdated: new Date().toISOString() });
    };

    /**
     * Simula la prossima giornata non giocata.
     */
    const simulateNextRound = async (schedule, allTeams) => {
        const button = document.getElementById('btn-simulate-round');
        button.disabled = true;
        
        const nextRoundIndex = schedule.findIndex(round => 
            round.matches.some(match => match.result === null)
        );

        if (nextRoundIndex === -1) {
            return displayConfigMessage("Nessuna giornata da simulare. Campionato terminato.", 'success');
        }

        const nextRound = schedule[nextRoundIndex];
        displayConfigMessage(`Simulazione della Giornata ${nextRound.round} in corso...`, 'info');

        const { doc, getDoc, setDoc } = firestoreTools;
        const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
        const leaderboardDocRef = doc(db, LEADERBOARD_COLLECTION_PATH, LEADERBOARD_DOC_ID);

        try {
            // 1. Carica la classifica attuale
            const leaderboardDoc = await getDoc(leaderboardDocRef);
            let standings = leaderboardDoc.exists() ? leaderboardDoc.data().standings : [];

            // Mappa per un accesso rapido
            const standingsMap = new Map(standings.map(s => [s.teamId, s]));
            
            // --- FUNZIONE LOCALE PER APPLICARE LA FORMA ---
            const applyForm = (teamData) => {
                // Assicurati di usare i giocatori dalla formazione (i titolari)
                const titolari = teamData.formation?.titolari || []; 
                
                return titolari.map(player => {
                    const form = getRandomFormModifier();
                    return { 
                        ...player, 
                        // Imposta il livello effettivo per la simulazione
                        currentLevel: Math.max(1, player.level + form.modifier), 
                        formModifier: form.modifier, 
                        formIcon: form.icon
                    };
                });
            };
            // --- FINE FUNZIONE LOCALE ---


            // 2. Simula e aggiorna la giornata
            for (const match of nextRound.matches) {
                
                // 2.1. Recupera i dati completi di entrambe le squadre per ottenere la formazione
                const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.homeId)),
                    getDoc(doc(db, TEAMS_COLLECTION_PATH, match.awayId))
                ]);
                
                const homeTeamData = homeTeamDoc.exists() ? homeTeamDoc.data() : null;
                const awayTeamData = awayTeamDoc.exists() ? awayTeamDoc.data() : null;
                
                if (!homeTeamData || !awayTeamData) {
                    console.warn(`Dati squadra mancanti per il match ${match.homeName} vs ${match.awayName}. Salto.`);
                    continue;
                }

                // 2.2. Applica la forma e calcola il punteggio tattico
                const homeTitolariWithForm = applyForm(homeTeamData);
                const awayTitolariWithForm = applyForm(awayTeamData);

                const homeScore = calculateTeamTacticScoreLocal(homeTitolariWithForm);
                const awayScore = calculateTeamTacticScoreLocal(awayTitolariWithForm);
                
                // Calcolo Gol: 
                const scoreDifference = homeScore - awayScore;
                
                // Base di gol (1-3) + bonus influenzato dalla differenza di punteggio.
                // Randomness: 0 to 2
                let homeGoals = getRandomInt(1, 3) + getRandomInt(0, 2); 
                let awayGoals = getRandomInt(1, 3) + getRandomInt(0, 2);

                // Applica il bonus/malus basato sul punteggio tattico (max +/- 2 gol)
                if (scoreDifference > 0) {
                    homeGoals += Math.min(2, scoreDifference);
                    awayGoals = Math.max(0, awayGoals - 1);
                } else if (scoreDifference < 0) {
                    awayGoals += Math.min(2, Math.abs(scoreDifference));
                    homeGoals = Math.max(0, homeGoals - 1);
                }
                
                // Assicurati che i gol siano >= 0
                homeGoals = Math.max(0, homeGoals);
                awayGoals = Math.max(0, awayGoals);
                
                match.result = `${homeGoals}-${awayGoals}`;
                
                // 3. Aggiorna la classifica
                
                const homeTeamName = allTeams.find(t => t.id === match.homeId)?.name || match.homeId;
                const awayTeamName = allTeams.find(t => t.id === match.awayId)?.name || match.awayId;


                const homeStats = standingsMap.get(match.homeId) || initializeTeamStats(match.homeId, homeTeamName);
                const awayStats = standingsMap.get(match.awayId) || initializeTeamStats(match.awayId, awayTeamName);
                
                // Punti e statitistiche
                homeStats.played++;
                awayStats.played++;
                homeStats.goalsFor += homeGoals;
                homeStats.goalsAgainst += awayGoals;
                awayStats.goalsFor += awayGoals;
                awayStats.goalsAgainst += homeGoals;

                if (homeGoals > awayGoals) {
                    homeStats.points += 3;
                    homeStats.wins++;
                    awayStats.losses++;
                } else if (homeGoals < awayGoals) {
                    awayStats.points += 3;
                    awayStats.wins++;
                    homeStats.losses++;
                } else {
                    homeStats.points += 1;
                    awayStats.points += 1;
                    homeStats.draws++;
                    awayStats.draws++;
                }

                standingsMap.set(match.homeId, homeStats);
                standingsMap.set(match.awayId, awayStats);
            }
            
            // 4. Salva il calendario aggiornato
            await setDoc(scheduleDocRef, { matches: schedule }, { merge: true });

            // 5. Salva la classifica aggiornata (Array ordinato)
            const updatedStandings = Array.from(standingsMap.values()).sort((a, b) => {
                // Ordina per Punti (desc), Differenza Gol (desc), Gol Fatti (desc)
                if (b.points !== a.points) return b.points - a.points;
                const diffA = a.goalsFor - a.goalsAgainst;
                const diffB = b.goalsFor - b.goalsAgainst;
                if (diffB !== diffA) return diffB - diffA;
                return b.goalsFor - a.goalsFor;
            });
            
            await setDoc(leaderboardDocRef, { standings: updatedStandings, lastUpdated: new Date().toISOString() });
            
            displayConfigMessage(`Simulazione Giornata ${nextRound.round} completata! Risultati salvati e classifica aggiornata.`, 'success');
            
            // Ricarica il pannello
            renderChampionshipPanel();

        } catch (error) {
            console.error("Errore durante la simulazione:", error);
            displayConfigMessage(`Errore di simulazione: ${error.message}`, 'error');
            button.disabled = false;
        }
    };
    
    /**
     * Inizializza le statistiche di una squadra (fallback).
     */
    const initializeTeamStats = (teamId, teamName) => ({
        teamId, teamName, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0
    });

    /**
     * Helper per renderizzare l'anteprima del calendario.
     */
    const renderSchedulePreview = (schedule, numTeams) => {
        if (!schedule || schedule.length === 0) {
            return `<p class="text-gray-400 text-center">Nessun calendario generato. Clicca il pulsante sopra.</p>`;
        }
        
        const getLogoHtmlSafe = window.getLogoHtml || ((id) => `<img src="${DEFAULT_LOGO_URL}" alt="Logo" class="w-6 h-6 rounded-full border border-gray-500 inline-block align-middle mr-2">`);
        
        let previewHtml = `<p class="text-white font-semibold mb-3">Calendario Attuale (${schedule.length} Giornate):</p>`;

        // LOGICA DI VISUALIZZAZIONE CORRETTA:
        // Se ci sono 6 o meno giornate, le mostriamo tutte.
        // Altrimenti, mostriamo le prime 5 e l'ultima con un indicatore.
        const roundsToShow = schedule.length <= 6 ? schedule : [
            ...schedule.slice(0, 5),
            schedule[schedule.length - 1]
        ];

        const showElipsis = schedule.length > 6;


        roundsToShow.forEach(roundData => {
            const isPlayed = roundData.matches.every(match => match.result === null) ? false : true; // Determina se è giocata
            const roundColor = isPlayed ? 'text-green-300' : 'text-yellow-300';
            const roundBg = roundData.matches.length > 0 && roundData.matches[0].type === 'Ritorno' ? 'bg-indigo-700' : 'bg-gray-600';


            previewHtml += `
                <div class="mb-2 p-2 rounded-md ${roundBg}">
                    <p class="font-bold text-sm ${roundColor}">Giornata ${roundData.round} (${roundData.matches.length > 0 ? roundData.matches[0].type : 'N/A'}) - ${isPlayed ? 'GIOCATA' : 'DA GIOCARE'}</p>
                    <ul class="mt-2 space-y-1 text-white">
                        ${roundData.matches.map(match => `
                            <li class="flex items-center justify-between">
                                <!-- SQUADRA CASA: Logo a Sinistra -->
                                <span class="flex items-center">
                                    ${getLogoHtmlSafe(match.homeId)} <span class="ml-2">${match.homeName}</span>
                                </span>
                                
                                ${match.result ? `<span class="font-bold text-red-300">${match.result}</span>` : '<span class="text-gray-400">vs</span>'}
                                
                                <!-- SQUADRA OSPITE: Logo a Destra -->
                                <span class="flex items-center text-right">
                                    <span class="mr-2">${match.awayName}</span> ${getLogoHtmlSafe(match.awayId)}
                                </span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });
        
        if (showElipsis) {
             previewHtml += `<p class="text-center text-gray-400 mt-2">... e ${schedule.length - roundsToShow.length} altre giornate...</p>`;
        }

        return previewHtml;
    }


    /**
     * Gestisce il salvataggio delle impostazioni (mockup).
     */
    const handleSaveSettings = () => {
        // ... (Logica di salvataggio delle altre impostazioni Campionato, non modificate)
        displayConfigMessage("Impostazioni Campionato salvate. (Da implementare su Firestore)", 'success');
    };

    // Gestisce il ritorno al pannello Admin
    championshipBackButton.addEventListener('click', () => {
        if (window.showScreen && adminContent) {
            window.showScreen(adminContent);
        }
    });

    // Ascolta l'evento lanciato da admin.js quando è il momento di mostrare il pannello Campionato
    document.addEventListener('championshipPanelLoaded', renderChampionshipPanel);
    
    // Espongo le funzioni per l'uso in admin.js
    window.handleSeasonEnd = handleSeasonEnd;
    window.handleSeasonEndForTesting = handleSeasonEndForTesting;
});