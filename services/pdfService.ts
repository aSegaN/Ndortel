
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { BirthCertificate, CertificateStatus, Center } from '../types';

// Configuration de la mise en page (A4: 210 x 297 mm)
const MARGINS = { left: 10, top: 10, right: 10, bottom: 10 };
const COLORS = {
  black: '#000000',
  darkGrey: '#333333',
  lightGrey: '#e5e7eb',
  blueStamp: '#1e3a8a',
  formLines: '#4b5563',
  securityGrey: '#f9fafb',
};

/**
 * Conversion de nombres en lettres (Français) - Version Officielle
 */
const numberToFrenchWords = (n: number): string => {
  const units = ['', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF'];
  const teens = ['DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE', 'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF'];
  const tens = ['', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE', 'SOIXANTE-DIX', 'QUATRE-VINGTS', 'QUATRE-VINGT-DIX'];

  if (n === 0) return 'ZÉRO';
  
  let res = '';

  if (n >= 1000) {
    const thousand = Math.floor(n / 1000);
    if (thousand > 1) res += numberToFrenchWords(thousand) + ' MILLE ';
    else res += 'MILLE ';
    n %= 1000;
  }

  if (n >= 100) {
    const hundred = Math.floor(n / 100);
    if (hundred > 1) res += units[hundred] + ' CENT ';
    else res += 'CENT ';
    n %= 100;
  }

  if (n >= 20) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (ten === 7 || ten === 9) {
      res += tens[ten - 1] + '-' + teens[unit];
    } else {
      res += tens[ten];
      if (unit === 1) res += ' ET UN';
      else if (unit > 1) res += '-' + units[unit];
    }
  } else if (n >= 10) {
    res += teens[n - 10];
  } else if (n > 0) {
    res += units[n];
  }

  return res.trim().replace(/\s+/g, ' ');
};

/**
 * Filigrane de sécurité - Rendu ultra-subtil (Ghost watermark)
 */
const drawSecurityBackground = (doc: jsPDF, w: number, h: number) => {
  doc.saveGraphicsState();
  doc.setTextColor(248, 248, 248); 
  doc.setFontSize(4.5);
  doc.setFont("times", "italic");
  const text = "NDORTEL - RÉPUBLIQUE DU SÉNÉGAL";
  
  for (let y = 15; y < h; y += 55) {
    for (let x = 10; x < w; x += 110) {
      doc.text(text, x, y, { angle: -35 });
    }
  }
  doc.restoreGraphicsState();
};

/**
 * Structure et bordures
 */
const drawGlobalStructure = (doc: jsPDF, w: number, h: number, isCopy: boolean) => {
  doc.setLineWidth(0.5);
  doc.setDrawColor(COLORS.black);
  doc.rect(MARGINS.left, MARGINS.top, w - (MARGINS.left + MARGINS.right), h - (MARGINS.top + MARGINS.bottom));
  doc.setLineWidth(0.2);
  doc.rect(MARGINS.left + 1.2, MARGINS.top + 1.2, w - (MARGINS.left + MARGINS.right) - 2.4, h - (MARGINS.top + MARGINS.bottom) - 2.4);

  if (isCopy) {
    doc.saveGraphicsState();
    doc.setTextColor(250, 250, 250);
    doc.setFontSize(65);
    doc.setFont("times", "bold");
    doc.text("DUPLICATA", w / 2, h / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }
};

/**
 * Header
 */
const drawHeaderSection = (doc: jsPDF, w: number, center?: Center) => {
  const midX = w / 2;
  const headerHeight = 60;

  doc.setLineWidth(0.4);
  doc.line(MARGINS.left, MARGINS.top + headerHeight, w - MARGINS.right, MARGINS.top + headerHeight);
  doc.line(midX, MARGINS.top, midX, MARGINS.top + headerHeight);

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  let y = MARGINS.top + 8;
  const leftX = MARGINS.left + 6;

  doc.text(`RÉGION : ${center?.region.toUpperCase() || "DAKAR"}`, leftX, y); y += 9;
  doc.text(`DÉPARTEMENT : ${center?.department.toUpperCase() || "DAKAR"}`, leftX, y); y += 9;
  doc.text(`ARRONDISSEMENT : ${center?.arrondissement?.toUpperCase() || "DAKAR PLATEAU"}`, leftX, y); y += 11;
  
  doc.setFontSize(7.5);
  doc.text("COLLECTIVITÉ LOCALE", midX / 2 + MARGINS.left, y - 4, { align: 'center' });
  doc.text("(Commune ou Communauté Rurale)", midX / 2 + MARGINS.left, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("times", "bold");
  doc.text(center?.commune.toUpperCase() || "CENTRE NON DÉFINI", midX / 2 + MARGINS.left, y, { align: 'center' });

  const rightCenterX = midX + (w - MARGINS.right - midX) / 2;
  y = MARGINS.top + 8;
  doc.setFont("times", "normal");
  doc.setFontSize(9.5);
  doc.text("RÉPUBLIQUE DU SÉNÉGAL", rightCenterX, y, { align: 'center' }); y += 4;
  doc.setFontSize(7.5);
  doc.text("UN PEUPLE - UN BUT - UNE FOI", rightCenterX, y, { align: 'center' }); y += 2;
  doc.setLineWidth(0.2);
  doc.line(rightCenterX - 12, y, rightCenterX + 12, y); y += 13;

  doc.setFontSize(24);
  doc.setFont("times", "bold");
  doc.text("ÉTAT CIVIL", rightCenterX, y, { align: 'center' }); y += 9;
  
  doc.setFontSize(9);
  doc.setFont("times", "normal");
  doc.text("CENTRE DE (!)", rightCenterX, y, { align: 'center' }); y += 5;
  doc.line(rightCenterX - 20, y, rightCenterX + 20, y);
  
  if (center) {
    doc.setFont("times", "bold");
    doc.text(center.name.toUpperCase(), rightCenterX, y + 6, { align: 'center' });
  }
};

/**
 * Titre
 */
const drawTitleSection = (doc: jsPDF, w: number, certificate: BirthCertificate, isCopy: boolean) => {
  const yStart = MARGINS.top + 60;
  const titleHeight = 40;
  const rightColumnX = w - 45;

  doc.setLineWidth(0.4);
  doc.line(MARGINS.left, yStart + titleHeight, w - MARGINS.right, yStart + titleHeight);
  doc.line(rightColumnX, yStart, rightColumnX, yStart + titleHeight);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("EXTRAIT DU REGISTRE DES ACTES DE NAISSANCE", MARGINS.left + 5, yStart + 10);
  
  if (isCopy) {
    doc.setFontSize(8);
    doc.setTextColor(150, 0, 0);
    doc.text("COPIE CERTIFIÉE CONFORME", MARGINS.left + 5, yStart + 15);
    doc.setTextColor(0, 0, 0);
  }

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  let y = yStart + 23;
  const year = certificate.registrationYear;
  const yearInWords = numberToFrenchWords(year);
  
  doc.text("Pour l'année (2) ", MARGINS.left + 5, y);
  doc.setDrawColor(COLORS.formLines);
  doc.line(MARGINS.left + 35, y + 0.5, MARGINS.left + 140, y + 0.5);
  doc.setFont("times", "bold");
  doc.text(yearInWords, MARGINS.left + 87.5, y, { align: 'center' });
  
  y += 13;
  const seqNumStr = certificate.registrationNumber.split('-').pop() || '0';
  const seqInWords = numberToFrenchWords(parseInt(seqNumStr, 10));
  
  doc.setFont("times", "normal");
  doc.text("N° dans le Registre ", MARGINS.left + 5, y);
  doc.line(MARGINS.left + 40, y + 0.5, MARGINS.left + 140, y + 0.5);
  doc.setFont("times", "bold");
  doc.text(seqInWords, MARGINS.left + 90, y, { align: 'center' });

  const boxWidth = w - MARGINS.right - rightColumnX;
  const centerX = rightColumnX + boxWidth / 2;
  doc.setDrawColor(COLORS.black);

  doc.setFontSize(11);
  doc.text(`AN - ${year}`, centerX, yStart + 15, { align: 'center' });
  doc.line(rightColumnX, yStart + 26, w - MARGINS.right, yStart + 26);
  
  doc.setFontSize(7);
  doc.text("N° dans le Registre", centerX, yStart + 31, { align: 'center' });
  doc.text("en chiffres", centerX, yStart + 34, { align: 'center' });
  
  doc.setFontSize(15);
  doc.setFont("courier", "bold");
  doc.text(seqNumStr, centerX, yStart + 40, { align: 'center' });
};

/**
 * Corps Narratif
 */
const drawBodyNarrative = (doc: jsPDF, w: number, certificate: BirthCertificate) => {
  const yStart = MARGINS.top + 100;
  const h = 95;
  const contentX = MARGINS.left + 6;

  doc.setFont("times", "normal");
  doc.setFontSize(10.5);

  const bDate = new Date(certificate.birthDate);
  const dayInLetters = numberToFrenchWords(bDate.getDate());
  const monthName = bDate.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
  const yearInLetters = numberToFrenchWords(bDate.getFullYear());

  let y = yStart + 10;
  doc.text(`Le ${dayInLetters} ${monthName} Année ${yearInLetters}`, contentX, y); 
  
  y += 10;
  const [hours, minutes] = certificate.birthTime.split(':');
  const hWord = numberToFrenchWords(parseInt(hours || '0'));
  const mWord = numberToFrenchWords(parseInt(minutes || '0'));
  doc.text(`à ${hWord} heures ${mWord} minutes est né (e) à ${certificate.birthPlace.toUpperCase()}`, contentX, y);

  const lieuBoxY = y - 8;
  doc.setLineWidth(0.3);
  doc.rect(w - 65, lieuBoxY, 55, 16);
  doc.setFontSize(7.5);
  doc.text("LIEU DE NAISSANCE", w - 37.5, lieuBoxY + 14, { align: 'center' });
  doc.setFontSize(10.5);
  doc.setFont("times", "bold");
  doc.text(certificate.birthPlace.toUpperCase(), w - 37.5, lieuBoxY + 7, { align: 'center' });
  doc.setFont("times", "normal");

  y += 15; 
  doc.text(`un enfant de sexe`, contentX, y);
  const genderX = contentX + 110;
  doc.setFontSize(11);
  doc.text("M", genderX, y);
  doc.rect(genderX + 6, y - 5, 7, 7);
  if (certificate.childGender === 'M') {
    doc.text("X", genderX + 7.8, y + 0.8, { align: 'left' });
  }
  doc.text("ou", genderX + 18, y);
  doc.text("F", genderX + 27, y);
  doc.rect(genderX + 33, y - 5, 7, 7);
  if (certificate.childGender === 'F') {
    doc.text("X", genderX + 34.8, y + 0.8, { align: 'left' });
  }
  doc.setFontSize(7);
  doc.text("(4)", genderX + 44, y);
  doc.setFontSize(10.5);

  y += 12;
  doc.setLineWidth(0.2);
  doc.rect(contentX + 20, y - 6, 85, 7.5);
  doc.setFont("times", "bold");
  doc.text(certificate.childFirstName.toUpperCase(), contentX + 62.5, y - 0.5, { align: 'center' });
  doc.rect(w - 75, y - 6, 65, 7.5);
  doc.text(certificate.childLastName.toUpperCase(), w - 42.5, y - 0.5, { align: 'center' });
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.text("PRÉNOMS", contentX + 62.5, y + 5, { align: 'center' });
  doc.text("NOM DE FAMILLE", w - 42.5, y + 5, { align: 'center' });
  doc.setFontSize(10.5);

  y += 14;
  doc.text("de", contentX, y);
  doc.rect(contentX + 10, y - 6, 100, 7.5);
  doc.setFont("times", "bold");
  doc.text(certificate.fatherFirstName.toUpperCase(), contentX + 60, y - 0.5, { align: 'center' });
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.text("PRÉNOMS DU PÈRE", contentX + 60, y + 5, { align: 'center' });
  doc.setFontSize(10.5);

  y += 14;
  doc.text("et de", contentX, y);
  doc.rect(contentX + 10, y - 6, 100, 7.5);
  doc.setFont("times", "bold");
  doc.text(certificate.motherFirstName.toUpperCase(), contentX + 60, y - 0.5, { align: 'center' });
  doc.rect(w - 75, y - 6, 65, 7.5);
  doc.text(certificate.motherLastName.toUpperCase(), w - 42.5, y - 0.5, { align: 'center' });
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.text("PRÉNOMS DE LA MÈRE", contentX + 60, y + 5, { align: 'center' });
  doc.text("NOM DE FAMILLE DE LA MÈRE", w - 42.5, y + 5, { align: 'center' });

  y += 10;
  doc.setFontSize(8);
  doc.text(`Pays de naissance pour les naissances à l'étranger (3) : SÉNÉGAL`, contentX, y);

  doc.setLineWidth(0.4);
  doc.line(MARGINS.left, yStart + h, w - MARGINS.right, yStart + h);
};

/**
 * Section Jugement Supplétif
 */
const drawJudgmentSection = (doc: jsPDF, w: number, certificate: BirthCertificate) => {
  const yStart = 205; 
  const h = 40; 
  const verticalBarWidth = 8;
  const contentStart = MARGINS.left + verticalBarWidth;
  
  doc.setLineWidth(0.4);
  doc.line(contentStart, yStart, contentStart, yStart + h);
  doc.line(MARGINS.left, yStart + h, w - MARGINS.right, yStart + h);
  
  doc.setFontSize(4.5);
  doc.setFont("times", "bold");
  const verticalText = "JUGEMENT D'AUTORISATION D'INSCRIPTION (EX. JUGEMENT SUPPLÉTIF)";
  doc.text(verticalText, MARGINS.left + 5.5, yStart + h - 3, { angle: 90 });

  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  
  let y = yStart + 7;
  doc.text(`Délivré par le tribunal d'instance de : ............................................................................`, contentStart + 3, y);
  if (certificate.judgmentCourt) {
      doc.setFont("times", "bold");
      doc.text(certificate.judgmentCourt.toUpperCase(), contentStart + 48, y);
      doc.setFont("times", "normal");
  }
  
  y += 10;
  doc.text(`Le ................................................................................................................................`, contentStart + 3, y);
  if (certificate.judgmentDate) {
      const jd = new Date(certificate.judgmentDate);
      const dayW = numberToFrenchWords(jd.getDate());
      const monthW = jd.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
      const yearW = numberToFrenchWords(jd.getFullYear());
      doc.setFont("times", "bold");
      doc.text(`${dayW} ${monthW} ${yearW}`, contentStart + 10, y);
      doc.setFont("times", "normal");
  }
  doc.setFontSize(6);
  doc.text(`(en lettres)`, contentStart + 60, y + 3.5, { align: 'center' });
  
  y += 9;
  doc.setFontSize(8.5);
  doc.text(`Sous le numéro : ............................................................................................................`, contentStart + 3, y);
  if (certificate.judgmentNumber) {
      const numW = numberToFrenchWords(parseInt(certificate.judgmentNumber));
      doc.setFont("times", "bold");
      doc.text(numW, contentStart + 25, y);
      doc.setFont("times", "normal");
  }
  doc.setFontSize(6);
  doc.text(`(en lettres)`, contentStart + 60, y + 3.5, { align: 'center' });
  
  y += 9;
  doc.setFontSize(8.5);
  doc.text(`Inscrit le .................................... sur le Registre des Actes de Naissance de l'année`, contentStart + 3, y);
  
  const rightColumnX = w - 45;
  doc.setLineWidth(0.4);
  doc.line(rightColumnX, yStart, rightColumnX, yStart + h);
  
  doc.setFontSize(8);
  const jYear = certificate.judgmentDate ? new Date(certificate.judgmentDate).getFullYear() : "20...";
  doc.text(`AN - ${jYear}`, rightColumnX + 22.5, yStart + 8, { align: 'center' });
  doc.line(rightColumnX, yStart + 12, w - MARGINS.right, yStart + 12);
  
  doc.setFontSize(6.5);
  doc.text("N° dans le registre", rightColumnX + 22.5, yStart + 17, { align: 'center' });
  doc.text("en chiffres", rightColumnX + 22.5, yStart + 20, { align: 'center' });
  if (certificate.judgmentNumber) {
      doc.setFontSize(11);
      doc.setFont("courier", "bold");
      doc.text(certificate.judgmentNumber, rightColumnX + 22.5, yStart + 26, { align: 'center' });
      doc.setFont("times", "normal");
  }
  doc.line(rightColumnX, yStart + 28, w - MARGINS.right, yStart + 28);
  
  doc.setFontSize(8);
  doc.text(`AN - ${jYear}`, rightColumnX + 22.5, yStart + 36, { align: 'center' });
};

/**
 * Footer
 */
const drawFooterSection = async (doc: jsPDF, w: number, h: number, certificate: BirthCertificate, center?: Center) => {
  const yStart = 245; 
  const midX = w / 2;

  doc.setLineWidth(0.4);
  doc.line(midX, yStart, midX, h - MARGINS.bottom - 15);

  doc.setFontSize(8.5);
  doc.setFont("times", "bold");
  doc.text("EXTRAIT DÉLIVRÉ PAR LE CENTRE DE", MARGINS.left + 5, yStart + 8);
  doc.setFont("times", "normal");
  doc.text(center?.name.toUpperCase() || "NON SPÉCIFIÉ", MARGINS.left + 5, yStart + 18);
  
  doc.setFont("times", "bold");
  doc.text("POUR EXTRAIT CERTIFIÉ CONFORME", midX + 5, yStart + 8);
  doc.setFont("times", "normal");
  
  const issuanceDate = certificate.signedAt ? new Date(certificate.signedAt) : new Date();
  const dayW = numberToFrenchWords(issuanceDate.getDate());
  const monthW = issuanceDate.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
  const yearW = numberToFrenchWords(issuanceDate.getFullYear());
  doc.text(`À ${center?.commune.toUpperCase() || "DAKAR"}, le ${dayW} ${monthW} ${yearW}`, midX + 5, yStart + 16);
  
  doc.setFont("times", "bold");
  doc.text("L'Officier de l'État Civil soussigné", midX + (w - MARGINS.right - midX)/2, yStart + 24, { align: 'center' });

  if (certificate.status === CertificateStatus.SIGNED || certificate.status === CertificateStatus.DELIVERED) {
     const stampX = midX + (w - MARGINS.right - midX) / 2;
     const stampY = yStart + 42;
     drawSecureStamp(doc, stampX, stampY, certificate);
     
     doc.setFont("times", "bold");
     doc.setFontSize(11);
     const officerName = certificate.signedBy?.split('(')[0].trim().toUpperCase() || "L'OFFICIER";
     doc.text(officerName, stampX, h - MARGINS.bottom - 18, { align: 'center' });
  }

  try {
    const qrData = await QRCode.toDataURL(`https://etatcivil.sn/verify/${certificate.registrationNumber}`, { margin: 1, width: 80 });
    doc.addImage(qrData, 'PNG', MARGINS.left + 5, h - MARGINS.bottom - 28, 22, 22);
  } catch(e) {}

  doc.setFontSize(6.5);
  doc.text("(1) (2) (3) Notes et mentions marginales au verso", MARGINS.left + 30, h - MARGINS.bottom - 6);
  doc.text("Signature Électronique Qualifiée - Loi 2008-08 Sénégal", MARGINS.left + 30, h - MARGINS.bottom - 3);
};

const drawSecureStamp = (doc: jsPDF, centerX: number, centerY: number, certificate: BirthCertificate) => {
    const radius = 22;
    doc.saveGraphicsState();
    doc.setTextColor(COLORS.blueStamp);
    doc.setDrawColor(COLORS.blueStamp);
    
    doc.setLineWidth(0.8);
    doc.circle(centerX, centerY, radius);
    doc.setLineWidth(0.4);
    doc.circle(centerX, centerY, radius - 1.5);
    doc.setLineWidth(0.2);
    doc.circle(centerX, centerY, radius - 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text("RÉPUBLIQUE DU SÉNÉGAL", centerX, centerY - 15, { align: 'center' });
    
    if (certificate.pkiSignature) {
        doc.setFontSize(4);
        doc.text("SIGNATURE QUALIFIÉE PKI", centerX, centerY - 11, { align: 'center' });
        doc.setFontSize(3.5);
        doc.text(certificate.pkiSignature.certificateId, centerX, centerY - 8.5, { align: 'center' });
    }

    doc.setFontSize(16);
    doc.text("★", centerX, centerY - 6, { align: 'center' });

    doc.setFontSize(13);
    doc.setFont("times", "bold");
    doc.text("OFFICIER", centerX, centerY + 2, { align: 'center' });
    
    doc.setLineWidth(0.6);
    doc.line(centerX - 10, centerY + 4.5, centerX + 10, centerY + 4.5);

    doc.restoreGraphicsState();
};

export const generateCertificatePDF = async (certificate: BirthCertificate, center?: Center) => {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const isCopy = certificate.status === CertificateStatus.DELIVERED;

  drawSecurityBackground(doc, w, h);
  drawGlobalStructure(doc, w, h, isCopy);
  drawHeaderSection(doc, w, center);
  drawTitleSection(doc, w, certificate, isCopy);
  drawBodyNarrative(doc, w, certificate);
  drawJudgmentSection(doc, w, certificate);
  await drawFooterSection(doc, w, h, certificate, center);

  const cleanName = certificate.childLastName.replace(/[^a-zA-Z0-9]/g, '_');
  const typeLabel = isCopy ? 'COPIE' : 'ORIGINAL';
  doc.save(`ACTE_NAISSANCE_${cleanName}_${certificate.registrationNumber}_${typeLabel}.pdf`);
};
