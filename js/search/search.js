/* ==========================================================================
   Search — client-side, privacy-preserving, no external calls.
   --------------------------------------------------------------------------
   `search.js` reads data/search-index.json (built by
   scripts/build-search-index.js) and shows ranked title/description matches in
   the header dropdown. The sidebar filter in js/app.js stays as the offline
   fallback: if the index is missing or fetching fails, search still works.
   ========================================================================== */
(function () {
  "use strict";

  var input = document.querySelector(".docs-search input");
  if (!input) return;

  var box = document.createElement("div");
  box.className = "search-results";
  box.setAttribute("role", "listbox");
  box.setAttribute("aria-label", "Search results");
  var wrap = input.closest(".docs-search");
  wrap.style.position = "relative";
  wrap.appendChild(box);

  var indexUrl = (document.body.getAttribute("data-root") || "") + "data/search-index.json";
  var index = null;
  var loading = false;

  function score(entry, terms) {
    var haystack = (entry.title + " " + entry.description).toLowerCase();
    var total = 0;
    for (var i = 0; i < terms.length; i += 1) {
      var term = terms[i];
      if (entry.title.toLowerCase().indexOf(term) !== -1) total += 4;
      if (haystack.indexOf(term) !== -1) total += 1;
    }
    return total;
  }

  function render(terms) {
    box.innerHTML = "";
    if (!index) return;
    var hits = index
      .map(function (entry) { return { entry: entry, s: score(entry, terms) }; })
      .filter(function (hit) { return hit.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 8);

    if (!hits.length) {
      var empty = document.createElement("p");
      empty.className = "hit-empty";
      empty.textContent = "No matching page.";
      box.appendChild(empty);
      box.setAttribute("data-open", "true");
      return;
    }

    hits.forEach(function (hit) {
      var a = document.createElement("a");
      a.href = hit.entry.href;
      a.setAttribute("role", "option");
      a.innerHTML =
        '<span class="hit-section">' + hit.entry.section + "</span>" +
        '<span class="hit-title">' + hit.entry.title + "</span>";
      box.appendChild(a);
    });
    box.setAttribute("data-open", "true");
  }

  function close() { box.setAttribute("data-open", "false"); }

  input.addEventListener("input", function () {
    var value = input.value.trim();
    if (value.length < 2) { close(); return; }
    var terms = value.toLowerCase().split(/\s+/);
    if (index) { render(terms); return; }
    if (loading) return;
    loading = true;
    fetch(indexUrl)
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) { index = Array.isArray(data) ? data : null; if (index) render(terms); })
      .catch(function () { index = null; })
      .then(function () { loading = false; });
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { close(); input.blur(); }
    if (event.key === "Enter") {
      var first = box.querySelector("a");
      if (first) { window.location.href = first.getAttribute("href"); }
    }
  });

  document.addEventListener("click", function (event) {
    if (!wrap.contains(event.target)) close();
  });
})();