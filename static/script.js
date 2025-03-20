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
                { data: "Oxford Evidence Level", title: "Oxford Evidenz", orderable: false },
                { data: "Impact Factor", title: "Impact-Faktor", orderable: false },
                { data: "Journal", title: "Journal", orderable: false }
            ]
        });

        // Bind click event to entire table rows.
        $("#csvTable tbody").on("click", "tr", function () {
            var rowData = table.row(this).data();
            var rowIndex = table.row(this).index();
            window.location.href = "/detail/" + rowIndex;
        });

        // Remove or comment out the following lines:
        // $("#csvTable tbody").on("click", "tr", function () {
        //     var row = table.row(this);
        //     var rowData = row.data();
        //     // ... code that shows the modal ...
        // });
    });
});
