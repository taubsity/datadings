$(document).ready(function () {
    $.getJSON("/data", function (data) {
        var table = $("#csvTable").DataTable({
            data: data,
            searching: false, // Deaktiviert die Suchleiste
            ordering: false,  // Deaktiviert die Sortierung
            paging: false, // Deaktiviert die Seitenzahlen (alle Zeilen anzeigen)
            info: false, // Versteckt "Showing X of Y entries"
            lengthChange: false, // Versteckt die "Show X entries"-Option
            columns: [
                { 
                    data: null,
                    className: "dt-center",
                    defaultContent: '<button class="expand-btn btn btn-sm btn-primary">+</button>',
                    orderable: false
                },
                { data: "First Author", title: "Erstautor", orderable: false },
                { data: "Last Author", title: "Letztautor", orderable: false },
                { data: "Title", title: "Titel", orderable: false },
                { data: "Citation Count", title: "Zitationen", orderable: false },
                { data: "Publikationsjahr", title: "Jahr", orderable: false },
                { data: "Oxford Evidence Level", title: "Oxford Evidenz", orderable: false },
                { data: "Impact Factor", title: "Impact-Faktor", orderable: false },
                { data: "Journal", title: "Journal", orderable: false }
            ]
        });

        // Handle modal popup for row details.
        $("#csvTable tbody").on("click", "button.expand-btn", function () {
            var tr = $(this).closest("tr");
            var row = table.row(tr);
            var rowData = row.data();

            var details = `
                <div class="expandable-content">
                    <strong>Abstract:</strong>
                    <div class="abstract-box">${rowData.Abstract || "Keine Angabe"}</div>
                    <hr>
                    <strong>Autoren:</strong>
                    <div class="authors-box">${rowData.Autoren || "Keine Angabe"}</div>
                    <hr>
                    <strong>Studienart:</strong> ${rowData["Studiendesign/Studienart"] || "Keine Angabe"}<br>
                    <hr>
                    <strong>Methodische Qualität:</strong> ${rowData["Methdische Qualität"] || "Keine Angabe"}<br>
                    <hr>
                    <strong>Tumorentität:</strong> ${rowData["Tumor Entität"] || "Keine Angabe"}<br>
                    <hr>
                    <strong>Präregistriert:</strong> ${rowData["Präregestriert"] || "Keine Angabe"}<br>
                    <hr>
                    <strong>Metaanalyse:</strong> ${rowData.Metanalayse || "Keine Angabe"}
                </div>
            `;
            $("#detailModal .modal-body").html(details);

            // Show the modal using Bootstrap 5
            var modal = new bootstrap.Modal(document.getElementById('detailModal'));
            modal.show();
        });
    });
});
