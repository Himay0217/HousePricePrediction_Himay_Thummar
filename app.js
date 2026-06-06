/** Same origin when served by Flask; fallback for file:// or Live Server */
const API_BASE =
  window.location.protocol === "file:"
    ? "http://127.0.0.1:5000"
    : window.location.origin;

const MAX_LOCATION_SUGGESTIONS = 12;

const els = {
  form: document.getElementById("predict-form"),
  locationInput: document.getElementById("location"),
  locationList: document.getElementById("location-list"),
  locationCombobox: document.getElementById("location-combobox"),
  locationHint: document.getElementById("location-hint"),
  submitBtn: document.getElementById("submit-btn"),
  btnLabel: document.querySelector(".btn__label"),
  btnSpinner: document.querySelector(".btn__spinner"),
  serverStatus: document.getElementById("server-status"),
  resultEmpty: document.getElementById("result-empty"),
  resultValue: document.getElementById("result-value"),
  resultError: document.getElementById("result-error"),
  priceDisplay: document.getElementById("price-display"),
  resultSummary: document.getElementById("result-summary"),
  errorMessage: document.getElementById("error-message"),
};

let locations = [];
let activeSuggestionIndex = -1;

function formatInr(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function titleCaseLocation(name) {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function setLoading(isLoading) {
  els.submitBtn.disabled = isLoading;
  els.btnSpinner.hidden = !isLoading;
  els.btnLabel.textContent = isLoading ? "Estimating…" : "Estimate price";
}

function showServerStatus(message, type) {
  els.serverStatus.hidden = false;
  els.serverStatus.textContent = message;
  els.serverStatus.className = `status status--${type}`;
}

function hideServerStatus() {
  els.serverStatus.hidden = true;
}

function showResultEmpty() {
  els.resultEmpty.hidden = false;
  els.resultValue.hidden = true;
  els.resultError.hidden = true;
}

function showResultValue(price, details) {
  els.resultEmpty.hidden = true;
  els.resultError.hidden = true;
  els.resultValue.hidden = false;
  els.priceDisplay.textContent = formatInr(price);

  els.resultSummary.innerHTML = `
    <div><dt>Location</dt><dd>${titleCaseLocation(details.location)}</dd></div>
    <div><dt>Area</dt><dd>${details.total_sqft} sq.ft</dd></div>
    <div><dt>BHK</dt><dd>${details.bhk}</dd></div>
    <div><dt>Bathrooms</dt><dd>${details.bath}</dd></div>
  `;
}

function showResultError(message) {
  els.resultEmpty.hidden = true;
  els.resultValue.hidden = true;
  els.resultError.hidden = false;
  els.errorMessage.textContent = message;
}

function normalizeLocation(value) {
  return value.trim().toLowerCase();
}

function isValidLocation(value) {
  const normalized = normalizeLocation(value);
  return locations.includes(normalized);
}

function filterLocations(query) {
  const q = normalizeLocation(query);
  if (!q) {
    return locations.slice(0, MAX_LOCATION_SUGGESTIONS);
  }
  return locations
    .filter((loc) => loc.includes(q))
    .slice(0, MAX_LOCATION_SUGGESTIONS);
}

function highlightMatch(text, query) {
  const q = normalizeLocation(query);
  if (!q) return titleCaseLocation(text);
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return titleCaseLocation(text);
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return `${titleCaseLocation(before)}<mark>${titleCaseLocation(match)}</mark>${titleCaseLocation(after)}`;
}

function renderSuggestions(items, query) {
  els.locationList.innerHTML = "";
  activeSuggestionIndex = -1;

  if (items.length === 0) {
    els.locationList.hidden = true;
    els.locationInput.setAttribute("aria-expanded", "false");
    return;
  }

  items.forEach((loc, index) => {
    const li = document.createElement("li");
    li.setAttribute("role", "option");
    li.id = `loc-option-${index}`;
    li.innerHTML = highlightMatch(loc, query);
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      selectLocation(loc);
    });
    els.locationList.appendChild(li);
  });

  els.locationList.hidden = false;
  els.locationInput.setAttribute("aria-expanded", "true");
}

