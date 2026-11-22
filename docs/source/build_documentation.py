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
h1('Community Connect: Software and Paper Documentation')
para('Application Development and Emerging Technologies · BSCS-3C · Group 7')
para('**Part I** documents the software itself (for developers, testers and users). '
     '**Part II** is the academic paper (for instructors and panelists). Text '
     'highlighted in yellow and [in brackets] still has to be filled in by the team, '
     'mostly data from the evaluation that has not been conducted yet.', italic=False)

# ---------------------------------------------------------------------------
h2('Part I: Software Documentation')
# ---------------------------------------------------------------------------
h3('1. Project Information')
table(['Field', 'Details'], [
    ['Project title', 'Community Connect: A Community Events and Announcement Application'],
    ['Version', '0.9.0 (functional prototype: resident, organizer and administrator features running on '
                'mock data; backend pending team approval)'],
    ['Team members and roles', [
        'Monsales, Justin Dave: Lead developer (mobile app, UI/UX, repository)',
        'Salundaguit, Henjiel A.: ' + PH('role'),
        'Ucag, Jennifer N.: ' + PH('role'),
        'Bohol, Philip: ' + PH('role'),
        'Doloeras, Patricia: ' + PH('role'),
        'Pedida, Toroi: ' + PH('role'),
    ]],
    ['Course / Section', 'Application Development and Emerging Technologies, BSCS-3C'],
    ['Instructor', 'Mary Angel Palma'],
    ['Repository link', 'https://github.com/Abylon10/COM_NECT'],
    ['Live demo link', 'Not deployed yet. The app runs on phones through Expo Go during '
                       'development (see Section 6). ' + PH('Add an EAS build link once available')],
    ['Date', 'November 22, 2026'],
], [2.0, 4.5])

h3('2. Overview')
lead('2.1 Purpose.',
     'Community Connect is a mobile application that gathers local community events and '
     'announcements across Biliran in one place. Today, residents learn about activities through scattered '
     'Facebook pages, group chats, posters and word of mouth, so details are missed, outdated or '
     'hard to confirm. In Community Connect, only **verified organizers** post events. Residents '
     'browse, search and filter them, open a clear event page (date, time, venue, organizer, photos, '
     'description and how to join), save events, say whether they are going, see their events on a map '
     'of Biliran, and receive alerts when an organizer changes or cancels an event. **Administrators** '
     'decide who becomes a verified organizer and handle reported events.')
lead('2.2 Target users.',
     'The primary users are young adults aged 18–20 looking for youth, educational, sports, '
     'cultural and volunteer activities (personas: Ashley, 18, and Ronald, 20, from the proposal). '
     'They need a quick, reliable list of upcoming activities and timely updates. The second user '
     'type is the **verified organizer**: SK and barangay officials, school and youth-group '
     'coordinators, non-profits and volunteers, who need one place to publish and update events '
     'that residents trust. The third is the **administrator** (the team for the demo), who reviews '
     'organizer applications, reports and accounts.')
lead('2.3 Key features.', '')
bullets([
    '**Accounts:** sign up, sign in (with a separate administrator sign-in), profile with photo, interests, '
    'notification settings, password change, deactivate or delete account.',
    '**Browse:** "Recommended for you" based on interests, search, category chips, and filters by date '
    'range, location and organizer.',
    '**Event details:** time, venue, photos, description, how to join, verified organizer, '
    '"Open in Google Maps", and a report button.',
    '**Save and RSVP** (Interested / Going), listed in the Saved tab and as pins on the **Map tab** of Biliran.',
    '**Alerts:** in-app notifications for event changes, cancellations, reminders the day before, organizer '
    'announcements, new events and application results.',
    '**Organizer tools:** apply to become an organizer with documents; once approved, create, edit, '
    'postpone or cancel events with up to six photos, post announcements, and see going/interested/saved counts.',
    '**Admin console:** dashboard, organizer request review, reported events, organization verification, '
    'user management (search, filter, suspend) and feedback inbox, with a sidebar layout on tablets and a '
    'slide-out menu on phones.',
    '**Polish:** day/night mode, in-app photo cropping, and a loading animation of two people high-fiving.',
])
lead('2.4 Emerging technologies used.', '')
bullets([
    '**Cross-platform mobile development (Expo SDK 58 / React Native 0.88):** one TypeScript '
    'codebase produces native Android and iOS apps, and Expo Go allows testing on real phones '
    'without building native projects.',
    '**Native maps and location (react-native-maps):** Google Maps on Android and Apple Maps on iOS show '
    'each resident\'s events across the island.',
    '**On-device image processing (expo-image-manipulator):** photos are cropped and resized on the phone '
    'before upload, saving data and storage.',
    '**Cloud backend-as-a-service (Supabase, proposed):** managed PostgreSQL, authentication, file '
    'storage and row-level security fit the resident / organizer / administrator permission split '
    'without running our own server. Adoption is pending team approval.',
    '**Push notifications (expo-notifications, proposed):** to deliver the in-app alerts even when the app '
    'is closed.',
    '**Design-to-code prototyping (Figma):** wireframes and a high-fidelity prototype generated from '
    'the app\'s own theme.',
])

