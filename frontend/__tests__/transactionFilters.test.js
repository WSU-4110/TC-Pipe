import {
    RiskFilterStrategy,
    SearchFilterStrategy,
    StageFilterStrategy,
    TransactionFilter
} from '../src/assets/transactionFilters.js';
import { autoRisk, daysToClose } from '../src/assets/transactionUtils.js';

const deals = [
    {
        fileID: 'TC-100',
        propertyAddress: '12 Oak Street',
        stage: 'under contract',
        riskLevel: 'High'
    },
    {
        fileID: 'TC-200',
        propertyAddress: '34 Pine Avenue',
        stage: 'active',
        riskLevel: 'Low'
    }
];

describe('transaction filtering strategies', () => {
    test('SearchFilterStrategy filters by File ID or address', () => {
        const strategy = new SearchFilterStrategy();

        expect(strategy.filter(deals, ' tc-100 ')).toEqual([deals[0]]);
        expect(strategy.filter(deals, 'pine avenue')).toEqual([deals[1]]);
        expect(strategy.filter(deals, '')).toEqual(deals);
    });

    test('StageFilterStrategy filters by normalized transaction stage', () => {
        const strategy = new StageFilterStrategy();

        expect(strategy.filter(deals, 'under-contract')).toEqual([deals[0]]);
        expect(strategy.filter(deals, '')).toEqual(deals);
    });

    test('RiskFilterStrategy filters by the saved risk level', () => {
        const strategy = new RiskFilterStrategy();

        expect(strategy.filter(deals, 'high')).toEqual([deals[0]]);
        expect(strategy.filter(deals, '')).toEqual(deals);
    });

    test('RiskFilterStrategy calculates risk when a deal has no saved risk level', () => {
        const strategy = new RiskFilterStrategy();
        const deal = {
            closingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            titleClear: false,
            insuranceConfirmed: false
        };

        expect(strategy.filter([deal], 'high')).toEqual([deal]);
    });

    test('TransactionFilter applies search, stage, and risk filters together', () => {
        const filter = new TransactionFilter([
            new SearchFilterStrategy(),
            new StageFilterStrategy(),
            new RiskFilterStrategy()
        ]);

        expect(filter.applyFilters(deals, {
            searchQuery: 'oak',
            stageFilter: 'under-contract',
            riskFilter: 'high'
        })).toEqual([deals[0]]);
        expect(filter.applyFilters(deals, {
            searchQuery: '',
            stageFilter: '',
            riskFilter: ''
        })).toEqual(deals);
    });
});

describe('transaction utilities', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('autoRisk marks a near-closing transaction with multiple incomplete milestones as high risk', () => {
        const closingDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
        const transaction = {
            closingDate,
            earnestMoneyReceived: true,
            inspectionComplete: true,
            appraisalReceived: true,
            titleClear: false,
            insuranceConfirmed: false,
            clearToCloseConfirmed: true
        };

        expect(autoRisk(transaction)).toBe('High');
    });

    test('autoRisk returns medium and low risk for less urgent transactions', () => {
        const milestones = {
            earnestMoneyReceived: true,
            inspectionComplete: true,
            appraisalReceived: true,
            titleClear: false,
            insuranceConfirmed: true,
            clearToCloseConfirmed: true
        };
        const mediumRiskDeal = {
            ...milestones,
            closingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
        };
        const lowRiskDeal = {
            ...milestones,
            closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        expect(autoRisk(mediumRiskDeal)).toBe('Medium');
        expect(autoRisk(lowRiskDeal)).toBe('Low');
    });

    test('daysToClose returns the rounded-up days remaining and a dash when no date is set', () => {
        const closingDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

        expect(daysToClose(closingDate)).toBe(4);
        expect(daysToClose('')).toBe('—');
    });
});
