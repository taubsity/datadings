document.addEventListener("DOMContentLoaded", function () {
    var timerElement = document.getElementById("timer");
    
    // Only run timer if timer element exists (i.e., on study page)
    if (!timerElement) {
        return;
    }

    // Check if timer should start (only if coming from start page)
    var shouldStartTimer = sessionStorage.getItem("startTimer");
    if (shouldStartTimer === "true") {
        sessionStorage.removeItem("startTimer");
        startStudyTimer();
    }

    // Check if a study start time exists
    var storedStartTime = localStorage.getItem("studyStartTime");
    if (storedStartTime) {
        startTimerDisplay(parseInt(storedStartTime, 10));
    }
});

// Function to start the timer (called when study begins)
function startStudyTimer() {
    var startTime = Date.now();
    localStorage.setItem("studyStartTime", startTime);
    startTimerDisplay(startTime);
}

function startTimerDisplay(startTime) {
    var timerElement = document.getElementById("timer");
    if (!timerElement) return;
    
    var countdownTime = 4 * 60 * 1000; // 4 minutes in milliseconds

    function updateTimer() {
        var elapsedTime = Date.now() - startTime;
        var remainingTime = countdownTime - elapsedTime;

        // Change timer text color to red when there are 30 seconds or less left.
        if (remainingTime <= 30000) {
            timerElement.style.color = "red";
        } else {
            timerElement.style.color = "";
        }

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
    updateTimer(); // Call immediately to show initial time
}
