// Utility functions (synchronous so no server needed)

export function daysToClose(closingDate) {
    if (!closingDate) return '—';
    const today = new Date();
    const closing = new Date(closingDate);
    const diff = Math.ceil((closing - today) / (1000 * 60 * 60 * 24));
    return diff;
}

export function autoRisk(transaction) {
    const days = daysToClose(transaction.closingDate);
    const milestones = [
        transaction.earnestMoneyReceived,
        transaction.inspectionComplete,
        transaction.appraisalReceived,
        transaction.titleClear,
        transaction.insuranceConfirmed,
        transaction.clearToCloseConfirmed
    ];
    const incomplete = milestones.filter(m => !m).length;

    if (days !== '—' && days <= 7 && incomplete >= 2) return 'High';
    if (days !== '—' && days <= 14 && incomplete >= 1) return 'Medium';
    return 'Low';
}
