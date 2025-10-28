import * as parser from './src/floorplan-parser.js';

// Test if Color rule works
try {
  const result = parser.parse('grid 1000\n\nroom Test1 5000x5000 at zeropoint:top-left\n    object square 2000x1000 #8ff0a4');
  console.log('Parse successful!');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.log('Parse error:', error.message);
  if (error.location) {
    console.log('Location:', error.location);
  }
}
