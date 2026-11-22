"""Builds the Community Connect documentation from the course template.

Usage: python3.13 build.py <template.docx> <figs_dir> <out.docx>
Keeps the template's styles/page setup, replaces the body with real content.
Text the team still has to supply is highlighted yellow in [brackets].
"""
import copy
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image

TEMPLATE, FIGS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
doc = Document(TEMPLATE)

# ---------------------------------------------------------------------------
# Reset body, keep section properties
# ---------------------------------------------------------------------------
body = doc.element.body
for child in list(body):
    if child.tag != qn('w:sectPr'):
        body.remove(child)

# Caption style (template has none) so Word can build List of Tables/Figures.
styles = doc.styles
if 'Caption' not in [s.name for s in styles]:
    cap = styles.add_style('Caption', WD_STYLE_TYPE.PARAGRAPH)
    cap.base_style = styles['Normal']
    cap.font.size = Pt(9)
    cap.font.italic = True
    cap.font.color.rgb = RGBColor(0x40, 0x40, 0x40)
    cap.paragraph_format.space_before = Pt(4)
    cap.paragraph_format.space_after = Pt(10)

# Ask Word to refresh TOC / SEQ fields when the file is opened.
settings = doc.settings.element
uf = OxmlElement('w:updateFields')
uf.set(qn('w:val'), 'true')
# Schema order: updateFields goes right before these elements.
_after = ['hdrShapeDefaults', 'footnotePr', 'endnotePr', 'compat', 'docVars', 'rsids', 'mathPr',
          'attachedSchema', 'themeFontLang', 'clrSchemeMapping', 'doNotIncludeSubdocsInStats',
          'doNotAutoCompressPictures', 'forceUpgrade', 'captions', 'readModeInkLockDown', 'smartTagType',
          'schemaLibrary', 'shapeDefaults', 'doNotEmbedSmartTags', 'decimalSymbol', 'listSeparator']
_anchor = next((c for c in settings if c.tag.split('}')[1] in _after), None)
if _anchor is not None:
    _anchor.addprevious(uf)
else:
    settings.append(uf)

# ---------------------------------------------------------------------------
# Numbering: abstractNum 0 = bullets, 1 = decimal (from the template)
# ---------------------------------------------------------------------------
numbering = doc.part.numbering_part.element
_next_num = [max(int(n.get(qn('w:numId'))) for n in numbering.findall(qn('w:num'))) + 1]


def new_decimal_list():
    num = OxmlElement('w:num')
    num.set(qn('w:numId'), str(_next_num[0]))
    a = OxmlElement('w:abstractNumId')
    a.set(qn('w:val'), '1')
    num.append(a)
    ov = OxmlElement('w:lvlOverride')
    ov.set(qn('w:ilvl'), '0')
    so = OxmlElement('w:startOverride')
    so.set(qn('w:val'), '1')
    ov.append(so)
    num.append(ov)
    numbering.append(num)
    _next_num[0] += 1
    return _next_num[0] - 1


BULLET_NUM = 1


def set_num(p, num_id, level=0):
    pPr = p._p.get_or_add_pPr()
    numPr = OxmlElement('w:numPr')
    il = OxmlElement('w:ilvl')
    il.set(qn('w:val'), str(level))
    ni = OxmlElement('w:numId')
    ni.set(qn('w:val'), str(num_id))
    numPr.append(il)
    numPr.append(ni)
    pPr.append(numPr)


# ---------------------------------------------------------------------------
# Writing helpers
# ---------------------------------------------------------------------------
# Inline markup: **bold**, [[placeholder]] (yellow highlight, kept in brackets)
import re

TOKEN = re.compile(r'(\*\*.+?\*\*|\[\[.+?\]\]|~~.+?~~)')


def add_runs(p, text, bold=None, italic=None, size=None):
    for part in TOKEN.split(text):
        if not part:
            continue
        if part.startswith('**') and part.endswith('**'):
            r = p.add_run(part[2:-2])
            r.bold = True
        elif part.startswith('[[') and part.endswith(']]'):
            r = p.add_run('[' + part[2:-2] + ']')
            r.font.highlight_color = WD_COLOR_INDEX.YELLOW
        elif part.startswith('~~') and part.endswith('~~'):
            r = p.add_run(part[2:-2])
            r.italic = True
        else:
            r = p.add_run(part)
        if bold is not None:
            r.bold = bold if not r.bold else True
        if italic:
            r.italic = True
        if size:
            r.font.size = Pt(size)
    return p


def h1(text):
    return _pb(doc.add_paragraph(text, style='Heading 1'))


def h2(text):
    return _pb(doc.add_paragraph(text, style='Heading 2'))


def h3(text):
    return _pb(doc.add_paragraph(text, style='Heading 3'))


def h4(text):
    return _pb(doc.add_paragraph(text, style='Heading 4'))


def para(text, align=None, italic=None, size=None, space_after=None):
    p = _pb(doc.add_paragraph())
    add_runs(p, text, italic=italic, size=size)
    if align == 'center':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == 'justify':
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if space_after is not None:
        p.paragraph_format.space_after = Pt(space_after)
    return p


def lead(label, text):
    """'2.1 Purpose.' style paragraph: bold lead-in followed by text."""
    p = doc.add_paragraph()
    r = p.add_run(label + ' ')
    r.bold = True
    add_runs(p, text)
    return p


def bullets(items):
    for it in items:
        p = doc.add_paragraph(style='List Paragraph')
        add_runs(p, it)
        set_num(p, BULLET_NUM)


def numbered(items):
    nid = new_decimal_list()
    for it in items:
        p = doc.add_paragraph(style='List Paragraph')
        add_runs(p, it)
        set_num(p, nid)


_break_next = [False]


def page_break():
    # Applied as "page break before" on the next paragraph, so a chapter that ends exactly at the
    # bottom of a page never leaves a blank page behind.
    _break_next[0] = True


def _pb(p):
    if _break_next[0]:
        p.paragraph_format.page_break_before = True
        _break_next[0] = False
    return p