function selectLocation(loc) {
  els.locationInput.value = titleCaseLocation(loc);
  els.locationList.hidden = true;
  els.locationInput.setAttribute("aria-expanded", "false");
  activeSuggestionIndex = -1;
}

function openSuggestions() {
  renderSuggestions(filterLocations(els.locationInput.value), els.locationInput.value);
}

function closeSuggestions() {
  els.locationList.hidden = true;
  els.locationInput.setAttribute("aria-expanded", "false");
  activeSuggestionIndex = -1;
}

function setActiveSuggestion(index) {
  const options = [...els.locationList.querySelectorAll("li")];
  options.forEach((li, i) => {
    li.setAttribute("aria-selected", i === index ? "true" : "false");
  });
  activeSuggestionIndex = index;
  if (index >= 0 && options[index]) {
    options[index].scrollIntoView({ block: "nearest" });
  }
}

async function fetchLocations() {
  const response = await fetch(`${API_BASE}/get_location_names`);
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.locations)) {
    throw new Error("Invalid response from server");
  }
  return data.locations;
}

async function predictPrice(payload) {
  const body = new FormData();
  body.append("total_sqft", String(payload.total_sqft));
  body.append("location", normalizeLocation(payload.location));
  body.append("bhk", String(payload.bhk));
  body.append("bath", String(payload.bath));

  const response = await fetch(`${API_BASE}/predict_home_price`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(`Prediction failed (${response.status})`);
  }

  const data = await response.json();
  if (typeof data.estimated_price !== "number") {
    throw new Error("Invalid prediction response");
  }
  return data.estimated_price;
}

async function init() {
  els.locationInput.addEventListener("input", openSuggestions);
  els.locationInput.addEventListener("focus", openSuggestions);
  els.locationInput.addEventListener("blur", () => {
    setTimeout(closeSuggestions, 150);
  });

  els.locationInput.addEventListener("keydown", (e) => {
    const options = [...els.locationList.querySelectorAll("li")];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (options.length === 0) return;
      const next = activeSuggestionIndex < options.length - 1 ? activeSuggestionIndex + 1 : 0;
      setActiveSuggestion(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (options.length === 0) return;
      const prev = activeSuggestionIndex > 0 ? activeSuggestionIndex - 1 : options.length - 1;
      setActiveSuggestion(prev);
    } else if (e.key === "Enter" && activeSuggestionIndex >= 0 && options[activeSuggestionIndex]) {
      e.preventDefault();
      const filtered = filterLocations(els.locationInput.value);
      selectLocation(filtered[activeSuggestionIndex]);
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  });

  document.addEventListener("click", (e) => {
    if (!els.locationCombobox.contains(e.target)) {
      closeSuggestions();
    }
  });

  try {
    locations = await fetchLocations();
    els.locationHint.textContent = `${locations.length} neighbourhoods available`;
    showServerStatus("Connected to prediction server", "ok");
    setTimeout(hideServerStatus, 4000);
  } catch {
    els.locationHint.textContent = "Could not load locations";
    els.locationInput.disabled = true;
    els.submitBtn.disabled = true;
    showServerStatus(
      `Cannot reach the API at ${API_BASE}. Start the Flask server from the project folder, then refresh.`,
      "error"
    );
    return;
  }

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      location: els.locationInput.value,
      total_sqft: Number(document.getElementById("total_sqft").value),
      bhk: Number(document.getElementById("bhk").value),
      bath: Number(document.getElementById("bath").value),
    };

    if (!isValidLocation(payload.location)) {
      showResultError("Please choose a valid location from the suggestions list.");
      els.locationInput.focus();
      return;
    }

    setLoading(true);
    showResultEmpty();

    try {
      const price = await predictPrice(payload);
      showResultValue(price, payload);
    } catch (err) {
      showResultError(
        err.message || "Something went wrong. Check that the Flask server is running."
      );
    } finally {
      setLoading(false);
    }
  });
}

init();