h3('3. Requirements')
para('**3.1 Functional requirements**')
table(['ID', 'Requirement', 'Priority', 'Status'], [
    ['FR-01', 'The system shall list upcoming community events sorted by date.', 'High', 'Done'],
    ['FR-02', 'The system shall search events by title, organizer, venue and location.', 'High', 'Done'],
    ['FR-03', 'The system shall filter events by category, date range, location and organizer.', 'High', 'Done'],
    ['FR-04', 'The system shall show each event\'s title, date, time, venue, organizer, photos, description '
              'and registration instructions.', 'High', 'Done'],
    ['FR-05', 'The system shall let a resident save (bookmark) an event and list saved events.', 'High', 'Done'],
    ['FR-06', 'The system shall let a resident respond Going or Interested and show response counts.',
     'High', 'Done'],
    ['FR-07', 'The system shall mark cancelled or postponed events, show the organizer\'s note and '
              'disable RSVP for cancelled events.', 'Med', 'Done'],
    ['FR-08', 'The system shall let users sign up and sign in, and keep administrators on a separate '
              'sign-in.', 'High', 'Done (mock accounts)'],
    ['FR-09', 'The system shall let residents apply to become organizers with supporting documents.',
     'High', 'Done'],
    ['FR-10', 'The system shall let members of verified organizations create, edit, postpone and cancel '
              'their organization\'s events and post announcements.', 'High', 'Done'],
    ['FR-11', 'The system shall alert residents who saved or responded when an event changes, and remind '
              'them the day before events they are going to.', 'Med', 'Done (in-app); push planned'],
    ['FR-12', 'The system shall show the user\'s Going and Interested events on a map of Biliran.', 'Med', 'Done'],
    ['FR-13', 'The system shall let administrators approve organizers, handle reports, verify organizations '
              'and suspend users.', 'High', 'Done'],
    ['FR-14', 'The system shall recommend events based on the user\'s interests.', 'Low', 'Done'],
    ['FR-15', 'The system shall keep data after the app is closed.', 'High', 'Planned (backend)'],
    ['FR-16', 'The system shall offer light and dark appearance.', 'Low', 'Done'],
], [0.7, 3.6, 0.8, 1.4], cap='Functional requirements and their status', font_size=9)

para('**3.2 Non-functional requirements**')
table(['ID', 'Category', 'Requirement'], [
    ['NFR-01', 'Performance', 'The event list scrolls smoothly and an event page opens in under 1 second '
                              'on a mid-range Android phone. ' + PH('Measure during device testing')],
    ['NFR-02', 'Security', 'Only members of verified organizations can create or edit events, and only '
                           'administrators can use the admin console. These checks run in the data layer '
                           '(and in the database with row-level security once connected), not only by hiding '
                           'buttons. A wrong-role sign-in gets the same message as a wrong password.'],
    ['NFR-03', 'Usability', 'Mobile-first layout checked at 360 px wide (a common Android width); key '
                            'information visible without opening menus; readable in light and dark mode.'],
    ['NFR-04', 'Availability', 'The backend runs on managed cloud hosting, targeting at least 99% uptime '
                               'during the evaluation period.'],
    ['NFR-05', 'Maintainability', 'All data access lives in src/data; code is grouped by purpose and explained '
                                  'in CODE_GUIDE.md; TypeScript strict mode and ESLint must pass before merging.'],
    ['NFR-06', 'Compatibility', 'Runs on current Android and iOS versions supported by Expo SDK 58.'],
    ['NFR-07', 'Accuracy', 'Event dates and times are always shown in Philippine time (Asia/Manila).'],
    ['NFR-08', 'Privacy', 'Collects only the personal data needed (name, email, contact number, barangay) in '
                          'line with the Data Privacy Act of 2012 (RA 10173); users can delete their account.'],
], [0.8, 1.3, 4.4], cap='Non-functional requirements', font_size=9)

lead('3.3 Use cases / user stories.', '')
bullets([
    'As a **resident**, I want to see upcoming events in one list so that I don\'t have to check '
    'several pages and group chats.',
    'As a **resident**, I want to filter by category and date and get recommendations so that I quickly find '
    'activities I like.',
    'As a **resident**, I want to see my events on a map so that I know where they are around the island.',
    'As a **resident**, I want to be alerted when an event I saved changes so that I don\'t go to a '
    'cancelled or moved event.',
    'As a **verified organizer**, I want to post and update my organization\'s events in one place so '
    'that residents get accurate information without me reposting in many channels.',
    'As an **administrator**, I want to review organizer applications and reported events so that only '
    'trusted groups post and misleading posts are removed.',
])
figure('usecase.png', 'Use case diagram', max_h=6.6)

h3('4. System Architecture and Design')
lead('4.1 Architecture overview.',
     'Community Connect uses a **client–server (backend-as-a-service)** architecture. The mobile app has '
     'three layers: **screens** (Expo Router file-based routes), **hooks** that load data for a screen and '
     'reload it whenever data changes, and the **data access layer** (src/data), which holds every read, '
     'write and permission check. Screens never know where data comes from. In the current prototype the '
     'data layer uses mock tables held in memory. Once the team approves the backend, the same functions will '
     'call Supabase (PostgreSQL, authentication, storage and row-level security), so the screens do not change. '
     'The root layout shows exactly one area at a time: sign-in screens, the resident/organizer app, or the '
     'admin console.')
figure('architecture.png', 'System architecture (solid lines: current; dashed lines: planned)', max_h=6.0)