def add_field(p, instr, cached):
    def fld(t):
        r = OxmlElement('w:r')
        f = OxmlElement('w:fldChar')
        f.set(qn('w:fldCharType'), t)
        if t == 'begin':
            f.set(qn('w:dirty'), 'true')
        r.append(f)
        return r
    p._p.append(fld('begin'))
    r = OxmlElement('w:r')
    it = OxmlElement('w:instrText')
    it.set(qn('xml:space'), 'preserve')
    it.text = f' {instr} '
    r.append(it)
    p._p.append(r)
    p._p.append(fld('separate'))
    run = p.add_run(cached)
    p._p.append(fld('end'))
    return run


counters = {'Table': 0, 'Figure': 0}


def caption(kind, text):
    counters[kind] += 1
    p = doc.add_paragraph(style='Caption')
    p.add_run(f'{kind} ')
    add_field(p, f'SEQ {kind} \\* ARABIC', str(counters[kind]))
    p.add_run('. ' + text)
    if kind == 'Figure':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    # Keep table captions with the table that follows.
    if kind == 'Table':
        p.paragraph_format.keep_with_next = True
    return counters[kind]


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill)
    tcPr.append(shd)


def table(headers, rows, widths, cap=None, font_size=None):
    """Table Grid table with the template's gray header row."""
    if cap:
        caption('Table', cap)
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = doc.styles['Table Grid']
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        c.text = ''
        add_runs(c.paragraphs[0], h, bold=True, size=font_size)
        shade(c, 'F2F2F2')
    # Repeat header row on page breaks.
    trPr = t.rows[0]._tr.get_or_add_trPr()
    th = OxmlElement('w:tblHeader')
    th.set(qn('w:val'), 'true')
    trPr.append(th)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            lines = val if isinstance(val, list) else [val]
            for j, line in enumerate(lines):
                p = cells[i].paragraphs[0] if j == 0 else cells[i].add_paragraph()
                add_runs(p, line, size=font_size)
    fix_widths(t, widths)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t



def fix_widths(t, widths):
    """Set column widths on the grid, the table and every cell (Word and LibreOffice)."""
    tbl = t._tbl
    tblPr = tbl.tblPr
    t.autofit = False  # python-docx writes <w:tblLayout w:type="fixed"/> in schema order
    tw = tblPr.find(qn('w:tblW'))
    tw.set(qn('w:w'), str(int(sum(widths) * 1440)))
    tw.set(qn('w:type'), 'dxa')
    grid = tbl.tblGrid
    for gc, w in zip(grid.findall(qn('w:gridCol')), widths):
        gc.set(qn('w:w'), str(int(w * 1440)))
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Inches(w)

def figure(name, cap, max_w=6.5, max_h=7.6):
    path = f'{FIGS}/{name}'
    w, h = Image.open(path).size
    width = min(max_w, max_h * w / h)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(path, width=Inches(width))
    return caption('Figure', cap)


def screens(items, cap=None, width=2.0):
    """Row(s) of phone screenshots, each with its own caption."""
    cols = len(items)
    t = doc.add_table(rows=1, cols=cols)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (name, label) in enumerate(items):
        c = t.rows[0].cells[i]
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(f'{FIGS}/{name}', width=Inches(width))
        cp = c.add_paragraph(style='Caption')
        cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        counters['Figure'] += 1
        cp.add_run('Figure ')
        add_field(cp, 'SEQ Figure \\* ARABIC', str(counters['Figure']))
        cp.add_run('. ' + label)
    fix_widths(t, [6.5 / cols] * cols)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def toc(instr, placeholder):
    p = doc.add_paragraph()
    add_field(p, instr, placeholder)


PH = lambda s: f'[[{s}]]'  # noqa: E731

# ===========================================================================
# CONTENT
# ===========================================================================
# ---------------------------------------------------------------------------
for txt, sz, b in [('COMMUNITY CONNECT', 20, True),
                   ('A Community Events and Announcement Application', 14, False),
                   ('', 11, False),
                   ('A Project Presented to', 11, False),
                   (PH('Department / College, School name'), 11, False),
                   ('', 11, False),
                   ('In Partial Fulfillment of the Requirements in', 11, False),
                   ('Application Development and Emerging Technologies', 11, True),
                   ('', 11, False),
                   ('By', 11, False),
                   ('Salundaguit, Henjiel A.', 11, False), ('Ucag, Jennifer N.', 11, False),
                   ('Monsales, Justin Dave', 11, False), ('Bohol, Philip', 11, False),
                   ('Doloeras, Patricia', 11, False), ('Pedida, Toroi', 11, False),
                   ('', 11, False),
                   ('BSCS-3C', 11, False),
                   ('Instructor: Mary Angel Palma', 11, False),
                   ('November 2026', 11, False)]:
    p = para(txt, align='center', space_after=2)
    for r in p.runs:
        r.font.size = Pt(sz)
        if b:
            r.bold = True

page_break()
para('**Abstract**')
para('Residents often miss community events and announcements because information is spread across '
     'social-media pages, group chats, printed notices and word of mouth, and later changes are easy to '
     'overlook. This study developed Community Connect, a mobile application that gathers local events '
     'from verified organizers in one searchable place. Residents can browse and filter events by '
     'category, date, location and organizing group, view complete event details, save events and give an '
     'RSVP or interest signal, while cancelled and postponed events are clearly marked. The application was '
     'built with Expo and React Native using an iterative, prototype-driven process, with wireframes and a '
     'high-fidelity prototype designed in Figma. It supports three roles: residents, verified organizers who '
     'publish and update events, and administrators who approve organizers and handle reports. It also shows '
     'each resident\'s events on a map of Biliran and alerts them when events change. A cloud backend (Supabase) '
     'is proposed for persistent accounts and data. System testing showed that the prototype meets its '
     'functional requirements: all 14 test cases passed after the defects found during testing were fixed, '
     'all 32 screens fit a 360-pixel phone screen, and the app ran on an Android phone with a working map of '
     'events. A user evaluation with residents, organizers and IT experts, using a questionnaire based on '
     'ISO/IEC 25010 and the System Usability Scale, is the next step of the study.', align='justify')
para('**Keywords:** community events, mobile application, React Native, verified organizers, usability')

para('**Acknowledgment**')
para('The researchers sincerely thank Ms. Mary Angel Palma, their instructor in Application Development '
     'and Emerging Technologies, for her guidance throughout this project; '
     'the panel members for their feedback; everyone who tried the prototype and shared suggestions; and '
     'their families and friends for their constant support.', align='justify')

