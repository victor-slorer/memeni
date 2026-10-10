// Text offered as downloads on the Import screen.

export const EXAMPLE_CSV = `#schema=1
type,question,answers,distractors
written,"What is the complexity of binary search?","O(log n)|log n|logn",
truefalse,"Python lists are immutable.","false",
multiple,"Which are sorting algorithms?","Merge sort|Quick sort","Dijkstra|BFS"
`;

export const EXAMPLE_MD = `---
schema: 1
---

### written
What does this print?
\`\`\`python
print(len([1, 2, 3]))
\`\`\`
- answer: 3

### truefalse
Python lists are immutable.
- answer: false

### multiple
Which are sorting algorithms?
- correct: Merge sort | Quick sort
- wrong: Dijkstra | BFS
`;

export const SCHEMA_DOC = `# memeni import schema, version 1

Two formats are accepted: CSV (good for bulk data) and Markdown (good for code).
Both go through the same validator. Nothing is imported unless the whole file is
clean; errors list the line they were found on.

## Card types
- written    — free-text answer. List every accepted answer; the first is shown
               after answering. Matching ignores case, extra spaces, accents and
               (optionally) a leading a/an/the. Spelling variants (colour|color)
               must be listed explicitly.
- truefalse  — answer is exactly "true" or "false".
- multiple   — one or more correct options plus wrong options ("distractors").
               At least 2 options in total, at least 1 correct, no duplicates,
               no "all of the above" / "none of the above". Graded all-or-nothing;
               the number of correct options is never shown.

## Lists
Items are separated with "|". Write "\\|" for a literal pipe.

## CSV
The first line must be "#schema=1", the second the header
"type,question,answers,distractors". Quote fields containing commas, quotes or
line breaks (standard CSV quoting: "" inside a quoted field is a quote).
"distractors" is only filled for multiple-choice cards.

${EXAMPLE_CSV}
## Markdown
The file starts with frontmatter containing "schema: 1". Each card starts with a
"### <type>" heading, followed by the question (may span lines and contain a
fenced code block), followed by its answer lines:
- written / truefalse:  "- answer: ..."
- multiple:             "- correct: ..." and "- wrong: ..."

${EXAMPLE_MD}`;
