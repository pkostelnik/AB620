import fs from 'node:fs';
import vm from 'node:vm';

export const root = new URL('../', import.meta.url);
export function loadContent() {
  const context = vm.createContext({});
  for (const file of ['course.js', 'resources.js', 'courseware-insights.js', 'labs.js', 'questions.js', 'locale-data.js', 'i18n.js']) {
    vm.runInContext(fs.readFileSync(new URL(file, root), 'utf8'), context, { filename: file });
  }
  return JSON.parse(vm.runInContext('JSON.stringify({questions, labs, resources, areas: courseAreas, insights: coursewareInsights, outcomes: learningOutcomes, localeData, uiText})', context));
}
