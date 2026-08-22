import fs from 'node:fs';
import vm from 'node:vm';

const files = ['course.js', 'resources.js', 'courseware-insights.js', 'labs.js', 'questions.js'];
const context = {};
vm.createContext(context);
for (const file of files) vm.runInContext(`${fs.readFileSync(file, 'utf8')}\n`, context, { filename: file });

const questions = vm.runInContext('questions', context);
const labs = vm.runInContext('labs', context);
const areas = vm.runInContext('courseAreas', context);
const insights = vm.runInContext('coursewareInsights', context);
const errors = [];
if (questions.length < 90) errors.push('Question bank lost the courseware-derived extension');
if (labs.length !== 20) errors.push(`Expected 20 labs, found ${labs.length}`);
if (areas.length !== 3) errors.push(`Expected 3 exam areas, found ${areas.length}`);
if (insights.length < 5) errors.push('Expected courseware insights');
const ids = new Set(labs.map((lab) => lab.id));
questions.forEach((question) => { if (!question.sourceType || !question.verification) errors.push(`Question ${question.id} has missing provenance`); question.labIds.forEach((id) => { if (!ids.has(id)) errors.push(`Question ${question.id} references missing ${id}`); }); });
questions.filter((question) => question.sourceType === 'Courseware-derived').forEach((question) => {
  if (!question.coursewareSource?.includes('github.com/tertiarycourses/')) errors.push(`Courseware question ${question.id} has no direct Courseware source`);
});
labs.forEach((lab) => {
  if (!lab.sourceUrl.includes('/blob/main/labs/lab-')) errors.push(`${lab.id} does not link to its original lab file`);
});
if (new Set(questions.map((question) => question.question)).size !== questions.length) errors.push('Duplicate question text found');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Content validation passed: ${questions.length} questions, ${labs.length} labs, ${areas.length} exam areas, ${insights.length} insights`);
