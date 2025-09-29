export function parseAndRenderVariables(htmlContent, variables = {}) {
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

export function extractVariablesFromHTML(htmlContent) {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return [];
  }

  const variablePattern = /\{\{(\w+)\}\}/g;
  const variables = new Set();
  let match;
  
  while ((match = variablePattern.exec(htmlContent)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

export function generateSampleVariables(variableNames) {
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
  
  const result = {};
  variableNames.forEach(varName => {
    if (sampleValues[varName] !== undefined) {
      result[varName] = sampleValues[varName];
    } else {
      // Generate a random value for unknown variables
      result[varName] = Math.floor(Math.random() * 100);
    }
  });
  
  return result;
}