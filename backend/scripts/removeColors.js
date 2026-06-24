const fs = require('fs');
const files = [
  'frontend/src/components/events/FeedbackSection.jsx',
  'frontend/src/components/events/FeedbackModal.jsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/, color: "#facc15"/g, '');
  content = content.replace(/ color: "#facc15", /g, ' ');
  fs.writeFileSync(file, content);
}
console.log('Removed colors');