para('**Table of Contents**')
toc('TOC \\o "1-4" \\h \\z \\u', 'Right-click here and choose Update Field to build the table of contents.')
para('**List of Tables**')
toc('TOC \\h \\z \\c "Table"', 'Right-click here and choose Update Field to build the list of tables.')
para('**List of Figures**')
toc('TOC \\h \\z \\c "Figure"', 'Right-click here and choose Update Field to build the list of figures.')

# Chapter 1 -----------------------------------------------------------------
page_break()
h3('Chapter 1: Introduction')
lead('1.1 Background of the Study.',
     'Smartphones have become the main way young people look for information about what is happening around '
     'them, and mobile apps are now a common channel for public services and community activities. Yet in many '
     'local communities, information about events and announcements is still shared through a mixture of '
     'social-media pages, printed posters, group chats, word of mouth and organization-specific channels.')
para('In the researchers\' community, youth programs, school activities, sports leagues, cultural events and '
     'volunteer drives are announced by different groups (Sangguniang Kabataan, barangay offices, schools, '
     'non-profits and volunteer groups), each on its own page or chat. Residents who do not follow every page or '
     'belong to every group chat learn about activities late, often after registration has closed, and cannot '
     'easily tell whether an older post still has the latest venue and time.', align='justify')
para('Organizers face the opposite problem: they post the same information repeatedly in several places and '
     'still have no simple way to reach every interested resident, especially when an event is moved or '
     'cancelled. These gaps motivated Community Connect, a centralized mobile application where trusted, verified '
     'organizers publish events and residents can find, save and follow them.', align='justify')
lead('1.2 Statement of the Problem.',
     'Residents have difficulty keeping track of community events and announcements because information is '
     'scattered across platforms and channels, and important details can be missed, outdated or hard to confirm. '
     'Specifically, this study sought to answer the following questions:')
numbered([
    'What is the current process of sharing and finding community events and announcements, and what are its '
    'weaknesses for residents and organizers?',
    'How can a mobile application with verified organizer posts, search and filters, saving, RSVP and change '
    'notices address these weaknesses?',
    'How effective and acceptable is the developed application in terms of functional suitability, usability, '
    'performance efficiency, reliability and security, as evaluated by residents, organizers and IT experts?',
])
lead('1.3 Objectives of the Study.',
     'The general objective is to develop Community Connect, a mobile application that helps residents discover '
     'local community events and receive important announcements in one convenient place. Specifically, it aims to:')
numbered([
    'Identify the weaknesses of the current ways events are announced and found, through the proposal\'s problem '
    'analysis and user personas.',
    'Design and develop a mobile application where residents can browse, search and filter events; view complete '
    'event details; save events; and give a simple RSVP, while verified organizers create and manage listings.',
    'Evaluate the application using ISO/IEC 25010 quality characteristics and the System Usability Scale.',
])
lead('1.4 Scope and Delimitations.',
     'The study covers a mobile application for Android and iOS with three user types: residents, who browse, '
     'search, filter, save, RSVP to and report events; verified organizers, who create and manage their '
     'organization\'s listings and post announcements; and administrators, who verify organizers and moderate '
     'content. It covers five event categories (youth, educational, sports, cultural and volunteer), in-app '
     'alerts for changes and reminders, and a map of each resident\'s events. The prototype uses sample events '
     'in all eight municipalities of Biliran, which is also the intended coverage area.')
para('The study does not cover ticket sales or payments, chat or messaging between users, social-media features '
     'such as comments and followers, or a web version for the public (a web preview is used only during '
     'development). Organizations are verified manually by administrators rather than through an automated '
     'process. Alerts are shown inside the app; push notifications to a closed app depend on the backend being '
     'completed during the study period.', align='justify')
lead('1.5 Significance of the Study.', '')
bullets([
    '**Residents and youth:** one reliable place to find activities, details and updates, so fewer missed '
    'registrations and wasted trips.',
    '**Community organizers (SK, barangay, schools, non-profits):** post once, update once, and reach '
    'interested residents, with a "verified" mark that builds trust.',
    '**Local government units:** a channel for public programs and urgent community updates.',
    '**Future researchers and developers:** a documented, open codebase and design files to extend, e.g., '
    'with notifications, maps or other municipalities.',
])
lead('1.6 Conceptual Framework.',
     'The study follows the Input-Process-Output model shown below. Feedback from the evaluation returns to '
     'the process for refinement.')
caption('Figure', 'Conceptual framework (Input-Process-Output)')
table(['INPUT', 'PROCESS', 'OUTPUT'], [[
    ['Problems: scattered posts, missed updates, unverified sources',
     'Event details from verified organizers',
     'Resident needs: youth, educational, sports, cultural and volunteer events',
     'Hardware, software and personnel requirements'],
    ['Requirements gathering (proposal, personas)',
     'Design: wireframes and high-fidelity prototype (Figma)',
     'Iterative development (Expo / React Native)',
     'Testing and evaluation (ISO/IEC 25010, SUS)'],
    ['Community Connect mobile application',
     'Centralized, searchable list of trusted local events',
     'Evaluation results and recommendations'],
]], [2.15, 2.15, 2.2])
lead('1.7 Definition of Terms.', '')
table(['Term', 'Operational definition'], [
    ['Community Connect', 'The mobile application developed in this study.'],
    ['Resident', 'A user who browses, searches, saves and responds to events.'],
    ['Verified organizer', 'A member of an organization approved by administrators to post and manage events.'],
    ['Administrator', 'A team member who reviews organizer applications, reported events and accounts.'],
    ['Organizer application', 'A request, with supporting documents, from a resident to become a verified organizer.'],
    ['Event', 'A community activity with a title, schedule, venue, organizer, category and registration details.'],
    ['RSVP', 'A resident\'s response to an event: Going or Interested.'],
    ['Saved event', 'An event a resident bookmarked to find again later.'],
    ['Expo / React Native', 'Frameworks used to build one app that runs natively on Android and iOS.'],
    ['Expo Go', 'A phone app used to run and test the project during development.'],
    ['Supabase', 'A cloud service providing a PostgreSQL database, sign-in and access rules (proposed backend).'],
    ['Row-level security', 'Database rules that decide which rows each user may read or change.'],
    ['Push notification', 'A message shown on the phone even when the app is closed.'],
    ['Mock data', 'Sample events and accounts stored in the app, used before the real database is connected.'],
    ['Map pin', 'A marker on the map showing where one of the resident\'s events takes place.'],
    ['ISO/IEC 25010', 'International standard describing software product quality characteristics.'],
    ['System Usability Scale (SUS)', 'A 10-item questionnaire that produces a usability score from 0 to 100.'],
], [1.8, 4.7], cap='Definition of terms')

