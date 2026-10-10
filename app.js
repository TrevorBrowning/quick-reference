(() => {
  "use strict";

  /*
   * Privacy notes:
   * - No network calls, analytics, third-party scripts, or remote assets.
   * - Imported JSON is parsed and rendered locally in this browser.
   * - Data is saved in localStorage for this website's origin only.
   * - Do not publish your private JSON file to your GitHub repository.
   */
  const STORAGE_KEY = "quick-reference-data-v1";
  const LAST_TAB_KEY = "quick-reference-tab-v1";

  const mppTab = document.getElementById("mppTab");
  const invTab = document.getElementById("invTab");
  const mppPanel = document.getElementById("mppPanel");
  const invPanel = document.getElementById("invPanel");
  const mppList = document.getElementById("mppList");
  const invList = document.getElementById("invList");
  const mppCount = document.getElementById("mppCount");
  const invCount = document.getElementById("invCount");
  const fileInput = document.getElementById("fileInput");
  const importButton = document.getElementById("importButton");
  const clearButton = document.getElementById("clearButton");
  const statusMessage = document.getElementById("statusMessage");

  const text = (value) => String(value ?? "").trim();
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  function setTab(which, save = true) {
    const showMpp = which !== "inv";
    mppPanel.hidden = !showMpp;
    invPanel.hidden = showMpp;
    mppTab.classList.toggle("active", showMpp);
    invTab.classList.toggle("active", !showMpp);
    mppTab.setAttribute("aria-selected", String(showMpp));
    invTab.setAttribute("aria-selected", String(!showMpp));
    if (save) {
      try { localStorage.setItem(LAST_TAB_KEY, showMpp ? "mpp" : "inv"); } catch (_) {}
    }
  }

  function makeElement(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }

  function addField(card, label, value) {
    if (!text(value)) return;
    card.appendChild(makeElement("div", "entry-label", label));
    card.appendChild(makeElement("p", "entry-value", text(value)));
  }

  function renderMpp(items) {
    mppList.replaceChildren();
    mppCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    if (!items.length) {
      mppList.appendChild(makeElement("div", "empty-state", "No MPP entries in this file."));
      return;
    }
    items.forEach((item) => {
      const card = makeElement("article", "entry");
      const top = makeElement("div", "entry-top");
      top.appendChild(makeElement("span", "entry-number", text(item.classNumber ?? item.class ?? item["Class #"] ?? "—")));
      top.appendChild(makeElement("p", "entry-description", text(item.description ?? item.Description ?? "No description")));
      card.appendChild(top);
      addField(card, "Guideline", item.guideline ?? item.Guideline);
      mppList.appendChild(card);
    });
  }

  function renderInventory(items) {
    invList.replaceChildren();
    invCount.textContent = `${items.length} ${items.length === 1 ? "code" : "codes"}`;
    if (!items.length) {
      invList.appendChild(makeElement("div", "empty-state", "No inventory codes in this file."));
      return;
    }
    items.forEach((item) => {
      const card = makeElement("article", "entry");
      const top = makeElement("div", "entry-top");
      top.appendChild(makeElement("span", "entry-number", text(item.codeNumber ?? item.code ?? item["Code #"] ?? "—")));
      top.appendChild(makeElement("p", "entry-description", text(item.description ?? item.Description ?? "No description")));
      card.appendChild(top);
      addField(card, "Reason for use", item.reasonForUse ?? item.reason ?? item["Reason for use"]);
      const polarity = text(item.polarity ?? item.positiveNegative ?? item["Positive/Negative"]);
      if (polarity) {
        card.appendChild(makeElement("div", "entry-label", "Positive / Negative"));
        const badge = makeElement("span", `polarity ${polarity.toLowerCase().includes("neg") ? "negative" : "positive"}`, polarity);
        card.appendChild(badge);
      }
      invList.appendChild(card);
    });
  }

  function normalizeData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("The JSON file must contain an object with an mpp list and an inventoryCodes list.");
    }
    const mpp = data.mpp ?? data.MPP;
    const inventory = data.inventoryCodes ?? data.inventory ?? data.invCodes ?? data["Inv Codes"];
    if (!Array.isArray(mpp) || !Array.isArray(inventory)) {
      throw new Error('Expected both "mpp" and "inventoryCodes" arrays. Use the template file format.');
    }
    for (const item of [...mpp, ...inventory]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error("Every list entry must be an object.");
      }
    }
    return { mpp, inventoryCodes: inventory };
  }

  function render(data) {
    renderMpp(data.mpp);
    renderInventory(data.inventoryCodes);
    clearButton.hidden = false;
    statusMessage.textContent = `Saved on this device · ${data.mpp.length} MPP · ${data.inventoryCodes.length} codes`;
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = normalizeData(JSON.parse(raw));
      render(data);
      return true;
    } catch (error) {
      statusMessage.textContent = "Saved data could not be read. Import your JSON file again.";
      return false;
    }
  }

  mppTab.addEventListener("click", () => setTab("mpp"));
  invTab.addEventListener("click", () => setTab("inv"));
  importButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      const contents = await file.text();
      const data = normalizeData(JSON.parse(contents));
      // Persist only to this browser's local storage; no upload is performed.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      render(data);
      statusMessage.textContent = `Imported and saved on this device · ${data.mpp.length} MPP · ${data.inventoryCodes.length} codes`;
    } catch (error) {
      statusMessage.textContent = error instanceof SyntaxError
        ? "That file isn't valid JSON. Check the file and try again."
        : (error.message || "Couldn't import that file.");
      window.alert(statusMessage.textContent);
    } finally {
      fileInput.value = "";
    }
  });

  clearButton.addEventListener("click", () => {
    const confirmed = window.confirm("Remove the saved reference lists from this browser? This will not delete your original JSON file.");
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    renderMpp([]);
    renderInventory([]);
    clearButton.hidden = true;
    statusMessage.textContent = "Saved data cleared from this browser";
  });

  setTab(localStorage.getItem(LAST_TAB_KEY) || "mpp", false);
  if (!loadSaved()) {
    mppCount.textContent = "0 items";
    invCount.textContent = "0 codes";
  }
})();
