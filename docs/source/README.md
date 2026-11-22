# Documentation sources

The documentation in `docs/` is generated, not typed by hand:

- `build_documentation.py` builds `Community-Connect-Documentation.docx` from
  `course-template.docx` (the course's template, which keeps its styles and
  page setup). All the text is in this script. Text the team still has to
  supply is written as `PH('...')` and shows up highlighted in yellow.
- `diagrams/*.mmd` are the Mermaid diagrams (architecture, use case, ERD,
  data flow, sequence, flowchart, IPO). `render.js` turns them into PNGs.
- Screenshots are taken from the web build at phone size with Playwright.

To rebuild: render the diagrams and screenshots into a figures folder, then

```bash
python3 build_documentation.py course-template.docx <figures-folder> out.docx
soffice --headless --convert-to pdf out.docx
```

Easiest option: ask Claude Code to "update the documentation", and it will
redo these steps.