# Chapter 2 -----------------------------------------------------------------
page_break()
h3('Chapter 2: Review of Related Literature and Studies')
lead('2.1 Related Literature.',
     'Davis (1989) showed that people adopt an information system when they find it useful and easy to use; '
     'this is why Community Connect puts the essential details of an event (date, time, venue, organizer and '
     'how to join) on the first screens instead of behind menus. Nielsen\'s (1994) usability heuristics, such '
     'as visibility of system status, consistency and recognition rather than recall, guided the design of '
     'clear status badges for cancelled and postponed events and consistent chips and buttons across screens.')
para('ISO/IEC 25010 (International Organization for Standardization [ISO], 2011) defines software product '
     'quality through characteristics such as functional suitability, performance efficiency, usability, '
     'reliability and security, and is widely used to evaluate student and community information systems. '
     'Brooke (1996) introduced the System Usability Scale as a quick, reliable ten-item measure of perceived '
     'usability, and Bangor et al. (2008) and Sauro (2011) provided benchmarks for interpreting its scores.',
     align='justify')
para('For development, React Native (Meta Platforms, n.d.) lets one JavaScript/TypeScript codebase render '
     'native interface components on both Android and iOS, and Expo (Expo, n.d.) adds tooling for building, '
     'testing on real devices and updating apps. Supabase (Supabase, n.d.) provides a managed PostgreSQL '
     'database with authentication and row-level security.', align='justify')
lead('2.2 Related Studies (Local and Foreign).',
     'Several existing platforms address parts of the problem. **Facebook Events** reaches many users but '
     'mixes event information with unrelated posts and depends on following the right pages. **Eventbrite** '
     'focuses on ticketed events and registration for organizers, and **Meetup** organizes recurring interest '
     'groups; both are designed for broad audiences rather than one community\'s verified local organizations. '
     'Locally, barangay and SK Facebook pages and group chats remain the main channels, which is the situation '
     'described in Chapter 1.')
para('**Foreign studies**')
para('Md Sharif (2020) developed **Campus Shout Out**, an Android app in Malaysia that pushes event information '
     'entered by organizers to a campus community, because posters, flyers and Facebook posts caused missed '
     'events and low participation. User acceptance and functionality testing showed the app worked and users '
     'were satisfied. This closely mirrors Community Connect\'s problem: scattered channels replaced by one '
     'organizer-fed event app.', align='justify')
para('ALFarsi et al. (2018) built a mobile news tool for AlBuraimi University College in Oman because circulars, '
     'notice boards and email failed to reach members. It lists events and announcements with push '
     'notifications, and its evaluation showed strong user interest and satisfaction, supporting the alerts '
     'feature of this study.', align='justify')
para('Ganoe et al. (2010) iteratively designed a location-sensitive mobile application used at two community '
     'New Year\'s Eve events in the United States, and showed that mobile tools tied to time and place can '
     'support community engagement and civic participation. This supports the Map tab of Biliran events.',
     align='justify')
para('Turdiyev et al. (2025) developed "Local Events," an Android and Firebase app in Uzbekistan with event '
     'listings, real-time chat, push notifications and secure authentication, arguing that mobile apps deliver '
     'real-time updates where traditional methods fall short.', align='justify')
para('Khalil and Tagalog (2026) used a descriptive design and Agile development to build **Univibe**, a single '
     'platform in Oman for four user types (students, club leaders, staff and business owners) with event '
     'posting, announcements and participation. Its multi-role structure parallels the resident, verified '
     'organizer and administrator roles of Community Connect.', align='justify')
para('Chong et al. (2024) piloted **nukampung**, a community app in Singapore with announcement and meeting '
     'modules (Town Hall, RSVP, discussion board and hosting events) and map-based browsing by proximity, which '
     'supports the save, RSVP and map features of this study.', align='justify')
para('**Local studies**')
para('Intal et al. (2026) developed **Barangay Connect** in Pasay City, an e-barangay website and app whose '
     'residents\' hub includes an events calendar, real-time notifications, announcements and emergency alerts, '
     'based on a survey of 50 residents. It is the closest local analogue to Community Connect\'s feature set.',
     align='justify')
para('Jaictin et al. (2025) built a barangay management app for Barangay Pagatpatan, Butuan City, with real-time '
     'announcements and in-app notifications, using Agile, React and **Supabase**, and validated it with the '
     'System Usability Scale. It uses the same backend this study proposes and the same usability instrument.',
     align='justify')
para('Rivas (2026) developed a barangay information management system that sends announcements, reminders and '
     'urgent notifications to residents\' phones, evaluated on functionality, usability, reliability and '
     'effectiveness. It supports the notification design and offers a local evaluation framework.',
     align='justify')
para('Bringula et al. (2019) surveyed 30 residents and interviewed officials to identify what a barangay mobile '
     'app should do (accept complaints, disseminate information, expedite documents and support decisions), '
     'then built the E-Barangay app. It is a methods precedent for this study\'s requirements gathering.',
     align='justify')
para('Cristobal et al. (2018) proposed **Pasigueño Assistant**, an e-participation framework for Pasig City that '
     'channels residents\' concerns through one platform, supporting the argument that one official channel '
     'works better than scattered ones.', align='justify')
para('Chico et al. (2026) built **SK WebbyApp** in Angeles City so that Sangguniang Kabataan officials can post '
     'activities and youth can find and join them, evaluated by IT experts, SK officials and citizens under '
     'ISO/IEC 25010. SK officials are exactly one of this study\'s organizer types, and its evaluation mirrors '
     'the one planned here.', align='justify')
para('Evangelista et al. (2026) identified four barriers to local information in the Philippines (delayed '
     'alerts, algorithm-driven Facebook noise, language gaps and digital divides) and found that **KUBO**, a '
     'platform for verified LGU advisories, outperformed Facebook on task time, recall and satisfaction. This '
     'directly supports this study\'s problem statement.', align='justify')