para('**4.2 Technology stack**')
table(['Layer', 'Technology', 'Version', 'Reason for choice'], [
    ['Frontend', 'Expo + React Native, Expo Router, TypeScript', 'SDK 58.0.23, RN 0.88.1, '
                 'Router 58.0.30, TS 6.0.3',
     'One codebase for Android and iOS; test on real phones with Expo Go; file-based navigation.'],
    ['UI and device', 'Reanimated, expo-image, expo-symbols, react-native-maps, expo-image-picker, '
                      'expo-image-manipulator, expo-document-picker, AsyncStorage',
     '4.7.1, 58.0.18, 58.0.4, 1.29.11, 58.0.10, 58.0.16, 58.0.4, 2.2.0',
     'Animations, native icons, maps, photo picking and cropping, documents, saved settings.'],
    ['Backend', 'Supabase (proposed)', PH('version'), 'Managed auth, database, storage and access rules; '
                'free tier suits a class project. Pending team approval.'],
    ['Database', 'PostgreSQL via Supabase (proposed)', PH('version'), 'Relational model fits events, '
                 'organizations, members, saves, RSVPs, applications and reports.'],
    ['Hosting / Cloud', 'Supabase cloud; EAS Build / EAS Update', PH('region/plan'),
     'No server to maintain; installable builds and over-the-air updates for testers.'],
    ['Emerging tech / APIs', 'expo-notifications (proposed)', '—', 'Push alerts when saved events change.'],
    ['Design', 'Figma (SVG import)', '—', 'Wireframes and high-fidelity prototype.'],
    ['Tooling', 'ESLint (eslint-config-expo), Git/GitHub, Playwright', '9.39, 58.0.4', 'Code quality, '
                'version control and automated screen tests.'],
], [1.1, 1.9, 1.4, 2.1], cap='Technology stack', font_size=8.5)

lead('4.3 Database design.',
     'The database extends the team\'s draft model from the proposal. The prototype\'s mock tables '
     '(src/data/db.ts) already follow it, so moving to Supabase is a one-to-one mapping.')
figure('erd.png', 'Entity-relationship diagram', max_h=4.0)
table(['Table', 'Main fields', 'Description'], [
    ['profiles', 'id, display_name, email, phone, municipality, barangay, avatar_url, role, status, joined_at',
     'Account; role is resident, organizer or admin; status active, deactivated or suspended'],
    ['organizations', 'id, name, description, contact_info, is_verified', 'Only verified organizations can publish'],
    ['organization_members', 'user_id, organization_id, member_role', 'Who manages which organization (admin/editor)'],
    ['events', 'id, organization_id, title, description, category, start_at, end_at, venue, location, '
               'latitude, longitude, photos, registration_info, status, status_note, updated_at',
     'Category: youth, educational, sports, cultural, volunteer; status: scheduled, cancelled, postponed'],
    ['saves', 'user_id, event_id', 'Bookmarks'],
    ['rsvps', 'user_id, event_id, response', 'going or interested'],
    ['organizer_applications', 'id, user_id, organization_name, organization_type, description, contacts, '
                               'documents, status, admin_note', 'pending, approved, rejected or requires_revision'],
    ['event_reports', 'id, user_id, event_id, reason, details, status', 'open, dismissed or removed'],
    ['notifications', 'id, user_id, event_id, kind, title, body, read', 'In-app alerts (push later)'],
    ['feedback', 'id, user_id, kind, message', 'Problem, suggestion or question from Help & Feedback'],
], [1.5, 2.8, 2.2], cap='Data dictionary', font_size=8.5)

lead('4.4 UI/UX design.',
     'The interface is mobile-first with a teal brand color taken from the Community Connect logo, '
     'pill-shaped filter chips, rounded event cards and paired outline/filled buttons. The admin console '
     'follows a dashboard reference: a sidebar with counts, data tables with checkboxes, a ⋮ menu per row '
     'and pagination; on phones the sidebar becomes a slide-out menu and rows stack. Wireframes and a '
     'high-fidelity prototype are in the repository under design/figma/. ' + PH('Add the Figma share link'))
figure('wireframes-board.png', 'Wireframes (design/figma/wireframes)', max_h=7.0)
figure('hifi-board.png', 'High-fidelity screens, light and dark (design/figma/hifi)', max_h=7.0)
figure('design-system.png', 'Design system: colors, type and components', max_h=5.0)

lead('4.5 Diagrams.', '')
figure('dfd.png', 'Data flow diagram, level 1', max_h=6.0)
figure('sequence.png', 'Sequence diagram: resident responds "Going"')
figure('flow.png', 'Flowchart: finding and saving an event', max_h=6.8)

h3('5. API Documentation')
para('Community Connect has no custom REST server. All data goes through the functions in src/data, which '
     'act as the app\'s internal API. They return mock data now and will call Supabase once the backend is '
     'approved; their names and return types will stay the same. Functions that change data check '
     'permissions and throw PermissionError or ValidationError.')
