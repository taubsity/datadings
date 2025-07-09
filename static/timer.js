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
    // var countdownTime = 0.6 * 60 * 1000; // 1 hour in milliseconds
    var warningThreshold = 30000; // 30 seconds in milliseconds
    var hasPlayedWarningSound = false;
    var blinkInterval;
    
    // Create audio element for notification sound
    var audioAlert = new Audio();
    audioAlert.src = "/static/alerto.mp3"; // Make sure to add this file to your static folder
    audioAlert.preload = "auto";

    function updateTimer() {
        var elapsedTime = Date.now() - startTime;
        var remainingTime = countdownTime - elapsedTime;

        // Handle timer warning state (30 seconds or less)
        if (remainingTime <= warningThreshold) {
            // Change timer text color to red
            timerElement.style.color = "red";
            
            // Play sound once when we first cross the 30-second threshold
            if (!hasPlayedWarningSound) {
                audioAlert.play().catch(function(error) {
                    console.log("Audio playback failed: " + error);
                });
                hasPlayedWarningSound = true;
                
                // Start blinking effect
                timerElement.classList.add("blink");
                
                // If not already blinking, start the blinking interval
                if (!blinkInterval) {
                    blinkInterval = setInterval(function() {
                        timerElement.style.visibility = 
                            timerElement.style.visibility === "hidden" ? "visible" : "hidden";
                    }, 500); // Blink every 500ms
                }
            }
        } else {
            timerElement.style.color = "";
            timerElement.style.visibility = "visible";
            timerElement.classList.remove("blink");
            if (blinkInterval) {
                clearInterval(blinkInterval);
                blinkInterval = null;
            }
        }

        if (remainingTime <= 0) {
            timerElement.textContent = "00:00:00";
            timerElement.style.visibility = "visible";
            if (blinkInterval) {
                clearInterval(blinkInterval);
            }
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
