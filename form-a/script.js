/* Form A – character box generator
   Populates every .char-boxes-row / .char-boxes-sm with individual
   .char-box elements so the grid of input squares renders correctly. */

function makeBoxes(id, count) {
  var el = document.getElementById(id);
  if (!el) return;
  for (var i = 0; i < count; i++) {
    var box = document.createElement('div');
    box.className = 'char-box';
    el.appendChild(box);
  }
}

/* ── PAGE 1 ── */

// Section A – Business Name (2 rows)
makeBoxes('biz-name-row1', 34);
makeBoxes('biz-name-row2', 34);

// Section B – Others specify
makeBoxes('sect-b-others', 28);

// Section C – ISIC codes + description
makeBoxes('isic-code-1', 18);
makeBoxes('isic-code-2', 18);
makeBoxes('isic-code-3', 18);
makeBoxes('isic-desc-row', 34);

// Section D – Registered Office Address
makeBoxes('d-digital-addr', 20);
makeBoxes('d-house',        34);
makeBoxes('d-street',       34);
makeBoxes('d-city',         34);

/* ── PAGE 2 ── */

// Section D continued
makeBoxes('d-district', 34);
makeBoxes('d-region',   34);
makeBoxes('d-landlord', 30);

// Section E – Principal Place of Business
makeBoxes('e-digital-addr', 20);
makeBoxes('e-house',        34);
makeBoxes('e-street',       34);
makeBoxes('e-city',         34);
makeBoxes('e-district',     34);
makeBoxes('e-region',       34);

// Section F – Other Place of Business
makeBoxes('f-digital-addr', 20);
makeBoxes('f-house',        34);
makeBoxes('f-street',       34);
makeBoxes('f-city',         34);
makeBoxes('f-district',     34);
makeBoxes('f-region',       34);

// Section G – Postal Address
makeBoxes('g-co',     28);
makeBoxes('g-number', 18);
makeBoxes('g-town',   28);
makeBoxes('g-region', 28);

// Section H – Contact (phone/fax in 2-col, so shorter)
makeBoxes('h-phone1',  14);
makeBoxes('h-phone2',  14);
makeBoxes('h-mobile1', 14);
makeBoxes('h-mobile2', 14);
makeBoxes('h-fax',     14);
makeBoxes('h-email',   32);
makeBoxes('h-website', 32);

// Section I – Proprietor names
makeBoxes('i-firstname',   30);
makeBoxes('i-middlename',  30);
makeBoxes('i-lastname',    30);
makeBoxes('i-formername',  30);

/* ── PAGE 3 ── */

// Section I continued
makeBoxes('i-nationality', 30);
makeBoxes('i-occupation',  30);
makeBoxes('i-mobile1',     14);
makeBoxes('i-mobile2',     14);
makeBoxes('i-fax',         14);
makeBoxes('i-email',       32);
makeBoxes('i-tin',         20);
makeBoxes('i-ghcard',      26);

// Section J – Residential Address
makeBoxes('j-digital-addr', 20);
makeBoxes('j-house',        34);
makeBoxes('j-street',       34);
makeBoxes('j-city',         34);
makeBoxes('j-district',     34);
makeBoxes('j-region',       34);
makeBoxes('j-country',      34);

// Section K – MSME Details
makeBoxes('k-revenue',   28);
makeBoxes('k-employees', 18);

// Section L – BOP
makeBoxes('l-bop-ref', 22);

/* ── PAGE 4 ── */

// Section N – Office Use
makeBoxes('n-submission-date', 16);
makeBoxes('n-inspector',       30);
makeBoxes('n-filing-date',     16);
