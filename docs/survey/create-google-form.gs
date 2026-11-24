/**
 * Creates the Community Connect user evaluation (Paper, Appendix B) as a
 * Google Form, linked to a Google Sheet that collects the responses.
 *
 * How to use (about 2 minutes):
 *  1. Go to https://script.google.com and click "New project".
 *  2. Delete the sample code, paste this whole file, and click Save.
 *  3. Choose the function "createEvaluationForm" at the top and click Run.
 *  4. Allow the permissions it asks for (it only creates a form and a sheet
 *     in your own Google Drive).
 *  5. Open "Execution log": it shows the link to send respondents, the
 *     link to edit the form, and the responses spreadsheet.
 *
 * Questions are numbered Q1–Q15 (ISO/IEC 25010) and SUS1–SUS10 so the
 * responses can be scored easily afterwards.
 */
function createEvaluationForm() {
  var form = FormApp.create('Community Connect – User Evaluation');
  form.setDescription(
    'Thank you for helping us evaluate Community Connect, a mobile app for community events in Biliran ' +
    '(BSCS-3C Group 7, Application Development and Emerging Technologies).\n\n' +
    'This takes about 15–20 minutes: first try the app, then answer the questions. Your answers are ' +
    'anonymous and used only for this study, following the Data Privacy Act of 2012 (RA 10173).'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setConfirmationMessage('Thank you! Your answers have been recorded.');

  // ---------------------------------------------------------------- Consent
  form.addMultipleChoiceItem()
    .setTitle('Consent')
    .setHelpText(
      'Participation is voluntary. You may skip any question or stop at any time. There are no known risks.'
    )
    .setChoiceValues(['I have read the information above and agree to take part.'])
    .setRequired(true);

  // ---------------------------------------------------------------- Tasks
  form.addPageBreakItem()
    .setTitle('Before answering: try the app')
    .setHelpText(
      'Open Community Connect in Expo Go and do the tasks for your role. Demo password for all accounts: ' +
      'community123\n\n' +
      'RESIDENTS (sign in as ashley@example.com):\n' +
      '• Search for an event and filter by a category\n' +
      '• Open an event, save it and tap "Going"\n' +
      '• Open the Map tab and the Saved tab\n' +
      '• Open the bell (notifications) and your Profile\n\n' +
      'ORGANIZERS (sign in as carlo.sk@example.com):\n' +
      '• Profile → Organizer Tools → New event: add a photo and publish\n' +
      '• Open your event, Edit it and postpone it with a note\n\n' +
      'IT EXPERTS: do both lists, then tap the logo on Sign in and sign in as admin@example.com:\n' +
      '• Approve an organizer request and suspend a user'
    );

  // ---------------------------------------------------------------- Part 1: profile
  form.addPageBreakItem().setTitle('Part 1. Respondent profile');
  form.addTextItem()
    .setTitle('Age')
    .setValidation(FormApp.createTextValidation().requireNumberBetween(13, 99).build())
    .setRequired(true);
  form.addListItem()
    .setTitle('Municipality')
    .setChoiceValues(['Almeria', 'Biliran', 'Cabucgayan', 'Caibiran', 'Culaba', 'Kawayan', 'Maripipi',
                      'Naval', 'Outside Biliran'])
    .setRequired(true);
  form.addTextItem().setTitle('Barangay (optional)');
  form.addMultipleChoiceItem()
    .setTitle('Respondent type')
    .setChoiceValues(['Resident', 'Community organizer (SK, barangay, school, NGO, volunteer group)',
                      'IT expert / faculty'])
    .setRequired(true);

  // ---------------------------------------------------------------- Part 2: ISO/IEC 25010
  var iso = [
    ['Functional suitability', [
      'The app lists the community events I need in one place.',
      'Search and filters help me find the events I want.',
      'Event pages show complete details (date, time, venue, organizer, how to join).',
      'Saving and RSVP work as expected.',
      'The map shows where my events are.',
      'I am alerted when an event I follow changes.'
    ]],
    ['Usability', [
      'The app is easy to learn.',
      'The screens are clear and easy to read.',
      'I can tell easily when an event is cancelled or postponed.'
    ]],
    ['Performance efficiency', [
      'Screens open quickly.',
      'Scrolling the event list is smooth.'
    ]],
    ['Reliability', [
      'The app works without crashing or errors.',
      'Information stays correct after changes.'
    ]],
    ['Security', [
      'Only verified organizers can post events.',
      'I trust the app with my personal information.'
    ]]
  ];
  var n = 1;
  iso.forEach(function (group) {
    form.addPageBreakItem()
      .setTitle('Part 2. Software quality: ' + group[0])
      .setHelpText('5 = Strongly Agree, 4 = Agree, 3 = Neutral, 2 = Disagree, 1 = Strongly Disagree');
    group[1].forEach(function (statement) {
      form.addScaleItem()
        .setTitle('Q' + n + '. ' + statement)
        .setBounds(1, 5)
        .setLabels('Strongly Disagree', 'Strongly Agree')
        .setRequired(true);
      n++;
    });
  });

  // ---------------------------------------------------------------- Part 3: System Usability Scale
  form.addPageBreakItem()
    .setTitle('Part 3. System Usability Scale')
    .setHelpText('1 = Strongly Disagree … 5 = Strongly Agree. "System" means the Community Connect app.');
  var sus = [
    'I think that I would like to use this system frequently.',
    'I found the system unnecessarily complex.',
    'I thought the system was easy to use.',
    'I think that I would need the support of a technical person to be able to use this system.',
    'I found the various functions in this system were well integrated.',
    'I thought there was too much inconsistency in this system.',
    'I would imagine that most people would learn to use this system very quickly.',
    'I found the system very cumbersome to use.',
    'I felt very confident using the system.',
    'I needed to learn a lot of things before I could get going with this system.'
  ];
  sus.forEach(function (statement, i) {
    form.addScaleItem()
      .setTitle('SUS' + (i + 1) + '. ' + statement)
      .setBounds(1, 5)
      .setLabels('Strongly Disagree', 'Strongly Agree')
      .setRequired(true);
  });

  // ---------------------------------------------------------------- Part 4: comments
  form.addPageBreakItem().setTitle('Part 4. Comments and suggestions');
  form.addParagraphTextItem().setTitle('What did you like, and what should we improve? (optional)');

  // ---------------------------------------------------------------- Responses sheet
  var sheet = SpreadsheetApp.create('Community Connect – Evaluation Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Send this link to respondents: ' + form.getPublishedUrl());
  Logger.log('Edit the form: ' + form.getEditUrl());
  Logger.log('Responses spreadsheet: ' + sheet.getUrl());
}
