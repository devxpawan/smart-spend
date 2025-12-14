import Expense from "../models/Expense.js";
import Income from "../models/Income.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Check if GEMINI_KEY is available
if (!process.env.GEMINI_KEY) {
  console.warn("GEMINI_KEY not found in environment variables. AI insights will be disabled.");
}

const genAI = process.env.GEMINI_KEY ? new GoogleGenerativeAI(process.env.GEMINI_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

class InsightsService {
  // Analyze spending patterns for unusual behavior
  async analyzeSpendingPatterns(userId, months = 3) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - months);

      // Get user's expenses and income for the analysis period
      const expenses = await Expense.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 });

      const income = await Income.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 });

      if (expenses.length === 0) {
        return {
          unusualSpending: [],
          insights: [],
          summary: "Not enough data to analyze spending patterns"
        };
      }

      // Analyze spending by category and time period
      const categoryAnalysis = this.analyzeByCategory(expenses);
      const monthlyAnalysis = this.analyzeMonthlyTrends(expenses);
      const unusualPatterns = this.detectUnusualPatterns(expenses, categoryAnalysis);

      // Generate AI-powered insights
      const aiInsights = await this.generateAIInsights(expenses, income, categoryAnalysis);

      return {
        unusualSpending: unusualPatterns,
        insights: aiInsights,
        categoryAnalysis,
        monthlyAnalysis,
        summary: this.generateSummary(unusualPatterns, categoryAnalysis)
      };
    } catch (error) {
      console.error("Error in analyzeSpendingPatterns:", error);
      throw new Error("Failed to analyze spending patterns");
    }
  }

  // Analyze spending by category
  analyzeByCategory(expenses) {
    const categoryData = {};
    
    expenses.forEach(expense => {
      const category = expense.category;
      const month = expense.date.getMonth();
      const year = expense.date.getFullYear();
      const monthKey = `${year}-${month}`;
      
      if (!categoryData[category]) {
        categoryData[category] = {
          totalAmount: 0,
          count: 0,
          monthlyData: {},
          averageAmount: 0
        };
      }
      
      categoryData[category].totalAmount += expense.amount;
      categoryData[category].count += 1;
      
      if (!categoryData[category].monthlyData[monthKey]) {
        categoryData[category].monthlyData[monthKey] = {
          amount: 0,
          count: 0
        };
      }
      
      categoryData[category].monthlyData[monthKey].amount += expense.amount;
      categoryData[category].monthlyData[monthKey].count += 1;
    });
    
    // Calculate averages
    Object.keys(categoryData).forEach(category => {
      const data = categoryData[category];
      data.averageAmount = data.totalAmount / data.count;
      
      // Calculate monthly averages
      const monthlyValues = Object.values(data.monthlyData).map(m => m.amount);
      data.monthlyAverage = monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length;
    });
    
    return categoryData;
  }

  // Analyze monthly spending trends
  analyzeMonthlyTrends(expenses) {
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const month = expense.date.getMonth();
      const year = expense.date.getFullYear();
      const monthKey = `${year}-${month}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          totalAmount: 0,
          count: 0,
          categories: {}
        };
      }
      
      monthlyData[monthKey].totalAmount += expense.amount;
      monthlyData[monthKey].count += 1;
      
      const category = expense.category;
      if (!monthlyData[monthKey].categories[category]) {
        monthlyData[monthKey].categories[category] = 0;
      }
      monthlyData[monthKey].categories[category] += expense.amount;
    });
    
    return monthlyData;
  }

  // Detect unusual spending patterns
  detectUnusualPatterns(expenses, categoryAnalysis) {
    const unusualPatterns = [];
    
    // Get current month and previous month data
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthKey = `${currentYear}-${currentMonth}`;
    const previousMonthKey = `${previousYear}-${previousMonth}`;
    
    Object.keys(categoryAnalysis).forEach(category => {
      const categoryData = categoryAnalysis[category];
      const currentMonthData = categoryData.monthlyData[currentMonthKey];
      const previousMonthData = categoryData.monthlyData[previousMonthKey];
      
      if (currentMonthData && previousMonthData) {
        const currentAmount = currentMonthData.amount;
        const previousAmount = previousMonthData.amount;
        
        // Check for significant increase (more than 50%)
        if (previousAmount > 0 && (currentAmount / previousAmount) > 1.5) {
          const increasePercentage = Math.round(((currentAmount - previousAmount) / previousAmount) * 100);
          
          unusualPatterns.push({
            type: "significant_increase",
            category,
            currentAmount,
            previousAmount,
            increasePercentage,
            message: `You spent ${increasePercentage}% more on ${category} this month compared to last month`,
            severity: increasePercentage > 100 ? "high" : "medium"
          });
        }
        
        // Check for unusually large single expenses
        const largeExpenses = expenses.filter(e => 
          e.category === category && 
          e.date.getMonth() === currentMonth &&
          e.amount > categoryData.averageAmount * 2
        );
        
        largeExpenses.forEach(expense => {
          unusualPatterns.push({
            type: "large_expense",
            category,
            amount: expense.amount,
            description: expense.description,
            date: expense.date,
            message: `Unusually large ${category} expense: $${expense.amount.toFixed(2)} for "${expense.description}"`,
            severity: expense.amount > categoryData.averageAmount * 3 ? "high" : "medium"
          });
        });
      }
    });
    
    return unusualPatterns.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // Generate AI-powered insights and tips
  async generateAIInsights(expenses, income, categoryAnalysis) {
    // Check if AI is available
    if (!model) {
      console.log("AI model not available, using basic insights");
      return this.generateBasicInsights(expenses, income, categoryAnalysis);
    }

    try {
      // Prepare data for AI analysis
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
      
      // Get top spending categories
      const topCategories = Object.entries(categoryAnalysis)
        .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)
        .slice(0, 3)
        .map(([category, data]) => ({
          category,
          amount: data.totalAmount,
          percentage: Math.round((data.totalAmount / totalExpenses) * 100)
        }));
      
      const prompt = `
        Based on the following financial data, provide personalized savings tips and educational insights:
        
        Total Monthly Income: $${totalIncome.toFixed(2)}
        Total Monthly Expenses: $${totalExpenses.toFixed(2)}
        Savings Rate: ${savingsRate.toFixed(1)}%
        
        Top Spending Categories:
        ${topCategories.map(cat => `- ${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage}%)`).join('\n')}
        
        Please provide:
        1. 3 personalized savings tips based on spending patterns
        2. 1 educational financial fact relevant to their situation
        3. 1 recommendation for improving their financial health
        
        Format the response as JSON with this structure:
        {
          "savingsTips": [
            {"tip": "specific actionable tip", "category": "relevant category", "potentialSavings": "estimated monthly savings"}
          ],
          "educationalFact": {"fact": "interesting financial fact", "relevance": "how it applies to user"},
          "recommendation": {"action": "specific recommendation", "impact": "expected outcome"}
        }
        
        Keep tips practical and actionable. Focus on realistic savings opportunities.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiData = JSON.parse(response.text());
      
      return aiData;
    } catch (error) {
      console.error("Error generating AI insights:", error);
      // Fallback to basic insights if AI fails
      return this.generateBasicInsights(expenses, income, categoryAnalysis);
    }
  }

  // Generate basic insights without AI
  generateBasicInsights(expenses, income, categoryAnalysis) {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
    
    const topCategory = Object.entries(categoryAnalysis)
      .sort(([,a], [,b]) => b.totalAmount - a.totalAmount)[0];
    
    return {
      savingsTips: [
        {
          tip: `Consider reducing ${topCategory[0]} expenses by 20% to save $${(topCategory[1].totalAmount * 0.2).toFixed(2)} monthly`,
          category: topCategory[0],
          potentialSavings: `$${(topCategory[1].totalAmount * 0.2).toFixed(2)}`
        },
        {
          tip: "Review subscriptions and recurring expenses for potential savings",
          category: "General",
          potentialSavings: "Varies"
        },
        {
          tip: "Set up automatic transfers to savings account for better financial discipline",
          category: "Savings",
          potentialSavings: "Builds emergency fund"
        }
      ],
      educationalFact: {
        fact: "The 50/30/20 rule suggests allocating 50% to needs, 30% to wants, and 20% to savings",
        relevance: "This can help you create a balanced budget"
      },
      recommendation: {
        action: "Track your spending daily to identify areas for improvement",
        impact: "Better awareness leads to smarter spending decisions"
      }
    };
  }

  // Generate summary of insights
  generateSummary(unusualPatterns, categoryAnalysis) {
    const highSeverityPatterns = unusualPatterns.filter(p => p.severity === "high");
    const totalCategories = Object.keys(categoryAnalysis).length;
    
    if (highSeverityPatterns.length > 0) {
      return `⚠️ Found ${highSeverityPatterns.length} unusual spending patterns that need attention`;
    } else if (unusualPatterns.length > 0) {
      return `📊 Detected ${unusualPatterns.length} spending patterns to monitor`;
    } else {
      return `✅ Your spending patterns look normal across ${totalCategories} categories`;
    }
  }
}

export default new InsightsService();