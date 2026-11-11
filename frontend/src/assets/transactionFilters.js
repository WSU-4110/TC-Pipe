
/* =====================================
   STRATEGY DESIGN PATTERN
   TC Pipeline Tracker
===================================== */

// Strategy 1: Search by File ID or Address
class SearchFilterStrategy {

    filter(deals, searchQuery) {

        if (!searchQuery) return deals;

        const query = searchQuery.toLowerCase().trim();

        return deals.filter(deal =>
            (deal.fileID || "").toLowerCase().includes(query) ||
            (deal.propertyAddress || "").toLowerCase().includes(query)
        );
    }
}


// Strategy 2: Filter by Transaction Stage
class StageFilterStrategy {

    filter(deals, stageFilter) {

        if (!stageFilter) return deals;

        return deals.filter(deal => {

            const stage = (deal.stage || "active")
                .toLowerCase()
                .replace(/[\s_]+/g, "-");

            return stage === stageFilter;
        });
    }
}


// Strategy 3: Filter by Risk Level
class RiskFilterStrategy {

    filter(deals, riskFilter) {

        if (!riskFilter) return deals;

        return deals.filter(deal => {

            const risk = (deal.riskLevel || deal.risk || "low")
                .toLowerCase();

            return risk === riskFilter;
        });
    }
}


// Context Class: Manages the filtering strategies
class TransactionFilter {

    constructor(strategies) {
        this.strategies = strategies;
    }

    applyFilters(deals, filters) {

        return this.strategies.reduce(
            (result, strategy) => {

                if (strategy instanceof SearchFilterStrategy) {
                    return strategy.filter(result, filters.searchQuery);
                }

                if (strategy instanceof StageFilterStrategy) {
                    return strategy.filter(result, filters.stageFilter);
                }

                if (strategy instanceof RiskFilterStrategy) {
                    return strategy.filter(result, filters.riskFilter);
                }

                return result;
            },
            deals
        );
    }
}
