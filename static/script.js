$(document).ready(function () {
    $.getJSON("/data", function (data) {
        var table = $("#csvTable").DataTable({
            data: data,
            searching: false,       // Deaktiviert die Suchleiste
            ordering: false,        // Deaktiviert die Sortierung
            paging: false,          // Alle Zeilen anzeigen
            info: false,            // Versteckt "Showing X of Y entries"
            lengthChange: false,    // Versteckt die "Show X entries"-Option
            columns: [
                { 
                    data: null,
                    title: "Ranking<br>1. 2. 3.",
                    orderable: false,
                    render: function(data, type, row, meta) {
                        // Use a unique radio group name per row
                        var groupName = "ranking_" + meta.row;
                        return '<div class="ranking-options">' +
                               '<input type="radio" name="'+groupName+'" value="1" class="rank-radio" data-rank="1"> ' +
                               '<input type="radio" name="'+groupName+'" value="2" class="rank-radio" data-rank="2"> ' +
                               '<input type="radio" name="'+groupName+'" value="3" class="rank-radio" data-rank="3">' +
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

        // Track used ranks
        var usedRanks = {};

        // Handle radio button clicks
        $("#csvTable").on("click", ".rank-radio", function(e) {
            e.stopPropagation(); // Prevent row click event
            
            var selectedRank = $(this).data("rank");
            var currentRadioName = $(this).attr("name");
            
            // If this rank is already used elsewhere, find and uncheck it
            if (usedRanks[selectedRank] && usedRanks[selectedRank] !== currentRadioName) {
                $(".rank-radio[data-rank='" + selectedRank + "']:checked").prop("checked", false);
            }
            
            // Update the tracking of which radio group is using which rank
            usedRanks[selectedRank] = currentRadioName;
        });

        // Bind click event to entire table rows (excluding the radio buttons).
        $("#csvTable tbody").on("click", "tr", function(e) {
            // Only navigate if the click wasn't on a radio button
            if (!$(e.target).hasClass("rank-radio")) {
                var rowData = table.row(this).data();
                var rowIndex = table.row(this).index();
                window.location.href = "/detail/" + rowIndex;
            }
        });
    });
});