table(['Module', 'Main functions', 'Used by'], [
    ['events.ts', 'getEvents(filters), getEvent(id), getRecommendedEvents(), getMyMapEvents(), getEventHistory(), '
                  'setEventSaved(id), setRsvp(id, response), createEvent(input), updateEvent(id, update), '
                  'postAnnouncement(id, text), reportEvent(id, reason)', 'Browse, details, Saved, Map, Organizer Tools'],
    ['account.ts', 'signIn(email, password, mode), signUp(...), signOut(), updateProfile(...), changePassword(...), '
                   'deactivateAccount(), deleteAccount(password), submitOrganizerApplication(input), '
                   'getMyOrganizations(), submitFeedback(kind, message)', 'Sign in, Profile and Settings'],
    ['admin.ts', 'getAdminStats(), getApplications(), reviewApplication(id, status, note), getReportGroups(), '
                 'dismissReports(id), removeReportedEvent(id, reason), setOrganizationVerified(id, value), '
                 'getUsers(query), setUserSuspended(id, value), getFeedback()', 'Admin console'],
    ['notifications.ts', 'getNotifications(), markNotificationsRead(), getNotificationSettings(), '
                         'updateNotificationSettings(...); deliver() applies each user\'s settings', 'Bell, settings'],
    ['interests.ts', 'getMyInterests(), setMyInterests(...), matchesInterests(event, interests)',
     'My Interests, Recommended'],
], [1.2, 3.8, 1.5], cap='Data-access modules (src/data)', font_size=8.5)
para('Example block for the planned backend call behind getEvents:')
table(['Item', 'Details'], [
    ['Endpoint', 'GET /rest/v1/events (Supabase REST, generated from the events table)'],
    ['Description', 'Lists events with their organization, filtered and ordered by start_at'],
    ['Authentication', 'Supabase anon key + user session token (Bearer); read access for everyone'],
    ['Request', 'select=*,organization:organizations(*)&category=eq.sports&order=start_at.asc'],
    ['Success response', '200 OK, JSON array of events with nested organization'],
    ['Error responses', '401 Unauthorized (bad key), 400 Bad Request (invalid filter)'],
], [1.6, 4.9], cap='Planned backend endpoint for listing events')

h3('6. Installation and Setup Guide')
lead('6.1 Prerequisites.', 'Node.js LTS (version 20 or newer) with npm, Git, a code editor (Visual '
     'Studio Code recommended), and an Android or iOS phone with the latest **Expo Go** app from the Play '
     'Store or App Store (it must support SDK 58). The phone and computer must be on the same Wi-Fi.')
para('**6.2 Installation steps**')
numbered([
    'Clone the repository: git clone https://github.com/Abylon10/COM_NECT.git',
    'Open the project folder: cd COM_NECT (the Expo project is at the repository root).',
    'Install dependencies: npm install (if it fails with ECONNRESET, run it again).',
    'Start the development server: npx expo start (add --clear after pulling big changes).',
    'Open Expo Go on the phone and scan the QR code (Android: Scan QR code in Expo Go; iPhone: Camera app).',
    'Sign in with a demo account (password community123): resident ashley@example.com, organizer '
    'carlo.sk@example.com, or administrator admin@example.com (tap the logo on Sign in first).',
    'Before committing: npx tsc --noEmit and npx expo lint. New developers should read CODE_GUIDE.md.',
])
para('On Windows, if PowerShell says "running scripts is disabled", run once: '
     'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser, then type Y.')
para('**6.3 Environment variables**')
para('The prototype needs no environment variables. These will be added with the Supabase backend:')
table(['Variable', 'Description', 'Example'], [
    ['EXPO_PUBLIC_SUPABASE_URL', 'Supabase project URL', 'https://xxxx.supabase.co'],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'Public anon key (safe in the app because row-level security protects '
                                      'the data)', 'Kept in .env, never committed'],
    ['Google Maps API key', 'Needed only for a production Android build (app.json)', 'Not needed in Expo Go'],
], [2.3, 2.6, 1.6], cap='Environment variables (planned)')

h3('7. User Manual')
para('Screenshots are from the current build (Expo SDK 58) shown at phone size.', italic=True)
lead('7.1 Getting started.', '')
numbered([
    'Open Community Connect. A short loading animation plays, then **Sign in** appears.',
    'Sign in, or tap **Create an account** to sign up as a resident.',
    'Use the tab bar to move between **Browse**, **Map**, **Saved** and **Profile**.',
])
screens([('s00-splash.png', 'Loading animation'), ('s09-signin.png', 'Sign in'),
         ('s10-admin-signin.png', 'Administrator sign-in')])
lead('7.2 Feature guides.', '')
h4('Find an event')
numbered([
    'Browse shows "Recommended for you" (from My Interests) and all upcoming events.',
    'Type in the search bar, tap a category chip, or tap the **filter** button to choose a date range, '
    'location and organizer, then **Show events**.',
])
screens([('s01-browse.png', 'Browse'), ('s02-search.png', 'Search'), ('s03-filters.png', 'Filters')])
h4('View, save and respond to an event')
numbered([
    'Tap an event card to open its details: photos, date, time, venue, description, how to join and the '
    'verified organizer. **Open in Google Maps** gives directions.',
    'Tap the **bookmark** to save it, and **Interested** or **Going** to respond (tap again to remove).',
    'Cancelled and postponed events show a badge and the organizer\'s note. Tap ⚑ **Report** if a post looks '
    'wrong.',
])
screens([('s04-details.png', 'Event details'), ('s18-details-photos.png', 'Event with photos'),
         ('s05-cancelled.png', 'Cancelled event')])
