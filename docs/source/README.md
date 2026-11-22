# Documentation sources

The documentation in `docs/` is generated, not typed by hand:

- `build_software.py` builds `Community-Connect-Software-Documentation.docx`
  and `build_paper.py` builds `Community-Connect-Paper.docx`, both from
  `course-template.docx` (the course's template, which keeps its styles and
  page setup). All the text is in these scripts. Text the team still has to
  supply is written as `PH('...')` and shows up highlighted in yellow.
- `diagrams/*.mmd` are the Mermaid diagrams (architecture, use case, ERD,
  data flow, sequence, flowchart, IPO). `render.js` turns them into PNGs.
- Screenshots are taken from the web build at phone size with Playwright.

To rebuild: render the diagrams and screenshots into a figures folder, then

```bash
python3 build_software.py course-template.docx <figures-folder> software.docx
python3 build_paper.py course-template.docx <figures-folder> paper.docx
soffice --headless --convert-to pdf software.docx paper.docx
```

Easiest option: ask Claude Code to "update the documentation", and it will
redo these steps.
