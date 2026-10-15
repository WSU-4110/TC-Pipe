document.getElementById('analyzeBtn').addEventListener('click', function() {
    const purchasePrice = parseFloat(document.getElementById('purchasePriceAnalyzer').value);
    const totalCashInvested = parseFloat(document.getElementById('totalCashInvested').value);
    const monthlyRent = parseFloat(document.getElementById('monthlyRent').value);
    const vacancyRate = parseFloat(document.getElementById('vacancyRate').value) / 100;
    const propertyTaxes = parseFloat(document.getElementById('propertyTaxes').value) || 0;
    const insurance = parseFloat(document.getElementById('insurance').value) || 0;
    const propertyManagement = parseFloat(document.getElementById('propertyManagement').value) / 100;
    const maintenance = parseFloat(document.getElementById('maintenance').value) || 0;
    const otherExpenses = parseFloat(document.getElementById('otherExpenses').value) || 0;
    const annualMortgage = parseFloat(document.getElementById('annualMortgage').value) || 0;

    // calculated fields
    const annualGrossRent = monthlyRent * 12;
    const effectiveGrossIncome = annualGrossRent * (1 - vacancyRate);
    const managementCost = effectiveGrossIncome * propertyManagement;
    const totalExpenses = propertyTaxes + insurance + managementCost + maintenance + otherExpenses;
    const noi = effectiveGrossIncome - totalExpenses;
    const annualCashflow = noi - annualMortgage;

    // update auto calculated display fields
    document.getElementById('annualGrossRent').value = annualGrossRent.toFixed(2);
    document.getElementById('effectiveGrossIncome').value = effectiveGrossIncome.toFixed(2);
    document.getElementById('totalExpenses').value = totalExpenses.toFixed(2);
    document.getElementById('noi').value = noi.toFixed(2);
    document.getElementById('annualCashflow').value = annualCashflow.toFixed(2);

    // CRE formulas
    const grm = purchasePrice / annualGrossRent;
    const grossYield = annualGrossRent / purchasePrice * 100;
    const capRate = noi / purchasePrice * 100;
    const coc = annualCashflow / totalCashInvested * 100;

        // display results
    document.getElementById('grmResult').innerHTML = grm.toFixed(2);
    document.getElementById('grossYieldResult').innerHTML = grossYield.toFixed(2) + '%';
    document.getElementById('capRateResult').innerHTML = capRate.toFixed(2) + '%';
    document.getElementById('cocResult').innerHTML = coc.toFixed(2) + '%';
});