lead('2.3 Emerging Technologies Reviewed.', '')
bullets([
    '**Cross-platform native frameworks:** React Native renders real platform components; Expo SDK 58 '
    'packages React Native 0.88 with modules for icons, images and native tab bars.',
    '**Backend-as-a-service:** platforms such as Supabase provide database, authentication and access rules '
    'as managed cloud services, lowering the cost of building secure apps for small teams.',
    '**Push notifications:** services that deliver alerts through Apple and Google notification systems, '
    'used here for event changes and reminders.',
    '**Over-the-air updates:** delivering JavaScript fixes to installed apps without a new store release.',
    '**Collaborative interface design:** Figma prototypes let teams test screen flows before building them.',
])
lead('2.4 Synthesis and Research Gap.',
     'Existing platforms show that people do use digital tools to find events, but general social media '
     'buries local events among unrelated posts, event platforms target ticketed or interest-based '
     'gatherings, and none centers on verified local organizations with clear change notices. Community '
     'Connect fills this gap with a single, mobile-first, community-specific list of events posted only by '
     'verified organizers, with saving, RSVP and clearly marked cancellations and postponements.')
para('The related studies agree on three points. First, one organizer-fed channel reaches people better than '
     'posters, notice boards and social media (Md Sharif, 2020; ALFarsi et al., 2018; Evangelista et al., 2026). '
     'Second, notifications and location make information timely and relevant (Ganoe et al., 2010; Rivas, 2026; '
     'Intal et al., 2026). Third, local systems are commonly evaluated with ISO/IEC 25010 and the System '
     'Usability Scale (Chico et al., 2026; Jaictin et al., 2025). Most local systems, however, serve one barangay '
     'office or one SK council, and most foreign ones serve a single campus. None combines verified posts from '
     'many kinds of organizations across a whole province, a map of each resident\'s events and administrator '
     'moderation, which is the gap Community Connect addresses for Biliran.', align='justify')

# Chapter 3 -----------------------------------------------------------------
page_break()
h3('Chapter 3: Methodology')
lead('3.1 Research Design.',
     'The study uses a **descriptive-developmental** design. It is developmental because it produces a '
     'working application through design and iterative building, and descriptive because it describes the '
     'current situation and the respondents\' evaluation of the application using survey data.')
lead('3.2 Software Development Model.',
     'The team follows an **Agile, prototype-driven** model: short iterations that each produce a working '
     'version, reviewed and refined before the next. The phases so far are shown below.')
table(['Phase', 'Activities', 'Dates'], [
    ['Planning and requirements', 'Problem analysis, personas, project proposal, draft data model',
     'Until Sept 30, 2026'],
    ['Iteration 1: core screens', 'Expo project, Browse, Saved, Profile, Event details, search, filters, '
                                  'save, RSVP (mock data)', 'Oct 2, 2026'],
    ['Iteration 2: refinements', 'Day/night mode, bug fixes', 'Oct 5, 2026'],
    ['Design', 'Wireframes, hi-fi prototype, user flow, design system (Figma)', 'Oct 13, 2026'],
    ['Maintenance', 'Upgrade to Expo SDK 58', 'Nov 10, 2026'],
    ['Iteration 3: organizers and alerts', 'Organizer tools, demo accounts, in-app alerts', 'Nov 21, 2026'],
    ['Iteration 4: accounts and map', 'Sign-in, Profile & Settings, organizer applications, Biliran map, '
                                      'event photos', 'Nov 22, 2026'],
    ['Iteration 5: administration', 'Admin console, photo cropping, Android fixes, code guide', 'Nov 22, 2026'],
    ['Device testing', 'Android phone through Expo Go; crash and layout fixes', 'Nov 22, 2026'],
    ['Iteration 6: backend', 'Supabase accounts, persistent data, push notifications', 'No fixed time'],
    ['User evaluation', 'ISO/IEC 25010 survey and SUS with respondents', 'No fixed time'],
], [1.7, 3.3, 1.5], cap='Development phases')
lead('3.3 Respondents and Sampling.',
     'The planned respondents are at least 30 residents aged 18–20 from barangays of Biliran, at least 5 '
     'community organizers (e.g., SK, school and volunteer groups) and at least 5 IT practitioners or faculty. '
     'They will be chosen through purposive sampling: residents must match the target users, and organizers '
     'must currently announce events. System testing (Part 4.2) was done by the developer.')
lead('3.4 Data Gathering Instruments and Procedures.', '')
numbered([
    'Short interviews with organizers about how they currently announce events and handle changes.',
    'A survey questionnaire (Appendix B) with ISO/IEC 25010 items on a 5-point Likert scale and the ten SUS items.',
    'Respondents use the application on a phone following a task list for their role (residents: find, filter, '
    'open, save, RSVP and check the map; organizers: apply, create and update an event; IT experts: all roles '
    'including the admin console).',
    'Respondents answer the questionnaire right after the session; answers are encoded and tallied.',
    'Test cases and bug logs (Software Documentation, Section 8) document technical testing.',
])
lead('3.5 System Requirements Summary.', '')
table(['Type', 'Requirement'], [
    ['Hardware (development)', 'Laptop/desktop with 8 GB RAM or more; Android phone (and iPhone if available)'],
    ['Hardware (users)', 'Android or iOS smartphone with internet access'],
    ['Software', 'Node.js LTS, Git, Visual Studio Code, Expo Go (SDK 58), Figma; Supabase (planned)'],
    ['Personnel', 'Developer(s), UI/UX designer, tester/QA, documentation; see the Software Documentation, Section 1'],
], [1.8, 4.7], cap='System requirements summary')
lead('3.6 Evaluation Tools.',
     'The application is evaluated on five ISO/IEC 25010 characteristics: functional suitability, usability, '
     'performance efficiency, reliability and security. Each item is rated on the 5-point scale below. '
     'Usability is also measured with the System Usability Scale (Brooke, 1996).')
