document.addEventListener("DOMContentLoaded", function () {
    var timerElement = document.getElementById("timer");
    var startTime = Date.now();
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