h4('Map, saved events and notifications')
numbered([
    'The **Map** tab shows your upcoming Going (teal) and Interested (amber) events around Biliran. Tap a '
    'card below the map to jump to its pin.',
    'The **Saved** tab lists Saved, Going and Interested events.',
    'The **bell** at the top of Browse opens notifications about changes, reminders and announcements.',
])
figure('event-locations.png', 'Demo event locations across Biliran that appear as map pins (approximate)',
       max_h=4.6)
para(PH('Insert a phone screenshot of the Map tab from Expo Go here (the web preview cannot load map tiles)'))
screens([('s06-saved.png', 'Saved tab'), ('s12-notifications.png', 'Notifications')], width=2.2)
h4('Profile and settings')
numbered([
    'Open **Profile** to see your counts, choose **Appearance** (System, Day or Night), and open settings.',
    '**Edit Profile:** tap **Change photo**, then drag and pinch (or use − / +) to crop and tap **Done**.',
    '**My Interests**, **Notifications**, **Account & Security**, **My Event History**, **Privacy Policy** and '
    '**Help & Feedback** are in the same menu.',
])
screens([('s07-profile.png', 'Profile'), ('s14-cropper.png', 'Crop photo'), ('s08-night.png', 'Night mode')])
h4('Become an organizer and manage events')
numbered([
    'Profile → **Become an Organizer**: fill in the organization details, attach documents (e.g., barangay '
    'certification) and submit. The status shows Pending until an administrator reviews it.',
    'Once approved, Profile → **Organizer Tools** → **New event**. Add up to six photos (the first is the '
    'cover), details, date and time, then **Publish event**.',
    'Open your event to **Edit** (including postpone or cancel with a note) or **Announce** a message to '
    'everyone following it.',
])
screens([('s15-org-application.png', 'Organizer application'), ('s16-organizer-tools.png', 'Organizer Tools'),
         ('s17-new-event.png', 'New event with photos')])
h4('Administrator')
numbered([
    'On Sign in, tap the **logo** to switch to administrator sign-in, then sign in.',
    'The **Dashboard** shows counts and what needs review. Use the sidebar (☰ on phones) to open '
    'Organizer requests, Reported events, User management, Organizations, Feedback or Edit profile.',
    'In tables, use search, **Filters**, column sorting, checkboxes for bulk actions and the ⋮ menu on each row.',
])
screens([('s19-admin-dashboard.png', 'Admin dashboard'), ('s19b-admin-menu.png', 'Admin menu'),
         ('s21-admin-review.png', 'Review a request')])
figure('s23-admin-users-wide.png', 'User Management on a tablet or wide screen', max_h=4.0)
lead('7.3 Troubleshooting / FAQ.', '')
table(['Problem', 'Fix'], [
    ['Expo Go shows "Something went wrong"', 'Make sure the phone is on the same Wi-Fi as the computer, '
                                             'not mobile data. Or run npx expo start --tunnel.'],
    ['"Project is incompatible with this version of Expo Go"', 'Update Expo Go from the Play Store / App Store.'],
    ['Old screens or the app is stuck loading', 'Stop the server (Ctrl+C) and run npx expo start --clear.'],
    ['My changes disappeared', 'Expected in the prototype: all data resets when the app reloads until the '
                               'backend is connected.'],
    ['Administrator account says "Incorrect email or password"', 'Tap the logo on Sign in first to switch to '
                                                                  'administrator sign-in.'],
    ['npm install fails with ECONNRESET', 'Network hiccup; run npm install again.'],
], [2.6, 3.9], cap='Troubleshooting')

h3('8. Testing')
lead('8.1 Test plan.',
     '**Static checks:** TypeScript (strict) and ESLint run on every change. **System testing:** each '
     'feature is exercised end to end in the web build at phone size with automated Playwright scripts '
     '(32 screens visited as resident, organizer and administrator at 360 px wide, checking that nothing '
     'overflows the screen) and on an Android phone through Expo Go. **User acceptance testing:** residents, '
     'organizers and IT experts evaluate the app with the instruments in Part II, Chapter 3.')