table(['Scale', 'Mean range', 'Verbal interpretation'], [
    ['5', '4.21 – 5.00', 'Strongly Agree (Excellent)'],
    ['4', '3.41 – 4.20', 'Agree (Very Good)'],
    ['3', '2.61 – 3.40', 'Neutral (Good)'],
    ['2', '1.81 – 2.60', 'Disagree (Fair)'],
    ['1', '1.00 – 1.80', 'Strongly Disagree (Poor)'],
], [1.0, 1.8, 3.7], cap='Likert scale and interpretation')
lead('3.7 Statistical Treatment.', '')
bullets([
    '**Weighted mean:** x̄ = Σ(f × w) / N, where f is the number of respondents choosing a rating, w the '
    'rating (1–5) and N the number of respondents; used for every item and characteristic.',
    '**Percentage:** P = (f / N) × 100, for respondent profile data.',
    '**SUS score:** for odd items subtract 1 from the rating; for even items subtract the rating from 5; '
    'add the ten results and multiply by 2.5 (range 0–100). A score above 68 is above average (Sauro, 2011).',
])
lead('3.8 Ethical Considerations.',
     'Participation is voluntary, and respondents sign an informed consent form (Appendix A) explaining the '
     'purpose, what they will do and that they may stop at any time. Responses are anonymous and used only for '
     'this study. Any personal data is handled according to the Data Privacy Act of 2012 (Republic Act No. '
     '10173) and deleted after the study. Respondents who are minors are not included.')

# Chapter 4 -----------------------------------------------------------------
page_break()
h3('Chapter 4: Results and Discussion')
lead('4.1 Presentation of the Developed System.',
     'The current version of Community Connect covers all three roles on sample data. **Residents** sign in, get '
     'recommendations, search and filter events, open detailed event pages with photos, save and RSVP, see their '
     'events on a map of Biliran and receive in-app alerts. **Verified organizers** apply with documents and, once '
     'approved, publish, update, postpone or cancel events and post announcements. **Administrators** use a '
     'separate console to approve organizers, handle reports, verify organizations and manage users. Only '
     'permanent storage and push notifications wait for the backend.')
screens([('s01-browse.png', 'Event list'), ('s18-details-photos.png', 'Event details'),
         ('s17-new-event.png', 'Organizer: new event')])
screens([('s07-profile.png', 'Profile'), ('s19-admin-dashboard.png', 'Admin dashboard'),
         ('s20-admin-users.png', 'User management')])
lead('4.2 System Testing Results.',
     'The application was tested against its functional requirements before any user evaluation. Fourteen '
     'test cases covered every role and main feature (sign-in, search and filters, event details, save and '
     'RSVP, cancelled events, the map, photo cropping, the organizer workflow, admin moderation, phone layout, '
     'device testing and code quality). The results are summarized below; the full test cases and bug log are '
     'in the Software Documentation, Section 8.')
table(['Test area', 'What was checked', 'Result'], [
    ['Functional test cases', '14 test cases for residents, organizers and administrators', '14 of 14 passed'],
    ['Defects', 'Bugs found during development and testing', '10 found, 10 fixed'],
    ['Phone layout', 'All 32 screens at 360 px wide (automated)', 'No screen runs past the edge'],
    ['Android device', 'Full app in Expo Go, including map pins and photo pickers', 'Runs; 2 Android-only bugs fixed'],
    ['Code quality', 'TypeScript type check and ESLint', 'No errors'],
], [1.7, 3.1, 1.7], cap='Summary of system testing results')
figure('map-phone.jpg', 'Device test: the Map tab on an Android phone', max_h=4.6)
lead('4.3 User Evaluation (Next Step).',
     'The evaluation with respondents has not been conducted yet. It will use the questionnaire in Appendix B: '
     'ISO/IEC 25010 items on a 5-point scale (functional suitability, usability, performance efficiency, '
     'reliability and security) and the ten System Usability Scale items. Results will be summarized as '
     'weighted means with the interpretation in Chapter 3, and as SUS scores compared with the benchmark of 68 '
     '(Sauro, 2011).')
table(['Characteristic', 'Instrument', 'Respondents', 'Status'], [
    ['Functional suitability, usability, performance efficiency, reliability, security', 'ISO/IEC 25010 '
     'questionnaire (Appendix B, Part 2)', 'Residents, organizers, IT experts', 'To be conducted'],
    ['Perceived usability', 'System Usability Scale (Appendix B, Part 3)', 'All respondents', 'To be conducted'],
], [2.4, 1.9, 1.3, 0.9], cap='Planned user evaluation', font_size=9)
lead('4.4 Discussion.',
     'The testing results show that the prototype delivers the features that the problem analysis called for: '
     'one list of events from verified organizers, search and filters, complete event details, saving and RSVP, '
     'alerts for changes, and a map of each resident\'s events. This matches what related studies found useful: '
     'organizer-fed event apps that replace posters and social-media posts (Md Sharif, 2020; ALFarsi et al., '
     '2018), notifications for changes (Rivas, 2026; Jaictin et al., 2025) and map-based views of community '
     'activities (Ganoe et al., 2010). Whether residents and organizers find it useful and easy to use (Davis, '
     '1989) will be answered by the user evaluation; similar local systems were evaluated with the same ISO/IEC '
     '25010 and SUS instruments (Chico et al., 2026; Jaictin et al., 2025).')
lead('4.5 Challenges Encountered.', '')
table(['Challenge', 'How it was handled'], [
    ['Backend not yet decided by the team', 'Built the interface on mock data behind one data-access module, so '
                                            'switching to Supabase changes only that file.'],
    ['Event times displayed wrongly on phones in other time zones', 'Formatted all times in Philippine time '
                                                                     '(Asia/Manila).'],
    ['Breaking changes when upgrading to Expo SDK 58', 'Followed the new React Native types and re-ran type checks, '
                                                       'lint and a full click-through.'],
    ['Flaky connections during npm install and Expo Go testing', 'Re-ran installs; used same Wi-Fi or tunnel mode.'],
    ['Bugs that appeared only on Android phones (an animation crash, squeezed buttons)', 'Tested on a real '
     'phone with Expo Go, fixed the cause and wrote the rules in the code guide.'],
    ['Layouts that did not fit small phones', 'Checked all 32 screens automatically at 360 px wide.'],
    ['Solo development while the team finalizes roles', 'Organized the code by purpose and wrote CODE_GUIDE.md '
                                                        'so members can find things and join quickly.'],
], [2.6, 3.9], cap='Challenges and solutions')

