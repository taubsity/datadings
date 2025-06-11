$(document).ready(function () {
    // Load rankings from server instead of sessionStorage
    var savedRankings = {};
    var isConfirmed = false;
    var tableData = [];
    
    // Fetch saved rankings from server
    $.getJSON("/get_rankings", function(rankings) {
        savedRankings = rankings;
        checkConfirmationStatus();
        initializeTable();
    });
    
    function checkConfirmationStatus() {
        // Check if rankings are confirmed
        $.getJSON("/get_confirmation_status", function(data) {
            isConfirmed = data.confirmed || false;
            updateUIBasedOnConfirmation();
        });
    }
    
    function updateUIBasedOnConfirmation() {
        if (isConfirmed) {
            $("#confirmationSection").hide();
            $("#confirmedSection").show();
            disableRankingInputs();
            updateFinalSummary();
        } else {
            $("#confirmedSection").hide();
            $("#confirmationSection").show(); // Always show confirmation section
            updateConfirmationState();
        }
    }
    
    function disableRankingInputs() {
        $(".rank-radio").prop("disabled", true);
        $("tbody tr").off("click"); // Remove click handlers
        $("tbody tr").css("cursor", "default");
    }
    
    function updateConfirmationState() {
        var rankedCount = Object.keys(savedRankings).length;
        var hasRank1 = Object.values(savedRankings).includes('1');
        var hasRank2 = Object.values(savedRankings).includes('2');
        var hasRank3 = Object.values(savedRankings).includes('3');
        
        var allRanksSelected = rankedCount >= 3 && hasRank1 && hasRank2 && hasRank3;
        
        // Update button state
        if (allRanksSelected) {
            $("#confirmBtn").prop("disabled", false).removeClass("btn-secondary").addClass("btn-success");
            $("#buttonHelpText").hide();
        } else {
            $("#confirmBtn").prop("disabled", true).removeClass("btn-success").addClass("btn-secondary");
            $("#buttonHelpText").show();
        }
        
        // Update status message
        updateStatusMessage(hasRank1, hasRank2, hasRank3);
        
        // Update individual rank displays
        updateRankDisplay('1', hasRank1);
        updateRankDisplay('2', hasRank2);
        updateRankDisplay('3', hasRank3);
    }
    
    function updateStatusMessage(hasRank1, hasRank2, hasRank3) {
        var missing = [];
        if (!hasRank1) missing.push("1. Rang");
        if (!hasRank2) missing.push("2. Rang");
        if (!hasRank3) missing.push("3. Rang");
        
        var statusText = "";
        if (missing.length === 3) {
            statusText = "Wählen Sie Ihre Top 3 Studien aus, indem Sie auf die entsprechenden Ranking-Buttons (1, 2, 3) klicken.";
            $("#statusText").removeClass("text-warning").addClass("text-muted");
        } else if (missing.length > 0) {
            statusText = `Noch fehlend: ${missing.join(", ")}`;
            $("#statusText").removeClass("text-muted").addClass("text-warning");
        } else {
            statusText = "Alle Ränge ausgewählt. Sie können nun bestätigen.";
            $("#statusText").removeClass("text-muted text-warning").addClass("text-success");
        }
        
        $("#statusText").text(statusText);
    }
    
    function updateRankDisplay(rank, isSelected) {
        var rankElement = $("#rank" + rank + " .study-placeholder");
        
        if (isSelected) {
            // Find the study for this rank
            var studyKey = Object.keys(savedRankings).find(key => savedRankings[key] === rank);
            if (studyKey) {
                var study = findStudyByKey(studyKey);
                if (study) {
                    var displayText = `${study['First Author']} - ${study['Title']}`;
                    rankElement.text(displayText).removeClass("study-placeholder").addClass("text-dark");
                }
            }
        } else {
            rankElement.text("Bitte wählen Sie eine Studie aus").removeClass("text-dark").addClass("study-placeholder");
        }
    }
    
    function updateFinalSummary() {
        var summaryHtml = "<h6>Ihre bestätigten Top 3 Studien:</h6>";
        
        // Sort by rank
        var sortedRankings = Object.entries(savedRankings).sort((a, b) => a[1] - b[1]);
        
        sortedRankings.forEach(function([studyKey, rank]) {
            var study = findStudyByKey(studyKey);
            if (study && rank <= 3) {
                summaryHtml += `<div class="mb-2">
                    <strong>${rank}. Rang:</strong> ${study['First Author']} - ${study['Title']}
                </div>`;
            }
        });
        
        $("#finalSummary").html(summaryHtml);
    }
    
    function findStudyByKey(studyKey) {
        return tableData.find(function(study) {
            return (study["First Author"] + "_" + study["Title"]) === studyKey;
        });
    }
    
    function initializeTable() {
        $.getJSON("/data", function (data) {
            tableData = data; // Store data for later reference
            
            var table = $("#csvTable").DataTable({
                data: data,
                searching: false,
                ordering: false,
                paging: false,
                info: false,
                lengthChange: false,
                columns: [
                    { 
                        data: null,
                        title: "Ranking<br>1. 2. 3.",
                        orderable: false,
                        render: function(data, type, row, meta) {
                            var groupName = "ranking_" + meta.row;
                            var studyKey = row["First Author"] + "_" + row["Title"];
                            var savedRank = savedRankings[studyKey] || '';
                            var disabled = isConfirmed ? 'disabled' : '';
                            
                            return '<div class="ranking-options">' +
                                   '<input type="radio" name="'+groupName+'" value="1" class="rank-radio" data-rank="1" data-study-key="'+studyKey+'" ' + (savedRank === '1' ? 'checked' : '') + ' ' + disabled + '> ' +
                                   '<input type="radio" name="'+groupName+'" value="2" class="rank-radio" data-rank="2" data-study-key="'+studyKey+'" ' + (savedRank === '2' ? 'checked' : '') + ' ' + disabled + '> ' +
                                   '<input type="radio" name="'+groupName+'" value="3" class="rank-radio" data-rank="3" data-study-key="'+studyKey+'" ' + (savedRank === '3' ? 'checked' : '') + ' ' + disabled + '>' +
                                   '</div>';
                        }
                    },
                    { data: "First Author", title: "Erstautor", orderable: false },
                    { data: "Last Author", title: "Letztautor", orderable: false },
                    { data: "Title", title: "Titel", orderable: false },
                    { data: "Citation Count", title: "Zitationen", orderable: false },
                    { data: "Publikationsjahr", title: "Jahr", orderable: false },
                    { data: "Oxford Evidence Level", title: "Oxford Evidenz <br>(KI ✨)", orderable: false },
                    { data: "Impact Factor", title: "Impact-Faktor", orderable: false },
                    { data: "Journal", title: "Journal", orderable: false },
                ]
            });

            // Handle ranking changes (only if not confirmed)
            $("#csvTable").on("click", ".rank-radio", function(e) {
                if (isConfirmed) {
                    e.preventDefault();
                    return false;
                }
                
                e.stopPropagation();
                
                var selectedRank = $(this).data("rank").toString();
                var studyKey = $(this).data("study-key");
                
                // Update rankings and save to server
                updateRankings(studyKey, selectedRank);
            });

            // Bind click event to entire table rows (excluding the radio buttons and only if not confirmed).
            $("#csvTable tbody").on("click", "tr", function(e) {
                // Only navigate if the click wasn't on a radio button and rankings aren't confirmed
                if (!$(e.target).hasClass("rank-radio") && !isConfirmed) {
                    var rowData = table.row(this).data();
                    var rowIndex = table.row(this).index();
                    window.location.href = "/detail/" + rowIndex;
                }
            });
            
            updateUIBasedOnConfirmation();
        });
    }
    
    function updateRankings(studyKey, selectedRank) {
        if (isConfirmed) return; // Don't allow changes if confirmed
        
        // Clear previous rankings for this rank
        for (var key in savedRankings) {
            if (savedRankings[key] === selectedRank) {
                delete savedRankings[key];
                $(".rank-radio[data-study-key='" + key + "']:checked").prop("checked", false);
            }
        }
        
        // Set new ranking
        savedRankings[studyKey] = selectedRank;
        
        // Save to server
        $.ajax({
            url: "/save_ranking",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({rankings: savedRankings}),
            success: function(response) {
                console.log("Rankings saved");
                updateConfirmationState();
            }
        });
    }
    
    // Confirmation button handlers
    $("#confirmBtn").click(function() {
        if ($(this).prop("disabled")) return; // Don't allow if disabled
        
        if (confirm("Sind Sie sicher, dass Sie Ihre Auswahl bestätigen möchten? Sie können diese danach nicht mehr ändern.")) {
            $.ajax({
                url: "/confirm_rankings",
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({confirmed: true}),
                success: function(response) {
                    isConfirmed = true;
                    updateUIBasedOnConfirmation();
                    alert("Ihre Auswahl wurde erfolgreich bestätigt!");
                },
                error: function() {
                    alert("Fehler beim Bestätigen der Auswahl. Bitte versuchen Sie es erneut.");
                }
            });
        }
    });
});
