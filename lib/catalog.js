"use strict";

function filterCatalogItems(items, args, options) {
  let result = Array.isArray(items) ? items.slice() : [];
  const source = args || {};
  const filters = {
    tag: normalizeFilterText(source.tag),
    tags: Array.isArray(source.tags) ? source.tags.map(normalizeFilterText).filter(Boolean) : [],
    tagsMode: source.tagsMode === "any" ? "any" : "all",
    group: normalizeFilterText(source.group),
    status: options && options.includeStatus ? normalizeFilterText(source.status) : "",
    slot: normalizeFilterText(source.slot),
    autoSelectable: typeof source.autoSelectable === "boolean" ? source.autoSelectable : undefined,
    query: normalizeFilterText(source.query)
  };
  if (filters.tag) {
    filters.tags.push(filters.tag);
  }
  if (filters.tags.length > 0) {
    result = result.filter((item) => {
      const itemTags = new Set((item.tags || []).map(normalizeFilterText));
      if (filters.tagsMode === "any") {
        return filters.tags.some((tag) => itemTags.has(tag));
      }
      return filters.tags.every((tag) => itemTags.has(tag));
    });
  }
  if (filters.group) {
    result = result.filter((item) => normalizeFilterText(item.group) === filters.group);
  }
  if (options && options.includeStatus && filters.status) {
    result = result.filter((item) => normalizeFilterText(item.status) === filters.status);
  }
  if (filters.slot) {
    result = result.filter((item) => {
      return (item.slots || []).map(normalizeFilterText).includes(filters.slot);
    });
  }
  if (options && options.includeAutoSelectable && typeof filters.autoSelectable === "boolean") {
    result = result.filter((item) => Boolean(item.autoSelectable) === filters.autoSelectable);
  }
  if (filters.query) {
    const fields = options && options.queryFields ? options.queryFields : ["id", "name", "group", "tags"];
    result = result.filter((item) => {
      const values = [];
      fields.forEach((field) => {
        if (field === "tags") {
          values.push(...(item.tags || []));
        } else {
          values.push(item[field]);
        }
      });
      return values.join(" ").toLowerCase().includes(filters.query);
    });
  }
  const limit = Math.max(1, Math.min(200, Number(source.limit) || 50));
  return {
    filters,
    total: result.length,
    items: result.slice(0, limit)
  };
}

function normalizeFilterText(value) {
  return String(value || "").trim().toLowerCase();
}

module.exports = {
  filterCatalogItems,
  normalizeFilterText
};
