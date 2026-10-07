(function () {
  "use strict";

  var explorer = document.getElementById("contract-explorer");
  if (!explorer) return;

  var search = document.getElementById("operation-search");
  var methodFilter = document.getElementById("operation-method");
  var status = document.getElementById("contract-status");
  var list = document.getElementById("operation-list");
  var supportedMethods = ["get", "post", "put", "patch", "delete", "options", "head"];
  var operations = [];

  function node(tag, text, className) {
    var element = document.createElement(tag);
    if (text !== undefined && text !== null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function schemaLabel(schema) {
    if (!schema || typeof schema !== "object") return "Not specified";
    if (schema.$ref) return schema.$ref.split("/").pop();
    if (schema.type === "array") return "array of " + schemaLabel(schema.items);
    if (schema.type === "object") {
      var properties = Object.keys(schema.properties || {});
      return properties.length ? "object: " + properties.join(", ") : "object";
    }
    return schema.format ? schema.type + " (" + schema.format + ")" : schema.type || "schema";
  }

  function appendSchema(parent, title, schema) {
    var heading = node("h3", title);
    parent.appendChild(heading);
    if (!schema) {
      parent.appendChild(node("p", "No schema is defined in this OpenAPI operation."));
      return;
    }
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    code.textContent = JSON.stringify(schema, null, 2);
    pre.appendChild(code);
    parent.appendChild(pre);
  }

  function appendParameters(parent, parameters) {
    if (!Array.isArray(parameters) || !parameters.length) return;
    parent.appendChild(node("h3", "Parameters"));
    var table = document.createElement("table");
    var head = document.createElement("thead");
    var row = document.createElement("tr");
    ["Name", "Location", "Required", "Type", "Description"].forEach(function (label) {
      row.appendChild(node("th", label));
    });
    head.appendChild(row);
    table.appendChild(head);
    var body = document.createElement("tbody");
    parameters.forEach(function (parameter) {
      var tr = document.createElement("tr");
      [
        parameter.name || "—",
        parameter.in || "—",
        parameter.required ? "Yes" : "No",
        schemaLabel(parameter.schema),
        parameter.description || "—"
      ].forEach(function (value) {
        tr.appendChild(node("td", value));
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    parent.appendChild(table);
  }

  function appendResponses(parent, responses) {
    if (!responses || typeof responses !== "object") return;
    parent.appendChild(node("h3", "Responses"));
    var table = document.createElement("table");
    var head = document.createElement("thead");
    var header = document.createElement("tr");
    ["HTTP", "Description", "Response schema"].forEach(function (label) {
      header.appendChild(node("th", label));
    });
    head.appendChild(header);
    table.appendChild(head);
    var body = document.createElement("tbody");
    Object.keys(responses).sort().forEach(function (code) {
      var response = responses[code] || {};
      var content = response.content || {};
      var media = content["application/json"] || content["application/*"] || {};
      var tr = document.createElement("tr");
      [code, response.description || "—", schemaLabel(media.schema)].forEach(function (value) {
        tr.appendChild(node("td", value));
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    parent.appendChild(table);
  }

  function authHeaderSets(operation, spec) {
    var schemes = spec.components && spec.components.securitySchemes || {};
    var security = operation.security === undefined ? spec.security : operation.security;
    if (!Array.isArray(security) || security.length === 0) return [];
    return security.map(function (requirement) {
      return Object.keys(requirement).map(function (name) {
        var scheme = schemes[name] || {};
        if (scheme.type === "apiKey" && scheme.in === "header") {
          return '-H "' + scheme.name + ': $PESAGUARD_API_KEY"';
        }
        if (scheme.type === "http" && scheme.scheme === "bearer") {
          return '-H "Authorization: Bearer $PESAGUARD_ACCESS_TOKEN"';
        }
        return null;
      }).filter(Boolean);
    }).filter(function (headers) { return headers.length > 0; });
  }

  function renderOperation(item, spec) {
    var details = document.createElement("details");
    details.className = "operation-card";
    var summary = document.createElement("summary");
    var verb = node("span", item.method.toUpperCase(), "operation-method");
    verb.setAttribute("data-method", item.method.toUpperCase());
    summary.appendChild(verb);
    summary.appendChild(node("code", item.path));
    summary.appendChild(node("span", item.operation.summary || "Operation"));
    details.appendChild(summary);

    var content = document.createElement("div");
    content.className = "operation-details";
    if (item.operation.description) content.appendChild(node("p", item.operation.description));
    if (item.tags.length) content.appendChild(node("p", "Tags: " + item.tags.join(", ")));

    var headerSets = authHeaderSets(item.operation, spec);
    content.appendChild(node("p", headerSets.length
      ? "Authentication is described by the OpenAPI security scheme. Keep credentials in environment variables."
      : "This operation has no security requirement declared in the OpenAPI document."));
    appendParameters(content, item.parameters);

    var requestBody = item.operation.requestBody;
    if (requestBody) {
      var media = requestBody.content || {};
      var jsonBody = media["application/json"] || media["application/*"];
      appendSchema(content, "Request body" + (requestBody.required ? " (required)" : ""), jsonBody && jsonBody.schema);
    }
    appendResponses(content, item.operation.responses);

    var curlPath = item.path.replace(/\{([^}]+)\}/g, function (_, parameter) {
      return "${" + parameter.toUpperCase() + "}";
    });
    var curlLines = [
      "curl --fail-with-body -X " + item.method.toUpperCase() + ' "$PESAGUARD_API_URL' + curlPath + '"'
    ];
    curlLines.push('-H "Accept: application/json"');
    if (headerSets.length) {
      curlLines = curlLines.concat(headerSets[0]);
    }
    if (requestBody) {
      curlLines.push('-H "Content-Type: application/json"');
      curlLines.push("--data '<replace-with-request-json>'");
    }
    var curl = curlLines.map(function (line, index) {
      return index === 0 || line.charAt(0) === "#" ? line : "  " + line;
    }).join(" \\\n");
    var snippet = document.createElement("pre");
    snippet.className = "docs-code";
    snippet.setAttribute("data-lang", "bash");
    var code = document.createElement("code");
    code.textContent = curl;
    snippet.appendChild(code);
    var copy = node("button", "Copy cURL", "contract-copy");
    copy.type = "button";
    copy.addEventListener("click", function () {
      var text = code.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          copy.textContent = "Copied";
        }).catch(function () {
          copy.textContent = "Copy failed";
        });
      } else {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(code);
        selection.removeAllRanges();
        selection.addRange(range);
        copy.textContent = document.execCommand("copy") ? "Copied" : "Select and copy";
        selection.removeAllRanges();
      }
    });
    content.appendChild(node("h3", "cURL template"));
    content.appendChild(copy);
    content.appendChild(snippet);
    details.appendChild(content);
    return details;
  }

  function render(spec) {
    var query = (search.value || "").trim().toLowerCase();
    var method = methodFilter.value.toLowerCase();
    var filtered = operations.filter(function (item) {
      var matchesMethod = !method || item.method === method;
      var haystack = [item.path, item.method, item.operation.summary || "", item.operation.description || ""]
        .concat(item.tags).join(" ").toLowerCase();
      return matchesMethod && (!query || haystack.indexOf(query) !== -1);
    });
    list.textContent = "";
    if (!filtered.length) {
      list.appendChild(node("p", "No operations match these filters.", "operation-empty"));
    } else {
      var fragment = document.createDocumentFragment();
      filtered.forEach(function (item) {
        fragment.appendChild(renderOperation(item, spec));
      });
      list.appendChild(fragment);
    }
    status.textContent = filtered.length + " of " + operations.length + " operations shown. Templates are not executed.";
  }

  search.addEventListener("input", function () {
    if (window.pesaGuardOpenApi) render(window.pesaGuardOpenApi);
  });
  methodFilter.addEventListener("change", function () {
    if (window.pesaGuardOpenApi) render(window.pesaGuardOpenApi);
  });

  fetch("openapi.json", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("OpenAPI mirror returned HTTP " + response.status);
      return response.json();
    })
    .then(function (spec) {
      if (!spec || typeof spec.paths !== "object") throw new Error("OpenAPI mirror has no paths object");
      window.pesaGuardOpenApi = spec;
      Object.keys(spec.paths).forEach(function (path) {
        var pathItem = spec.paths[path] || {};
        supportedMethods.forEach(function (method) {
          var operation = pathItem[method];
          if (!operation || typeof operation !== "object") return;
          var pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
          var operationParameters = Array.isArray(operation.parameters) ? operation.parameters : [];
          operations.push({
            path: path,
            method: method,
            operation: operation,
            tags: Array.isArray(operation.tags) ? operation.tags : [],
            parameters: pathParameters.concat(operationParameters)
          });
        });
      });
      operations.sort(function (a, b) {
        return a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
      });
      explorer.setAttribute("aria-busy", "false");
      render(spec);
    })
    .catch(function (error) {
      explorer.setAttribute("aria-busy", "false");
      status.textContent = "The OpenAPI contract could not be loaded. Use the JSON or YAML download links above. (" + error.message + ")";
    });
})();
