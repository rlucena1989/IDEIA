'use strict'

function toPascalCase(input) {
  return String(input).replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^(.)/, s => s.toUpperCase())
}

function toCamelCase(input) {
  const pascal = toPascalCase(input)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function toKebabCase(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

module.exports = { toPascalCase, toCamelCase, toKebabCase }