document.addEventListener("DOMContentLoaded", function () {
    var timerElement = document.getElementById("timer");

    // If the page was reloaded, remove the stored start time.
    var navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0 && navEntries[0].type === "reload") {
        localStorage.removeItem("appStartTime");
    }

    // Check if an app start time is already saved; if not, save the current time.
    var storedStartTime = localStorage.getItem("appStartTime");
    if (!storedStartTime) {
        storedStartTime = Date.now();
        localStorage.setItem("appStartTime", storedStartTime);
    }
    var startTime = parseInt(storedStartTime, 10);
    var countdownTime = 4 * 60 * 1000; // 4 minutes in milliseconds

    function updateTimer() {
        var elapsedTime = Date.now() - startTime;
        var remainingTime = countdownTime - elapsedTime;

        if (remainingTime <= 0) {
            timerElement.textContent = "00:00:00";
            clearInterval(timerInterval);
            return;
        }

        var minutes = Math.floor(remainingTime / 60000);
        var seconds = Math.floor((remainingTime % 60000) / 1000);

        timerElement.textContent = 
            "00:" + 
            String(minutes).padStart(2, '0') + ":" + 
            String(seconds).padStart(2, '0');
    }

    var timerInterval = setInterval(updateTimer, 1000);
});
