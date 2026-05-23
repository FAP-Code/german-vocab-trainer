/* Form A – Character box generator */

function makeBoxes(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  for (let i = 0; i < count; i++) {
    const box = document.createElement('div');
    box.className = 'char-box';
    el.appendChild(box);
  }
}

function makeSmallBoxes(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  for (let i = 0; i < count; i++) {
    const box = document.createElement('div');
    box.className = 'char-box';
    el.appendChild(box);
  }
}

/* ------- Page 1 ------- */
// Section A – Business Name (2 rows, ~34 boxes each)
makeBoxes('biz-name-row1', 34);
makeBoxes('biz-name-row2', 34);

// Section C – ISIC codes
makeSmallBoxes('isic-code-1', 20);
makeSmallBoxes('isic-code-2', 20);
makeSmallBoxes('isic-code-3', 20);
makeBoxes('isic-desc-row', 34);

// Section D – Registered Office Address
makeBoxes('d-digital-addr', 22);
makeBoxes('d-house', 34);
makeBoxes('d-street', 34);
makeBoxes('d-city', 34);

/* ------- Page 2 ------- */
// Continuation of Section D
makeBoxes('d-district', 34);
makeBoxes('d-region', 34);
makeBoxes('d-landlord', 30);

// Section E – Principal Place of Business
makeBoxes('e-digital-addr', 22);
makeBoxes('e-house', 34);
makeBoxes('e-street', 34);
makeBoxes('e-city', 34);
makeBoxes('e-district', 34);
makeBoxes('e-region', 34);

// Section F – Other Place of Business
makeBoxes('f-digital-addr', 22);
makeBoxes('f-house', 34);
makeBoxes('f-street', 34);
makeBoxes('f-city', 34);
makeBoxes('f-district', 34);
makeBoxes('f-region', 34);

// Section G – Postal Address
makeBoxes('g-co', 30);
makeBoxes('g-number', 20);
makeBoxes('g-town', 30);
makeBoxes('g-region', 30);

// Section H – Contact
makeSmallBoxes('h-phone1', 15);
makeSmallBoxes('h-phone2', 15);
makeSmallBoxes('h-mobile1', 15);
makeSmallBoxes('h-mobile2', 15);
makeSmallBoxes('h-fax', 15);
makeBoxes('h-email', 30);
makeBoxes('h-website', 30);

// Section I – Proprietor
makeBoxes('i-firstname', 30);
makeBoxes('i-middlename', 30);
makeBoxes('i-lastname', 30);
makeBoxes('i-formername', 30);

/* ------- Page 3 ------- */
// Section I cont.
makeBoxes('i-nationality', 30);
makeBoxes('i-occupation', 30);
makeSmallBoxes('i-mobile1', 15);
makeSmallBoxes('i-mobile2', 15);
makeSmallBoxes('i-fax', 15);
makeBoxes('i-email', 30);
makeBoxes('i-tin', 20);
makeBoxes('i-ghcard', 28);

// Section J – Residential Address
makeBoxes('j-digital-addr', 22);
makeBoxes('j-house', 34);
makeBoxes('j-street', 34);
makeBoxes('j-city', 34);
makeBoxes('j-district', 34);
makeBoxes('j-region', 34);
makeBoxes('j-country', 34);

// Section K – MSME Details
makeBoxes('k-revenue', 30);
makeBoxes('k-employees', 20);

// Section L – BOP
makeBoxes('l-bop-ref', 25);

/* ------- Page 4 ------- */
// Section N – Office Use
makeBoxes('n-submission-date', 18);
makeBoxes('n-inspector', 30);
makeBoxes('n-filing-date', 18);