para('**8.2 Test cases**')
W = PH('Not yet run')
table(['Test ID', 'Feature', 'Steps', 'Expected result', 'Actual result', 'Pass/Fail'], [
    ['TC-01', 'Sign in', 'Sign in as Ashley', 'Browse opens', 'As expected', 'Pass'],
    ['TC-02', 'Admin sign-in', 'Admin email without tapping logo', '"Incorrect email or password"', 'As expected', 'Pass'],
    ['TC-03', 'Search & filters', 'Search "coastal"; filter by location', 'Only matching events', 'As expected', 'Pass'],
    ['TC-04', 'Details', 'Tap an event card', 'All event fields and photos', 'As expected', 'Pass'],
    ['TC-05', 'Save / RSVP', 'Bookmark; tap Going', 'Listed in Saved / Going; count +1', 'As expected', 'Pass'],
    ['TC-06', 'Cancelled event', 'Open Run for a Cause 5K', 'Badge, note, RSVP disabled', 'As expected', 'Pass'],
    ['TC-07', 'Map', 'Open Map as Ashley', '10 events across all 8 towns', 'As expected (list); pins on phone: ' + W,
     'Pass'],
    ['TC-08', 'Photo crop', 'Edit Profile → Change photo → zoom, drag, Done', 'Cropped round photo', 'As expected', 'Pass'],
    ['TC-09', 'Organizer', 'Apply; admin approves; create event with 3 photos', 'Organizer Tools unlocked; cover '
                                                                               'photo on card', 'As expected', 'Pass'],
    ['TC-10', 'Past time', 'Publish an event for a time that has passed', 'Error "already passed"', 'As expected', 'Pass'],
    ['TC-11', 'Admin', 'Remove a reported event; suspend a user', 'Event gone; user cannot sign in', 'As expected', 'Pass'],
    ['TC-12', 'Phone layout', 'Visit all screens at 360 px', 'Nothing past the screen edge', 'As expected', 'Pass'],
    ['TC-13', 'Device', 'Run in Expo Go (Android)', 'No crash; tabs, map, pickers work', 'Crash found and fixed '
                                                                                       '(BUG-07, BUG-08)', W],
    ['TC-14', 'Code quality', 'npx tsc --noEmit; npx expo lint', 'No errors', 'No errors', 'Pass'],
], [0.55, 0.85, 1.35, 1.45, 1.25, 0.6], cap='Test cases', font_size=8)
para('**8.3 Bug log**')
table(['Bug ID', 'Description', 'Severity', 'Status', 'Fixed in'], [
    ['BUG-01', 'Event times showed 12:00 AM on devices set to another time zone; now formatted in Asia/Manila',
     'Medium', 'Fixed', '0.1.0'],
    ['BUG-02', 'Back button overlapped the category tag on the event details cover', 'Low', 'Fixed', '0.1.0'],
    ['BUG-03', 'Web preview tab bar covered the last items of lists', 'Low', 'Fixed', '0.2.0'],
    ['BUG-04', 'Expo SDK 58 upgrade broke typing (nullable color scheme, list placeholder, web tab ref)',
     'Medium', 'Fixed', '0.4.0'],
    ['BUG-05', 'Organizer application form did not prefill the contact email', 'Low', 'Fixed', '0.6.0'],
    ['BUG-06', 'An event could be published for a time that had already passed (it vanished from Browse)',
     'Medium', 'Fixed', '0.7.0'],
    ['BUG-07', 'App crashed on Android when the loading animation started (animation helper not marked as a '
               'worklet)', 'High', 'Fixed', '0.8.0'],
    ['BUG-08', 'On Android, Edit Profile photo buttons collapsed into empty tall pills', 'Medium', 'Fixed', '0.9.0'],
    ['BUG-09', 'Day/night switch: text changed a moment after the background', 'Low', 'Fixed', '0.8.0'],
    ['BUG-10', 'Admin dashboard panels overflowed the screen on 360 px phones', 'Low', 'Fixed', '0.8.0'],
], [0.7, 3.4, 0.8, 0.6, 0.8], cap='Bug log', font_size=8.5)

h3('9. Security and Privacy')
para('**Current prototype:** accounts are sample accounts stored in memory; no data leaves the phone.')
bullets([
    '**Roles and permissions:** three roles (resident, organizer, administrator). Every action that changes '
    'data checks the role in the data layer: only members of verified organizations can create or edit their '
    'events, and only administrators can use admin functions (PermissionError otherwise). The navigation also '
    'keeps each role on its own screens.',
    '**Administrator sign-in:** admins can sign in only through the administrator mode, and only admins can use '
    'it; a mismatch shows the same message as a wrong password, so the form does not reveal which emails are '
    'administrator accounts. Suspended accounts cannot sign in.',
    '**Organizer verification:** applicants attach supporting documents; administrators approve, ask for a '
    'revision or reject with a note.',
    '**Moderation:** residents can report events; administrators can remove them and must give a reason that '
    'is sent to the organizer.',
    '**Planned with the backend:** Supabase Auth (hashed passwords, email verification), row-level security '
    'rules matching the data-layer checks, HTTPS for all traffic, and encrypted storage at rest.',
    '**Personal data and RA 10173:** collect only name, email, contact number and barangay; a Privacy Policy '
    'screen explains use; users can deactivate or permanently delete their account.',
])

h3('10. Deployment')
lead('10.1 Hosting environment.',
     'Current: development only. The app is served from the developer\'s computer with npx expo start '
     'and opened in Expo Go. Planned: Supabase cloud project in the Southeast Asia (Singapore) region for '
     'low latency from Biliran, on the free tier for the class project, and EAS Build for an installable '
     'Android APK. ' + PH('Confirm plan and region'))
lead('10.2 Deployment steps or CI/CD pipeline.',
     'Code is pushed to a branch on GitHub, reviewed through a pull request, and merged into main. Before '
     'merging, TypeScript and ESLint must pass. Planned: EAS Build produces test builds from main; EAS '
     'Update publishes small fixes over the air; database changes are kept as Supabase migration files.')
lead('10.3 Backup and recovery.',
     'Source code, documentation and design files are versioned on GitHub. Planned: a weekly database export '
     'during the evaluation period, in addition to the hosting provider\'s backups.')

