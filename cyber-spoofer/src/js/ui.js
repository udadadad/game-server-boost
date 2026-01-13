const spoofBtn = document.getElementById('spoof-btn');
const logOutput = document.getElementById('log-output');

spoofBtn.onclick = async () => {
    if (spoofBtn.disabled) return;

    spoofBtn.disabled = true;
    spoofBtn.innerText = "SPOOFING...";
    logOutput.innerHTML = "> Initiating Advanced Spoofing System...\n";

    try {
        const result = await window.api.runSpoof();

        if (result.success) {
            logOutput.innerHTML += result.log;
            logOutput.innerHTML += "\n> SUCCESS: System Identifiers Rotated.";
            alert("Spoofing complete! Please RESTART your computer to apply all changes.");
        } else {
            logOutput.innerHTML += "\n> ERROR: " + result.message;
        }
    } catch (e) {
        logOutput.innerHTML += "\n> CRITICAL ERROR: " + e.message;
    } finally {
        spoofBtn.disabled = false;
        spoofBtn.innerText = "SPOOF SYSTEM";
        logOutput.scrollTop = logOutput.scrollHeight;
    }
};
