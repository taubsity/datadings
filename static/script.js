$(document).ready(function () {
    // Constants
    const ENDPOINTS = {
        RANKINGS: "/get_rankings",
        CONFIRMATION_STATUS: "/get_confirmation_status",
        DATA: "/data",
        SAVE_RANKING: "/save_ranking",
        CONFIRM_RANKINGS: "/confirm_rankings"
    };
    
    const SELECTORS = {
        RANK_RADIO: ".rank-radio",
        CSV_TABLE: "#csvTable",
        CONFIRM_BTN: "#confirmBtn",
        STATUS_TEXT: "#statusText",
        CONFIRMATION_SECTION: "#confirmationSection",
        CONFIRMED_SECTION: "#confirmedSection",
        FINAL_SUMMARY: "#finalSummary"
    };
    
    const MESSAGES = {
        SELECT_STUDIES: "Wählen Sie Ihre Top 3 Studien aus, indem Sie auf die entsprechenden Ranking-Buttons (1, 2, 3) klicken.",
        ALL_SELECTED: "Alle Ränge ausgewählt. Sie können nun bestätigen.",
        PLACEHOLDER: "Bitte wählen Sie eine Studie aus",
        CONFIRM_DIALOG: "Sind Sie sicher, dass Sie Ihre Auswahl bestätigen möchten? Sie können diese danach nicht mehr ändern.",
        CONFIRM_SUCCESS: "Ihre Auswahl wurde erfolgreich bestätigt!",
        CONFIRM_ERROR: "Fehler beim Bestätigen der Auswahl. Bitte versuchen Sie es erneut.",
        SAVE_ERROR: "Fehler beim Speichern. Bitte versuchen Sie es erneut."
    };
    
    // State
    let savedRankings = {};
    let isConfirmed = false;
    let tableData = [];
    let saveTimeout = null;
    let dataTable = null;
    
    // Cache frequently used jQuery objects
    const $confirmBtn = $(SELECTORS.CONFIRM_BTN);
    const $statusText = $(SELECTORS.STATUS_TEXT);
    const $confirmationSection = $(SELECTORS.CONFIRMATION_SECTION);
    const $confirmedSection = $(SELECTORS.CONFIRMED_SECTION);
    const $finalSummary = $(SELECTORS.FINAL_SUMMARY);
    
    // Initialize application
    init();
    
    async function init() {
        try {
            await loadInitialData();
            await initializeTable();
            setupEventHandlers();
        } catch (error) {
            console.error('Initialization failed:', error);
            showError('Fehler beim Laden der Anwendung.');
        }
    }
    
    async function loadInitialData() {
        try {
            const [rankings, confirmationData] = await Promise.all([
                $.getJSON(ENDPOINTS.RANKINGS),
                $.getJSON(ENDPOINTS.CONFIRMATION_STATUS)
            ]);
            
            savedRankings = rankings || {};
            isConfirmed = confirmationData?.confirmed || false;
            updateUIBasedOnConfirmation();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            throw error;
        }
    }
    
    function updateUIBasedOnConfirmation() {
        if (isConfirmed) {
            $confirmationSection.hide();
            $confirmedSection.show();
            disableRankingInputs();
            updateFinalSummary();
        } else {
            $confirmedSection.hide();
            $confirmationSection.show();
            updateConfirmationState();
        }
    }
    
    function disableRankingInputs() {
        $(SELECTORS.RANK_RADIO).prop("disabled", true);
        $(`${SELECTORS.CSV_TABLE} tbody tr`).off("click").css("cursor", "default");
    }
    
    function updateConfirmationState() {
        const rankings = Object.values(savedRankings);
        const rankedCount = rankings.length;
        const requiredRanks = ['1', '2', '3'];
        const selectedRanks = new Set(rankings);
        const hasAllRanks = requiredRanks.every(rank => selectedRanks.has(rank));
        const allRanksSelected = rankedCount >= 3 && hasAllRanks;
        
        // Update button state
        $confirmBtn
            .prop("disabled", !allRanksSelected)
            .toggleClass("btn-success", allRanksSelected)
            .toggleClass("btn-secondary", !allRanksSelected);
                
        // Update status message and rank displays
        updateStatusMessage(selectedRanks);
        
        // FIXED: Update ALL rank displays to reflect current state
        requiredRanks.forEach(rank => {
            updateRankDisplay(rank, selectedRanks.has(rank));
        });
    }
    
    function updateStatusMessage(selectedRanks) {
        const missing = ['1', '2', '3'].filter(rank => !selectedRanks.has(rank));
        let statusText = "";
        let className = "";
        
        if (missing.length === 3) {
            statusText = MESSAGES.SELECT_STUDIES;
            className = "text-muted";
        } else if (missing.length > 0) {
            statusText = `Noch fehlend: ${missing.map(r => `${r}. Rang`).join(", ")}`;
            className = "text-warning";
        } else {
            statusText = MESSAGES.ALL_SELECTED;
            className = "text-success";
        }
        
        $statusText.text(statusText).removeClass().addClass(className);
    }
    
    function updateRankDisplay(rank, isSelected) {
        // Use a direct child selector that doesn't rely on the dynamic class
        const $rankElement = $(`#rank${rank} > span`);
        
        if (isSelected) {
            // Find the current study for this rank
            const studyKey = Object.keys(savedRankings).find(key => savedRankings[key] === rank);
            const study = studyKey ? findStudyByKey(studyKey) : null;
            
            if (study) {
                const displayText = `${study['First Author']} - ${study['Title']}`;
                $rankElement
                    .text(displayText)
                    .removeClass("study-placeholder")
                    .addClass("text-dark");
            }
        } else {
            $rankElement
                .text(MESSAGES.PLACEHOLDER)
                .removeClass("text-dark")
                .addClass("study-placeholder");
        }
    }
    
    function updateFinalSummary() {
        let summaryHtml = "<h6>Ihre bestätigten Top 3 Studien:</h6>";
        
        const sortedRankings = Object.entries(savedRankings)
            .filter(([, rank]) => parseInt(rank) <= 3)
            .sort(([, a], [, b]) => parseInt(a) - parseInt(b));
        
        sortedRankings.forEach(([studyKey, rank]) => {
            const study = findStudyByKey(studyKey);
            if (study) {
                summaryHtml += `
                    <div>
                        <strong>${rank}. Rang:</strong> ${study['First Author']} - ${study['Title']}
                    </div>`;
            }
        });
        
        $finalSummary.html(summaryHtml);
    }
    
    function findStudyByKey(studyKey) {
        return tableData.find(study => 
            `${study["First Author"]}_${study["Title"]}` === studyKey
        );
    }
    
    async function initializeTable() {
        try {
            const data = await $.getJSON(ENDPOINTS.DATA);
            tableData = data;
            
            dataTable = $(SELECTORS.CSV_TABLE).DataTable({
                data: data,
                searching: false,
                ordering: false,
                paging: false,
                info: false,
                lengthChange: false,
                columns: getTableColumns()
            });
            
            updateUIBasedOnConfirmation();
        } catch (error) {
            console.error('Failed to initialize table:', error);
            throw error;
        }
    }
    
    function getTableColumns() {
        return [
            {
                data: null,
                title: "Ranking<br/>1. 2. 3.",
                orderable: false,
                render: renderRankingColumn
            },
            { data: "First Author", title: "Erstautor", orderable: false },
            { data: "Last Author", title: "Letztautor", orderable: false },
            { data: "Title", title: "Titel", orderable: false },
            { data: "Citation Count", title: "Zitationen", orderable: false },
            { data: "Publikationsjahr", title: "Jahr", orderable: false },
            { data: "Oxford Evidence Level", title: "KI✨<br/>Oxford Evidenz", orderable: false },
            { data: "Impact Factor", title: "IF", orderable: false },
            { data: "Journal", title: "Journal", orderable: false }
        ];
    }
    
    function renderRankingColumn(data, type, row, meta) {
        const groupName = `ranking_${meta.row}`;
        const studyKey = `${row["First Author"]}_${row["Title"]}`;
        const savedRank = savedRankings[studyKey] || '';
        const disabled = isConfirmed ? 'disabled' : '';
        
        return `
            <div class="ranking-options">
                ${[1, 2, 3].map(rank => 
                    `<input type="radio" name="${groupName}" value="${rank}" 
                     class="rank-radio" data-rank="${rank}" data-study-key="${studyKey}" 
                     ${savedRank === rank.toString() ? 'checked' : ''} ${disabled}>`
                ).join(' ')}
            </div>`;
    }
    
    function setupEventHandlers() {
        // Ranking radio button clicks
        $(SELECTORS.CSV_TABLE).on("click", SELECTORS.RANK_RADIO, handleRankingClick);
        
        // Table row clicks for navigation
        $(SELECTORS.CSV_TABLE).on("click", "tbody tr", handleRowClick);
        
        // Confirmation button
        $confirmBtn.on("click", handleConfirmation);
    }
    
    function handleRankingClick(e) {
        if (isConfirmed) {
            e.preventDefault();
            return false;
        }
        
        e.stopPropagation();
        
        const $this = $(this);
        const selectedRank = $this.data("rank").toString();
        const studyKey = $this.data("study-key");
        
        // Check if this radio button is already selected
        if (savedRankings[studyKey] === selectedRank) {
            // Already selected, prevent unselection
            e.preventDefault();
            return;
        }
        
        updateRankings(studyKey, selectedRank);
    }
    
    function handleRowClick(e) {
        // Check if the click was in the ranking column (first cell)
        const isFirstColumn = $(e.target).closest('td').index() === 0;
        
        // Only open detail view if:
        // 1. Not clicking on a radio button
        // 2. Not clicking anywhere in the ranking column
        // 3. Study is not confirmed
        if (!$(e.target).hasClass("rank-radio") && !isFirstColumn && !isConfirmed) {
            const rowData = dataTable.row(this).data();
            const rowIndex = dataTable.row(this).index();
            window.location.href = `/detail/${rowIndex}`;
        }
    }
    
    function updateRankings(studyKey, selectedRank) {
        if (isConfirmed) return;
        
        // Store previous state for potential rollback
        const previousRankings = { ...savedRankings };
        
        // Clear previous rankings for this rank
        clearExistingRank(selectedRank);
        
        // Set new ranking
        savedRankings[studyKey] = selectedRank;
        
        // Update UI immediately
        updateConfirmationState();
        
        // Debounced server save
        debouncedSave(previousRankings);
    }
    
    function clearExistingRank(selectedRank) {
        for (const [key, rank] of Object.entries(savedRankings)) {
            if (rank === selectedRank) {
                delete savedRankings[key];
                $(`.rank-radio[data-study-key='${key}']:checked`).prop("checked", false);
            }
        }
    }
    
    function debouncedSave(previousRankings) {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveRankingsToServer(previousRankings);
        }, 300);
    }
    
    async function saveRankingsToServer(previousRankings = null) {
        try {
            await $.ajax({
                url: ENDPOINTS.SAVE_RANKING,
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ rankings: savedRankings })
            });
            console.log("Rankings saved successfully");
        } catch (error) {
            console.error("Failed to save rankings:", error);
            
            if (previousRankings) {
                // Rollback on error
                savedRankings = previousRankings;
                restoreRadioButtonState();
                updateConfirmationState();
            }
            
            showError(MESSAGES.SAVE_ERROR);
        }
    }
    
    function restoreRadioButtonState() {
        // Clear all radio buttons first
        $(SELECTORS.RANK_RADIO).prop("checked", false);
        
        // Restore based on savedRankings
        Object.entries(savedRankings).forEach(([studyKey, rank]) => {
            $(`.rank-radio[data-study-key='${studyKey}'][data-rank='${rank}']`)
                .prop("checked", true);
        });
    }
    
    async function handleConfirmation() {
        if ($confirmBtn.prop("disabled")) return;
        
        // Show custom confirmation dialog instead of using confirm()
        showConfirmationDialog().then(async (confirmed) => {
            if (!confirmed) return;
            
            try {
                const response = await $.ajax({
                    url: ENDPOINTS.CONFIRM_RANKINGS,
                    method: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ confirmed: true })
                });
                
                isConfirmed = true;
                
                // Handle next task redirection
                if (response.next_task && response.redirect) {
                    // Show transition message
                    $statusText.html(
                        '<span class="text-success">Erste Aufgabe abgeschlossen! Sie werden zur nächsten Aufgabe weitergeleitet...</span>'
                    );
                    
                    // Redirect after a short delay
                    setTimeout(function() {
                        window.location.href = response.redirect;
                    }, 2000);
                    return;
                }
                
                // Handle final task completion with debriefing redirect
                if (response.task_complete) {
                    // Show transition message
                    $statusText.html(
                        '<span class="text-success">Alle Aufgaben abgeschlossen! Sie werden zur Debriefing-Seite weitergeleitet...</span>'
                    );
                    
                    // If there's a redirect URL for debriefing, use it
                    if (response.redirect) {
                        setTimeout(function() {
                            window.location.href = response.redirect;
                        }, 2000);
                        return;
                    }
                    
                    // Fallback if no redirect provided
                    if (response.user_id) {
                        $statusText.html(
                            '<span class="text-success">Alle Aufgaben abgeschlossen! Vielen Dank für Ihre Teilnahme. Ihre Teilnehmer-ID: <strong>' + 
                            response.user_id + '</strong></span>'
                        );
                    } else {
                        $statusText.html('<span class="text-success">Alle Aufgaben abgeschlossen! Vielen Dank für Ihre Teilnahme.</span>');
                    }
                }
                
                // Update the UI
                updateUIBasedOnConfirmation();
            } catch (error) {
                console.error("Failed to confirm rankings:", error);
                showError(MESSAGES.CONFIRM_ERROR);
            }
        });
    }
    
    function showConfirmationDialog() {
        return new Promise((resolve) => {
            const $modal = $("#confirmationModal");
            const $cancelBtn = $("#cancelConfirmBtn");
            const $proceedBtn = $("#proceedConfirmBtn");
            
            // Set the message
            $("#confirmationMessage").text(MESSAGES.CONFIRM_DIALOG);
            
            // Show the modal
            $modal.fadeIn(200);
            
            // Handle cancel button click
            $cancelBtn.off("click").on("click", function() {
                $modal.fadeOut(200);
                resolve(false);
            });
            
            // Handle confirm button click
            $proceedBtn.off("click").on("click", function() {
                $modal.fadeOut(200);
                resolve(true);
            });
            
            // Allow clicking outside to cancel
            $modal.off("click").on("click", function(e) {
                if (e.target === this) {
                    $modal.fadeOut(200);
                    resolve(false);
                }
            });
        });
    }
    
    function showError(message) {
        $statusText
            .removeClass("text-success")
            .addClass("text-danger")
            .text(message);
    }
});