h3('11. Maintenance and Version History')
table(['Version', 'Date', 'Changes', 'Author'], [
    ['0.1.0', '2026-10-02', 'Expo project; Browse, Saved, Profile and Event details with mock data; '
                            'search, filters, save, RSVP; logo, icon and splash', 'Monsales, Justin Dave'],
    ['0.2.0', '2026-10-05', 'Day/night toggle', 'Monsales, Justin Dave'],
    ['0.3.0', '2026-10-13', 'Figma wireframes, hi-fi screens, user flow and design system', 'Monsales, Justin Dave'],
    ['0.4.0', '2026-11-10', 'Upgraded to Expo SDK 58 (React Native 0.88, React 19.3)', 'Monsales, Justin Dave'],
    ['0.5.0', '2026-11-21', 'Organizer tools, demo accounts, in-app update alerts', 'Monsales, Justin Dave'],
    ['0.6.0', '2026-11-22', 'Sign-in, Profile & Settings, organizer applications, Biliran map', 'Monsales, Justin Dave'],
    ['0.7.0', '2026-11-22', 'Event photos, loading animation, admin console with administrator sign-in',
     'Monsales, Justin Dave'],
    ['0.8.0', '2026-11-22', 'Admin sidebar layout and tables; in-app photo cropper; admin profile; Android '
                            'fixes; 360 px layout checks', 'Monsales, Justin Dave'],
    ['0.9.0', '2026-11-22', 'Demo events in all 8 towns; code organized into folders; CODE_GUIDE.md',
     'Monsales, Justin Dave'],
], [0.7, 1.0, 3.4, 1.4], cap='Version history', font_size=9)
lead('Known issues and limitations.', '')
bullets([
    'All data is sample data and resets when the app reloads; photos are stored only on the phone.',
    'Alerts are in-app only; push notifications come with the backend.',
    'The administrator review of documents is manual; there is one demo administrator account.',
    'Map pins use approximate barangay coordinates; organizers cannot yet drop a pin for the venue.',
    'Events are single-day. Not yet fully re-tested on iOS.',
])
lead('Future enhancements.', '')
bullets([
    'Connect Supabase: real accounts, persistent data, photo storage and row-level security.',
    'Push notifications (expo-notifications) for the existing alert rules.',
    'Organizer extras: manage organization members, multi-day events, choose a map pin for the venue.',
    'Admin extras: activity log, more than one administrator.',
    'Filipino / Waray-Waray language options.',
])

h3('12. Appendices')
para('**Source code structure** (full guide with a "where do I find…" table: CODE_GUIDE.md in the repository)')
table(['Path', 'Contents'], [
    ['src/app/', 'Screens (Expo Router): sign-in, (tabs) Browse/Map/Saved/Profile, event details, notifications, '
                 'organizer/, settings/, admin/'],
    ['src/components/', 'Reusable pieces grouped by purpose: ui/, layout/, events/, photos/, admin/'],
    ['src/data/', 'All data access: types, mock tables (db.ts), events, account, admin, notifications, interests'],
    ['src/hooks/', 'Loaders that reload on data changes, saved/RSVP state, theme and day/night preference'],
    ['src/constants/, src/utils/', 'Colors and spacing; dates in Philippine time; map helpers'],
    ['docs/', 'This documentation and the presentation'],
    ['design/', 'Figma SVG files, previews and the generator script'],
], [1.8, 4.7], cap='Source code structure')
para('**Coding standards:** TypeScript strict mode; ESLint with eslint-config-expo; imports use the @/ alias; '
     'colors come from the theme so screens work in light and dark mode; screens never import mock data '
     'directly; permission checks live in the data layer.')
para('**Third-party licenses and credits:** Expo, React Native, React, Expo Router, react-native-maps (MIT); '
     'Material Symbols icons (Apache 2.0); Inter font in the design files (SIL Open Font License 1.1); '
     'diagrams drawn with Mermaid (MIT). UI style inspired by the "Plandoon" and "Safemind" reference mockups. '
     'Logo by ' + PH('designer\'s name') + '.')

# ---------------------------------------------------------------------------
page_break()
h2('Part II: Paper Documentation')
# ---------------------------------------------------------------------------
h3('Preliminary Pages')
para('**Title Page**')
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
                   (PH('Month YYYY of final submission'), 11, False)]:
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
     'is proposed for persistent accounts and data. The prototype was evaluated by '
     + PH('number') + ' respondents using a questionnaire based on ISO/IEC 25010 and the System Usability '
     'Scale. ' + PH('Key results: overall mean, verbal interpretation and SUS score') + '. '
     + PH('One-sentence conclusion based on the results') + '.', align='justify')
para('**Keywords:** community events, mobile application, React Native, verified organizers, usability')

para('**Acknowledgment**')
para('The researchers sincerely thank Ms. Mary Angel Palma, their instructor in Application Development '
     'and Emerging Technologies, for her guidance throughout this project; '
     + PH('adviser / panel members') + ' for their feedback; the respondents and community organizers who '
     'took time to evaluate the application; ' + PH('organizations, e.g., SK officials or barangay office') +
     ' for their cooperation; and their families and friends for their constant support.', align='justify')

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
     'in all eight municipalities of Biliran; the final coverage area is ' + PH('Naval only / all of Biliran') + '.')
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
     'database with authentication and row-level security. ' +
     PH('Add 2–3 more books or journal articles on community information, e-participation or event apps'),
     align='justify')
lead('2.2 Related Studies (Local and Foreign).',
     'Several existing platforms address parts of the problem. **Facebook Events** reaches many users but '
     'mixes event information with unrelated posts and depends on following the right pages. **Eventbrite** '
     'focuses on ticketed events and registration for organizers, and **Meetup** organizes recurring interest '
     'groups; both are designed for broad audiences rather than one community\'s verified local organizations. '
     'Locally, barangay and SK Facebook pages and group chats remain the main channels, which is the situation '
     'described in Chapter 1.')
