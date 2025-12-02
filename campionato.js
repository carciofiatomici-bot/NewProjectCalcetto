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
     * Funzione principale per disegnare l'interfaccia Campionato.
     */
    const renderChampionshipPanel = async () => {
        // Inizializza servizi globali
        db = window.db;
        firestoreTools = window.firestoreTools;
        
        championshipToolsContainer.innerHTML = `<p class="text-center text-gray-400">Caricamento configurazione...</p>`;

        try {
            // Rimuoviamo la logica di caricamento dello stato Draft poiché viene gestita in draft.js

            // Renderizza il pannello (SOLO con le regole generali)
            championshipToolsContainer.innerHTML = `
                <div class="p-6 bg-gray-800 rounded-lg border border-orange-600 shadow-inner-lg space-y-6">
                    
                    <h3 class="text-xl font-bold text-orange-400 border-b border-gray-600 pb-2 pt-4">Regole Generali</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Numero Squadre -->
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="num-teams">Numero Squadre Partecipanti</label>
                            <input type="number" id="num-teams" value="8" min="2" max="20"
                                class="p-2 rounded-lg bg-gray-700 border border-orange-600 text-white focus:ring-orange-400">
                        </div>
                        
                        <!-- Formato Campionato -->
                        <div class="flex flex-col">
                            <label class="text-gray-300 mb-1" for="format">Formato Competizione</label>
                            <select id="format" class="w-full p-2 rounded-lg bg-gray-700 border border-orange-600 text-white focus:ring-orange-400">
                                <option value="all-vs-all">Tutti contro Tutti</option>
                                <option value="elimination">Eliminazione Diretta (Coppa)</option>
                            </select>
                        </div>
                    </div>

                    <p id="championship-message" class="text-center mt-3 text-red-400"></p>
                    
                    <button id="btn-save-settings"
                            class="w-full bg-orange-500 text-gray-900 font-extrabold py-3 rounded-lg shadow-xl hover:bg-orange-400 transition duration-150 transform hover:scale-[1.01]">
                        Salva Impostazioni Campionato (Firestore)
                    </button>
                    
                </div>
            `;
            
            // Cabla gli ascoltatori
            document.getElementById('btn-save-settings').addEventListener('click', handleSaveSettings);

        } catch (error) {
            console.error("Errore nel caricamento configurazione:", error);
            championshipToolsContainer.innerHTML = `<p class="text-center text-red-400">Errore: Impossibile caricare la configurazione.</p>`;
        }
    };
    
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