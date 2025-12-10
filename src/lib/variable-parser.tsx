/**
 * Parses HTML content and replaces variable placeholders with their values
 * Variables are in the format {{variableName}} and are replaced with styled spans
 * @param {string} htmlContent - HTML content containing variable placeholders
 * @param {Record<string, any>} [variables={}] - Object mapping variable names to their values
 * @returns {string} HTML content with variables replaced by styled spans
 */
export function parseAndRenderVariables(htmlContent: string, variables: Record<string, any> = {}): string {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return htmlContent;
  }

  // Regular expression to match {{variable}} pattern
  const variablePattern = /\{\{(\w+)\}\}/g;
  
  // Replace variables with their values
  let renderedContent = htmlContent.replace(variablePattern, (match, variableName) => {
    // Check if the variable exists in the provided variables object
    if (variables[variableName] !== undefined) {
      return `<span class="variable-value" data-variable="${variableName}">${variables[variableName]}</span>`;
    }
    // Return the original placeholder if no value is provided
    return `<span class="variable-placeholder" data-variable="${variableName}">${match}</span>`;
  });
  
  return renderedContent;
}

/**
 * Extracts all variable names from HTML content that uses {{variableName}} syntax
 * @param {string} htmlContent - HTML content to extract variables from
 * @returns {string[]} Array of unique variable names found in the content
 */
export function extractVariablesFromHTML(htmlContent: string): string[] {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  const variablePattern = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;
  
  while ((match = variablePattern.exec(htmlContent)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Generates sample values for given variable names
 * Uses predefined sample values for common variable names, generates random numbers for others
 * @param {string[]} variableNames - Array of variable names to generate sample values for
 * @returns {Record<string, any>} Object mapping variable names to their sample values
 */
export function generateSampleVariables(variableNames: string[]): Record<string, any> {
  const sampleValues = {
    // Common math/physics variables
    x: Math.floor(Math.random() * 100),
    y: Math.floor(Math.random() * 100),
    a: Math.floor(Math.random() * 10) + 1,
    b: Math.floor(Math.random() * 10) + 1,
    n: Math.floor(Math.random() * 20) + 1,
    
    // Common names
    name: ['Alice', 'Bob', 'Charlie', 'Diana'][Math.floor(Math.random() * 4)],
    city: ['New York', 'London', 'Tokyo', 'Paris'][Math.floor(Math.random() * 4)],
    
    // Common values
    price: (Math.random() * 100).toFixed(2),
    quantity: Math.floor(Math.random() * 50) + 1,
    percentage: Math.floor(Math.random() * 100),
    
    // Time-related
    time: Math.floor(Math.random() * 24) + 1,
    days: Math.floor(Math.random() * 30) + 1,
    year: 2020 + Math.floor(Math.random() * 5),
  };
  
  const result: Record<string, any> = {};
  variableNames.forEach(varName => {
    if ((sampleValues as any)[varName] !== undefined) {
      result[varName] = (sampleValues as any)[varName];
    } else {
      // Generate a random value for unknown variables
      result[varName] = Math.floor(Math.random() * 100);
    }
  });
  
  return result;
}