para(PH('Add at least three local and three foreign studies the group has read: author (year), what system '
        'they built or studied, method, and main findings. Cite each one in the References.'))
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
    ['Iteration 6: backend', 'Supabase accounts, persistent data, push notifications', PH('planned dates')],
    ['Testing and evaluation', 'Device testing, respondent evaluation', PH('planned dates')],
], [1.7, 3.3, 1.5], cap='Development phases')
lead('3.3 Respondents and Sampling.',
     'Respondents are ' + PH('number') + ' residents aged 18–20 from ' + PH('barangays') + ', '
     + PH('number') + ' community organizers (e.g., SK, school and volunteer groups) and ' + PH('number') +
     ' IT practitioners or faculty, for a total of ' + PH('N') + '. They are chosen through purposive '
     'sampling: residents must match the target users, and organizers must currently announce events.')
lead('3.4 Data Gathering Instruments and Procedures.', '')
numbered([
    'Short interviews with organizers about how they currently announce events and handle changes.',
    'A survey questionnaire (Appendix B) with ISO/IEC 25010 items on a 5-point Likert scale and the ten SUS items.',
    'Respondents use the application on a phone following a task list for their role (residents: find, filter, '
    'open, save, RSVP and check the map; organizers: apply, create and update an event; IT experts: all roles '
    'including the admin console).',
    'Respondents answer the questionnaire right after the session; answers are encoded and tallied.',
    'Test cases and bug logs (Part I, Section 8) document technical testing.',
])
lead('3.5 System Requirements Summary.', '')
table(['Type', 'Requirement'], [
    ['Hardware (development)', 'Laptop/desktop with 8 GB RAM or more; Android phone (and iPhone if available)'],
    ['Hardware (users)', 'Android or iOS smartphone with internet access'],
    ['Software', 'Node.js LTS, Git, Visual Studio Code, Expo Go (SDK 58), Figma; Supabase (planned)'],
    ['Personnel', 'Developer(s), UI/UX designer, tester/QA, documentation; see Part I, Section 1'],
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
lead('4.2 Evaluation Results.',
     PH('The evaluation has not been conducted yet. After it, fill in the tables below and write one '
        'interpretation paragraph under each table.'))
table(['Criteria', 'Mean', 'Verbal interpretation'], [
    ['Functional suitability', PH(' '), PH(' ')],
    ['Usability', PH(' '), PH(' ')],
    ['Performance efficiency', PH(' '), PH(' ')],
    ['Reliability', PH(' '), PH(' ')],
    ['Security', PH(' '), PH(' ')],
    ['**Overall**', PH(' '), PH(' ')],
], [2.6, 1.2, 2.7], cap='Evaluation results by ISO/IEC 25010 characteristic')
table(['Respondent group', 'n', 'Mean SUS score', 'Interpretation'], [
    ['Residents', PH(' '), PH(' '), PH(' ')],
    ['Organizers', PH(' '), PH(' '), PH(' ')],
    ['IT experts', PH(' '), PH(' '), PH(' ')],
], [2.0, 0.8, 1.6, 2.1], cap='System Usability Scale results')
lead('4.3 Discussion.',
     PH('Explain what the results mean and compare them with Chapter 2, e.g., whether usability results support '
        'Davis (1989) and Nielsen (1994), and how the SUS score compares with the benchmark of 68.'))
lead('4.4 Challenges Encountered.', '')
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
    '**Evaluation:** ' + PH('summarize the results for each ISO/IEC 25010 characteristic and the SUS score'),
])
lead('5.2 Conclusions.',
     'A single mobile application can present community events in a consistent, searchable form that addresses '
     'the scattered-information problem identified in this study. ' +
     PH('Add conclusions drawn from the evaluation results, e.g., whether respondents found it effective and '
        'acceptable.'))
lead('5.3 Recommendations.', '')
bullets([
    '**For users and organizers:** pilot the app with a few SK councils and school organizations first, and '
    'agree on who verifies organizations.',
    '**For the organization / LGU:** use the app as an official channel for public programs and urgent updates.',
    '**For future developers:** connect the Supabase backend and push notifications; let organizers drop a map '
    'pin for the venue and manage members; add multi-day events and local-language support; measure performance '
    'on low-end phones.',
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
    PH('Add the related studies from Section 2.2 in APA 7th edition format'),
]
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
para(PH('Insert the tally of responses per item and the weighted-mean and SUS computations after the evaluation.'))

h4('Appendix D: Sample System Screenshots')
para('More screenshots are in Part I, Section 7 (User Manual) and Chapter 4.')
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
    ['Team decision on backend; Supabase setup', PH('date'), 'Pending'],
    ['Push notifications', PH('date'), 'Planned'],
    ['Device testing and evaluation', PH('date'), 'Planned'],
    ['Final documentation and presentation', PH('date'), 'Planned'],
], [3.2, 1.6, 1.7], cap='Project timeline')

h4('Appendix F: Curriculum Vitae of Researchers')
for name in ['Salundaguit, Henjiel A.', 'Ucag, Jennifer N.', 'Monsales, Justin Dave', 'Bohol, Philip',
             'Doloeras, Patricia', 'Pedida, Toroi']:
    para(f'**{name}**: ' + PH('contact, education, skills, photo'))

doc.save(OUT)
print('figures', counters['Figure'], 'tables', counters['Table'])
