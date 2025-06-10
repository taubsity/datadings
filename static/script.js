$(document).ready(function () {
    // Load rankings from server instead of sessionStorage
    var savedRankings = {};
    
    // Fetch saved rankings from server
    $.getJSON("/get_rankings", function(rankings) {
        savedRankings = rankings;
        initializeTable();
    });
    
    function initializeTable() {
        $.getJSON("/data", function (data) {
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
                            
                            return '<div class="ranking-options">' +
                                   '<input type="radio" name="'+groupName+'" value="1" class="rank-radio" data-rank="1" data-study-key="'+studyKey+'" ' + (savedRank === '1' ? 'checked' : '') + '> ' +
                                   '<input type="radio" name="'+groupName+'" value="2" class="rank-radio" data-rank="2" data-study-key="'+studyKey+'" ' + (savedRank === '2' ? 'checked' : '') + '> ' +
                                   '<input type="radio" name="'+groupName+'" value="3" class="rank-radio" data-rank="3" data-study-key="'+studyKey+'" ' + (savedRank === '3' ? 'checked' : '') + '>' +
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

            // Handle ranking changes
            $("#csvTable").on("click", ".rank-radio", function(e) {
                e.stopPropagation();
                
                var selectedRank = $(this).data("rank").toString();
                var studyKey = $(this).data("study-key");
                
                // Update rankings and save to server
                updateRankings(studyKey, selectedRank);
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
    }
    
    function updateRankings(studyKey, selectedRank) {
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
            }
        });
    }
});
