"use strict";

const fs = require("fs");
const { filterCatalogItems, normalizeFilterText } = require("./catalog");

function listTemplates(catalogPath, args) {
  const catalog = loadTemplateCatalog(catalogPath);
  const taskType = normalizeFilterText(args && args.taskType);
  let candidates = catalog.items;
  if (taskType) {
    candidates = candidates.filter((template) => normalizeFilterText(template.taskType) === taskType);
  }
  const filtered = filterCatalogItems(candidates, args || {}, {
    queryFields: ["id", "name", "description", "taskType", "tags"]
  });
  return {
    ok: true,
    catalogVersion: catalog.version,
    schema: catalog.schema,
    filters: Object.assign({}, filtered.filters, { taskType }),
    total: filtered.total,
    returned: filtered.items.length,
    items: filtered.items.map(summarizeTemplate)
  };
}

function getTemplate(catalogPath, id) {
  const catalog = loadTemplateCatalog(catalogPath);
  const normalizedId = normalizeFilterText(id);
  const template = catalog.items.find((item) => normalizeFilterText(item.id) === normalizedId);
  if (!template) {
    throw new Error(`template not found: ${id}`);
  }
  return {
    ok: true,
    catalogVersion: catalog.version,
    schema: catalog.schema,
    template
  };
}

function loadTemplateCatalog(catalogPath) {
  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  } catch (error) {
    throw new Error(`failed to read template catalog ${catalogPath}: ${error.message}`);
  }
  if (!catalog || !Array.isArray(catalog.items)) {
    throw new Error(`invalid template catalog ${catalogPath}: items[] is required`);
  }
  const seen = new Set();
  catalog.items.forEach((template, index) => {
    if (!template || typeof template.id !== "string" || template.id.length === 0) {
      throw new Error(`invalid template catalog ${catalogPath}: items[${index}].id is required`);
    }
    if (seen.has(template.id)) {
      throw new Error(`invalid template catalog ${catalogPath}: duplicate id ${template.id}`);
    }
    seen.add(template.id);
    if (typeof template.taskType !== "string" || template.taskType.length === 0) {
      throw new Error(`invalid template catalog ${catalogPath}: ${template.id}.taskType is required`);
    }
  });
  return catalog;
}

function summarizeTemplate(template) {
  return {
    id: template.id,
    version: template.version,
    name: template.name,
    description: template.description,
    taskType: template.taskType,
    tags: template.tags || [],
    input: template.input || {},
    variables: template.variables || []
  };
}

module.exports = {
  listTemplates,
  getTemplate,
  loadTemplateCatalog
};
