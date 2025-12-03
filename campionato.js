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


    // --- NUOVA LOGICA: FUNZIONI FORMA E PUNTEGGIO TATTICO ---
    
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

    // --- FINE NUOVA LOGICA ---
    
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
            let draftOpen = configDoc.exists() ? (configDoc.data().isDraftOpen || false) : false;

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


            // Renderizza il pannello
            championshipToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border border-orange-600 shadow-inner-lg space-y-6">
                    
                    <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2">Stato Generale</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <p class="text-gray-300">Squadre partecipanti: <span class="font-bold text-yellow-400">${numTeamsParticipating}</span></p>
                        <p class="text-gray-300">Draft: <span class="font-bold ${draftOpen ? 'text-green-500' : 'text-red-400'}">${draftOpen ? 'APERTO' : 'CHIUSO'}</span></p>
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
                            ${numTeamsParticipating < 2 ? 'disabled' : ''}>
                        Genera Nuovo Calendario (Andata & Ritorno)
                    </button>

                    ${numTeamsParticipating < 2 ? '<p class="text-red-400 text-center text-sm font-semibold">Flagga almeno 2 squadre per generare il calendario.</p>' : ''}
                    
                    <div class="mt-4 p-4 bg-gray-700 rounded-lg border border-gray-600 space-y-3">
                        <p class="text-white font-semibold">Prossima Azione:</p>
                        ${isFinished 
                            ? `<p class="text-green-400 font-bold">Campionato Terminato! Totale Giornate: ${totalRounds}</p>`
                            : `<p class="text-yellow-300 font-bold">Simula Giornata ${nextRoundNumber} di ${totalRounds}</p>`
                        }
                        
                        <button id="btn-simulate-round"
                                class="w-full bg-red-500 text-white font-extrabold py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 transform hover:scale-[1.01]"
                                ${isFinished || schedule.length === 0 ? 'disabled' : ''}>
                            Simula Prossima Partita
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
            
            // Cabla gli ascoltatori
            document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);
            document.getElementById('btn-generate-schedule').addEventListener('click', () => generateSchedule(participatingTeams));
            if (!isFinished && schedule.length > 0) {
                 document.getElementById('btn-simulate-round').addEventListener('click', () => simulateNextRound(schedule, allTeams)); // Passa ALL_TEAMS per l'aggiornamento classifica
            }

        } catch (error) {
            console.error("Errore nel caricamento configurazione:", error);
            championshipToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: Impossibile caricare la configurazione.</p>`;
        }
    };
    
    /**
     * Algoritmo Round-Robin per generare le partite di andata e ritorno.
     * Accetta solo le squadre partecipanti.
     */
    const generateSchedule = async (teams) => {
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
            const { doc, setDoc } = firestoreTools;
            const scheduleDocRef = doc(db, SCHEDULE_COLLECTION_PATH, SCHEDULE_DOC_ID);
            
            // Inizializza la classifica quando generi il calendario
            await setDoc(scheduleDocRef, { 
                matches: finalSchedule,
                generationDate: new Date().toISOString(),
                totalRounds: totalRounds * 2,
                numTeams: teams.length
            });
            
            // Inizializza la classifica A ZERO SOLO per le squadre partecipanti
            await initializeLeaderboard(teams);
            
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
     * Inizializza le statistiche di una squadra (Leaderboard) con tutte le squadre partecipanti a zero.
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

        const roundsToShow = schedule.slice(0, 5);
        if (schedule.length > 5) roundsToShow.push(schedule[schedule.length - 1]);
        
        roundsToShow.forEach(roundData => {
            const isPlayed = roundData.matches.every(match => match.result !== null);
            const roundColor = isPlayed ? 'text-green-300' : 'text-yellow-300';
            const roundBg = roundData.matches[0].type === 'Ritorno' ? 'bg-indigo-700' : 'bg-gray-600';


            previewHtml += `
                <div class="mb-2 p-2 rounded-md ${roundBg}">
                    <p class="font-bold text-sm ${roundColor}">Giornata ${roundData.round} (${roundData.matches[0].type}) - ${isPlayed ? 'GIOCATA' : 'DA GIOCARE'}</p>
                    <ul class="text-xs text-white mt-1 space-y-0.5">
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
        
        if (schedule.length > 6) {
             previewHtml += `<p class="text-center text-gray-400 mt-2">... e ${schedule.length - 6} altre giornate...</p>`;
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
});