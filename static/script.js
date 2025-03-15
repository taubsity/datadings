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
                { data: "First Author", title: "Erstautor", orderable: false },
                { data: "Last Author", title: "Letztautor", orderable: false },
                { data: "Title", title: "Titel", orderable: false },
                { data: "Citation Count", title: "Zitationen", orderable: false },
                { data: "Publikationsjahr", title: "Jahr", orderable: false },
                { data: "Oxford Evidence Level", title: "Oxford Evidenz (KI ✨)", orderable: false },
                { data: "Impact Factor", title: "Impact-Faktor", orderable: false },
                { data: "Journal", title: "Journal", orderable: false }
            ]
        });

        // Bind click event to entire table rows.
        $("#csvTable tbody").on("click", "tr", function () {
            var row = table.row(this);
            var rowData = row.data();

            var details = `
                <div class="expandable-content">
                    <strong>Abstract:</strong>
                    <div class="abstract-box">${rowData.Abstract || "Keine Angabe"}</div>
                    <strong>Autoren:</strong>
                    <div class="authors-box">${rowData.Autoren || "Keine Angabe"}</div>
                    <strong>Studienart:</strong> ${rowData["Studiendesign/Studienart"] || "Keine Angabe"}<br>
                    <strong>Methodische Qualität:</strong> ${rowData["Methdische Qualität"] || "Keine Angabe"}<br>
                    <strong>Tumorentität:</strong> ${rowData["Tumor Entität"] || "Keine Angabe"}<br>
                    <strong>Präregistriert:</strong> ${rowData["Präregestriert"] || "Keine Angabe"}<br>
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
