// Register service worker to control making site work offline

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").then(() => {
        console.log("[Info] Service Worker Registered");
    });
}

// A2HS (add 2 home screen) functionality

// Initialize deferredPrompt for use later to show browser install prompt.
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can install the PWA
    showInstallPromotion();
    // Optionally, send analytics event that PWA install promo was shown.
    console.log(`[Info] A2HS compatible`);


    addBtn.addEventListener("click", () => {
        // hide our user interface that shows our A2HS button
        addBtn.style.display = "none";
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("User accepted the A2HS prompt");
            } else {
                console.log("User dismissed the A2HS prompt");
            }
            deferredPrompt = null;
        });
    });
});

// Control the timer
// TODO: Fix bug
const SUBMISSION_DATE = new Date(2023, 3 - 1, 24, 23, 59);
// const SUBMISSION_DATE = new Date("2022-11-25");
// const SUBMISSION_DATE = Date.
// const SUBMISSION_DATE = new Date("2022-11-2");

function updateTimer() {
    let date = new Date();

    if ((SUBMISSION_DATE - date) < 0) {
        document.getElementById("timer").innerHTML = "Submissions are over for this month :(";
        return;
    }

    // Chicken farmer question
    let st = "";
    let days = (SUBMISSION_DATE - new Date()) * (1 / 1000) * (1 / 60) * (1 / 60) * (1 / 24);
    let hours = ((SUBMISSION_DATE - new Date()) * (1 / 1000) * (1 / 60) * (1 / 60)) % 24;
    let minutes = ((SUBMISSION_DATE - new Date()) * (1 / 1000) * (1 / 60)) % 60;
    let seconds = ((SUBMISSION_DATE - new Date()) * (1 / 1000)) % 60;
    st = Math.round(days) + " days " + Math.round(hours) + ":" + Math.round(minutes) + ":" + Math.round(seconds);

    document.getElementById("timer").innerHTML = "Submission deadline for this month is <b>" + SUBMISSION_DATE.toDateString() + "</b>, which is in <b> " + st + "</b>";
}

setInterval(() => {
    // Update the timer
    updateTimer();
}, 1000);

updateTimer();
