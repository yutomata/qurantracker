const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY";
const SHEET_ID = "YOUR_SHEET_ID";
const RANGE = "Sheet1!A2:B2"; // Adjust to your data range

const SCOPES = "https://www.googleapis.com/auth/spreadsheets";

let gapiInited = false;
let tokenClient;

const statusDiv = document.getElementById("status");
const editorDiv = document.getElementById("editor");
const syncButton = document.getElementById("syncButton");

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }

  gapi.load("client", initializeGapiClient);
});

function initializeGapiClient() {
  gapi.client
    .init({
      apiKey: API_KEY,
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
    })
    .then(() => {
      gapiInited = true;
      initAuth();
    });
}

function initAuth() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: () => loadSheet(),
  });

  tokenClient.requestAccessToken();
}

function loadSheet() {
  gapi.client.sheets.spreadsheets.values
    .get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    })
    .then((response) => {
      const values = response.result.values[0];
      createInputs(values);
    })
    .catch((error) => {
      statusDiv.textContent = "Offline mode: loaded last saved data";
      const saved = JSON.parse(localStorage.getItem("offlineData") || '[""]');
      createInputs(saved);
    });
}

function createInputs(values) {
  editorDiv.innerHTML = "";
  values.forEach((val, index) => {
    const input = document.createElement("input");
    input.value = val;
    input.dataset.index = index;
    editorDiv.appendChild(input);
  });

  syncButton.onclick = syncSheet;
}

function syncSheet() {
  const inputs = [...editorDiv.querySelectorAll("input")];
  const values = [inputs.map((input) => input.value)];

  if (!navigator.onLine) {
    localStorage.setItem("offlineData", JSON.stringify(values[0]));
    statusDiv.textContent = "Saved offline. Will sync later.";
    return;
  }

  gapi.client.sheets.spreadsheets.values
    .update({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      valueInputOption: "RAW",
      resource: { values },
    })
    .then(() => {
      statusDiv.textContent = "Synced with Google Sheets!";
      localStorage.removeItem("offlineData");
    })
    .catch(() => {
      localStorage.setItem("offlineData", JSON.stringify(values[0]));
      statusDiv.textContent = "Failed to sync. Saved offline.";
    });
}