# Chapter 5 -----------------------------------------------------------------
page_break()
h3('Chapter 5: Summary, Conclusions and Recommendations')
lead('5.1 Summary of Findings.', '')
numbered([
    '**Current process:** event information is scattered across social-media pages, group chats, posters and '
    'word of mouth; residents miss events and updates, and organizers repeat posts across channels.',
    '**Proposed application:** Community Connect was developed with a centralized event list, search, filters and '
    'recommendations, complete event details with photos, saving, RSVP, a map of the resident\'s events, in-app '
    'alerts, verified-organizer publishing and an admin console for verification and moderation.',
    '**Testing:** all 14 functional test cases passed after 10 defects were fixed; all screens fit a 360-pixel '
    'phone screen; and the app runs on an Android phone. The user evaluation (ISO/IEC 25010 and SUS) is the '
    'next step.',
])
lead('5.2 Conclusions.',
     'A single mobile application can present community events in a consistent, searchable form that addresses '
     'the scattered-information problem identified in this study. The prototype meets its functional '
     'requirements for all three roles, so it is ready for evaluation by residents, organizers and IT experts. '
     'Its acceptance by users can only be concluded after that evaluation.')
lead('5.3 Recommendations.', '')
bullets([
    '**For users and organizers:** pilot the app with a few SK councils and school organizations first, and '
    'agree on who verifies organizations.',
    '**For the organization / LGU:** use the app as an official channel for public programs and urgent updates.',
    '**For future developers:** connect the Supabase backend and push notifications; let organizers drop a map '
    'pin for the venue and manage members; add multi-day events and local-language support; measure performance '
    'on low-end phones.',
    '**For the researchers:** conduct the user evaluation with the questionnaire in Appendix B before '
    'deployment, then revise the app based on the results.',
    '**For future researchers:** study long-term use and whether the app increases event attendance.',
])

# References ------------------------------------------------------------------
page_break()
h3('References')
refs = [
    'Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. '
    '~~International Journal of Human–Computer Interaction, 24~~(6), 574–594. '
    'https://doi.org/10.1080/10447310802205776',
    'Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, '
    '& I. L. McClelland (Eds.), ~~Usability evaluation in industry~~ (pp. 189–194). Taylor & Francis.',
    'Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information '
    'technology. ~~MIS Quarterly, 13~~(3), 319–340. https://doi.org/10.2307/249008',
    'Expo. (n.d.). ~~Expo documentation~~. Retrieved November 22, 2026, from https://docs.expo.dev',
    'International Organization for Standardization. (2011). ~~Systems and software engineering — Systems and '
    'software Quality Requirements and Evaluation (SQuaRE) — System and software quality models~~ '
    '(ISO/IEC Standard No. 25010:2011).',
    'Meta Platforms. (n.d.). ~~React Native documentation~~. Retrieved November 19, 2026, from https://reactnative.dev',
    'Nielsen, J. (1994). Enhancing the explanatory power of usability heuristics. In ~~Proceedings of the SIGCHI '
    'Conference on Human Factors in Computing Systems~~ (pp. 152–158). ACM. https://doi.org/10.1145/191666.191729',
    'Republic Act No. 10173. (2012). ~~Data Privacy Act of 2012~~. Official Gazette of the Republic of the Philippines.',
    'Sauro, J. (2011). ~~A practical guide to the System Usability Scale: Background, benchmarks & best practices~~. '
    'Measuring Usability LLC.',
    'Supabase. (n.d.). ~~Supabase documentation~~. Retrieved November 19, 2026, from https://supabase.com/docs',
]
refs += [
    'ALFarsi, G. M., Jabbar, J., & Alsinani, M. (2018). Implementing a mobile application news tool for '
    'disseminating messages and events of AlBuraimi University College. ~~International Journal of Interactive '
    'Mobile Technologies (iJIM), 12~~(7), 129. https://doi.org/10.3991/ijim.v12i7.9484',
    'Bringula, R. P., et al. (2019). Towards the development of e-barangay mobile application. ACM. '
    'https://doi.org/10.1145/3306500.3313979',
    'Chico, A., et al. (2026). SK WebbyApp: Community organizer within Angeles City. ~~PUNLA, 7~~. '
    'https://doi.org/10.67730/d4b0eq61',
    'Chong, K. H., et al. (2024). Bridging physical and virtual community through O2O approach. In ~~Data-driven '
    'smart community design~~ (pp. 276–292). Routledge. https://doi.org/10.4324/9781003437659-13',
    'Cristobal, I. A. A., et al. (2018). Pasigueño Assistant: An e-participation mobile application framework for '
    'the City of Pasig, Philippines. In ~~TENCON 2018 – IEEE Region 10 Conference~~. IEEE. '
    'https://doi.org/10.1109/tencon.2018.8650177',
    'Evangelista, E., et al. (2026). User-centered design of hyperlocal communication platforms: Insights from the '
    'design and evaluation of KUBO. In ~~Proceedings of the 2025 International Conference on Human-Engaged '
    'Computing~~. ACM. https://doi.org/10.1145/3786995.3787016',
    'Ganoe, C. H., et al. (2010). Mobile awareness and participation in community-oriented activities. ACM. '
    'https://doi.org/10.1145/1823854.1823868',
    'Intal, G. L. D., et al. (2026). Development of strategies and business model canvas for Barangay Connect: A '
    'website and mobile application for an e-barangay system. ACM. https://doi.org/10.1145/3796315.3796346',
    'Jaictin, J. F., et al. (2025). Mobile community app: Developing barangay management systems. '
    '~~Proceedings of International Exchange and Innovation Conference on Engineering & Sciences (IEICES), 11~~, '
    '1316–1321. https://doi.org/10.5109/7395681',
    'Khalil, M. A., & Tagalog, H. C. (2026). Univibe: A mobile application for event management, student '
    'engagement and collaborations across universities in Oman. ~~International Journal of Management & '
    'Entrepreneurship Research, 8~~(1), 98–114. https://doi.org/10.51594/ijmer.v8i1.2181',
    'Md Sharif, M. I. (2020). ~~Developing mobile application for event information dissemination (Campus Shout '
    'Out)~~. Universiti Teknologi MARA Perlis. https://openalex.org/W3045043938',
    'Rivas, R. (2026). Barangay information management system with automated mobile messaging for improved '
    'community engagement. ~~International Journal for Sciences and Technology~~. '
    'https://doi.org/10.71097/ijsat.v17.i1.10412',
    'Turdiyev, T., Al-Khwarizmi, M., & Omonbayev, J. (2025). Development of a mobile application for covering '
    'local events and incidents. https://doi.org/10.24412/cl-37444-2025-2-52-57',
]
refs.sort(key=lambda r: r.lower())
for r in refs:
    p = para(r)
    pf = p.paragraph_format
    pf.left_indent = Inches(0.5)
    pf.first_line_indent = Inches(-0.5)

