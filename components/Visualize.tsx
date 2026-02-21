import React, { useMemo } from 'react';
import { Expense, CustomCurrency } from '../types';
import LineChartMonthly from './charts/LineChartMonthly';
import DonutChartCategories from './charts/DonutChartCategories';
import BudgetProgress from './charts/BudgetProgress';

interface VisualizeProps {
    expenses: Expense[];
    budget: number;
    budgetCurrency: string;
    customCurrencies: CustomCurrency[];
    getCurrencySymbol: (code: string) => string;
}

const Visualize: React.FC<VisualizeProps> = ({
    expenses,
    budget,
    budgetCurrency,
    customCurrencies,
    getCurrencySymbol,
}) => {
    // Calculate total spent in budget currency
    const totalInBudgetCurrency = useMemo(
        () =>
            expenses
                .filter((ex) => (ex.currency || 'INR') === budgetCurrency)
                .reduce((sum, ex) => sum + ex.amount, 0),
        [expenses, budgetCurrency]
    );

    return (
        <div className="space-y-6 pb-6">
            {/* Page Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Analytics</h2>
                <p className="text-muted-foreground">
                    Visualize your spending patterns and track your budget
                </p>
            </div>

            {/* Budget Overview Card */}
            {budget > 0 && (
                <div className="fintech-card soft-shadow p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                        Budget Overview
                    </h3>
                    <BudgetProgress
                        budget={budget}
                        spent={totalInBudgetCurrency}
                        currency={budgetCurrency}
                        getCurrencySymbol={getCurrencySymbol}
                    />
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6">
                {/* Spending Trend */}
                <div className="fintech-card soft-shadow p-6 animate-fadeIn">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                        Daily Spending Trend
                    </h3>
                    <LineChartMonthly expenses={expenses} currency={budgetCurrency} />
                </div>

                {/* Category Distribution */}
                <div className="fintech-card soft-shadow p-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                        Category Distribution
                    </h3>
                    <DonutChartCategories expenses={expenses} currency={budgetCurrency} />
                </div>
            </div>

            {/* Empty State */}
            {expenses.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Data Yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Add some expenses to see your spending analytics
                    </p>
                </div>
            )}
        </div>
    );
};

export default Visualize;