# Appendices -------------------------------------------------------------------
page_break()
h3('Appendices')
table(['Appendix', 'Content'], [
    ['A', 'Informed consent form'],
    ['B', 'Survey questionnaire'],
    ['C', 'Raw data and computations'],
    ['D', 'Sample system screenshots'],
    ['E', 'Project timeline'],
    ['F', 'Curriculum vitae of researchers'],
], [1.2, 5.3])

h4('Appendix A: Informed Consent Form')
para('**Title of study:** Community Connect: A Community Events and Announcement Application')
para('**Researchers:** BSCS-3C Group 7, ' + PH('school name'))
para('You are invited to try the Community Connect mobile application and answer a short questionnaire. The '
     'session takes about 20 minutes. You will perform simple tasks (find an event, filter, open details, save '
     'and RSVP) and then rate the application. There are no known risks. Participation is voluntary; you may '
     'skip any question or stop at any time. Your answers are anonymous, used only for this study, and handled '
     'according to the Data Privacy Act of 2012 (RA 10173).', align='justify')
para('I have read and understood the information above and agree to take part.')
para('Name and signature: ____________________________     Date: ______________')

h4('Appendix B: Survey Questionnaire')
para('**Part 1. Respondent profile:** Age ___  Barangay ________  Respondent type: ☐ Resident  ☐ Organizer  '
     '☐ IT expert')
para('**Part 2. Software quality (ISO/IEC 25010).** 5 = Strongly Agree, 4 = Agree, 3 = Neutral, '
     '2 = Disagree, 1 = Strongly Disagree.')
q = [
    ('Functional suitability', ['The app lists the community events I need in one place.',
                                'Search and filters help me find the events I want.',
                                'Event pages show complete details (date, time, venue, organizer, how to join).',
                                'Saving and RSVP work as expected.',
                                'The map shows where my events are.',
                                'I am alerted when an event I follow changes.']),
    ('Usability', ['The app is easy to learn.', 'The screens are clear and easy to read.',
                   'I can tell easily when an event is cancelled or postponed.']),
    ('Performance efficiency', ['Screens open quickly.', 'Scrolling the event list is smooth.']),
    ('Reliability', ['The app works without crashing or errors.', 'Information stays correct after changes.']),
    ('Security', ['Only verified organizers can post events.', 'I trust the app with my personal information.']),
]
rows = []
n = 1
for cat, items in q:
    rows.append([f'**{cat}**', '', '', '', '', ''])
    for it in items:
        rows.append([f'{n}. {it}', '', '', '', '', ''])
        n += 1
table(['Statement', '5', '4', '3', '2', '1'], rows, [4.5, 0.4, 0.4, 0.4, 0.4, 0.4],
      cap='Questionnaire: software quality', font_size=9)
para('**Part 3. System Usability Scale (Brooke, 1996).** 1 = Strongly Disagree … 5 = Strongly Agree.')
sus = ['I think that I would like to use this system frequently.',
       'I found the system unnecessarily complex.',
       'I thought the system was easy to use.',
       'I think that I would need the support of a technical person to be able to use this system.',
       'I found the various functions in this system were well integrated.',
       'I thought there was too much inconsistency in this system.',
       'I would imagine that most people would learn to use this system very quickly.',
       'I found the system very cumbersome to use.',
       'I felt very confident using the system.',
       'I needed to learn a lot of things before I could get going with this system.']
table(['Statement', '1', '2', '3', '4', '5'], [[f'{i + 1}. {s}', '', '', '', '', ''] for i, s in enumerate(sus)],
      [4.5, 0.4, 0.4, 0.4, 0.4, 0.4], cap='Questionnaire: System Usability Scale', font_size=9)
para('**Part 4. Comments and suggestions:** ______________________________________________')

h4('Appendix C: Raw Data and Computations')
para('To be added after the user evaluation: the tally of responses per item and the weighted-mean and SUS '
     'computations.')

h4('Appendix D: Sample System Screenshots')
para('More screenshots are in the Software Documentation, Section 7 (User Manual), and Chapter 4.')
screens([('s24-interests.png', 'My Interests'), ('s13-edit-profile.png', 'Edit Profile'),
         ('s25-admin-reports.png', 'Reported events (admin)')])
figure('s22-admin-dashboard-wide.png', 'Admin dashboard on a tablet or wide screen', max_h=4.0)

h4('Appendix E: Project Timeline')
table(['Milestone', 'Target date', 'Status'], [
    ['Project proposal submitted', 'Sept 30, 2026', 'Done'],
    ['Core resident screens (mock data)', 'Oct 2, 2026', 'Done'],
    ['Day/night mode', 'Oct 5, 2026', 'Done'],
    ['Figma wireframes and hi-fi prototype', 'Oct 13, 2026', 'Done'],
    ['Upgrade to Expo SDK 58', 'Nov 10, 2026', 'Done'],
    ['Organizer tools and in-app alerts', 'Nov 21, 2026', 'Done'],
    ['Sign-in, settings, organizer applications, map, photos', 'Nov 22, 2026', 'Done'],
    ['Admin console', 'Nov 22, 2026', 'Done'],
    ['Device testing on Android', 'Nov 22, 2026', 'Done'],
    ['Documentation and presentation', 'Nov 23, 2026', 'Done'],
    ['User evaluation (ISO/IEC 25010, SUS)', 'No fixed time', 'Planned'],
    ['Team decision on backend; Supabase setup', 'No fixed time', 'Pending'],
    ['Push notifications', 'No fixed time', 'Planned'],
], [3.2, 1.6, 1.7], cap='Project timeline')

h4('Appendix F: Curriculum Vitae of Researchers')
for name in ['Salundaguit, Henjiel A.', 'Ucag, Jennifer N.', 'Monsales, Justin Dave', 'Bohol, Philip',
             'Doloeras, Patricia', 'Pedida, Toroi']:
    para(f'**{name}**: ' + PH('contact, education, skills, photo'))

doc.save(OUT)
print('figures', counters['Figure'], 'tables', counters['Table'])
