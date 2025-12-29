import React from "react";

interface AnalysisSummaryProps {
    positive: number;
    negative: number;
    neutral: number;
}

const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({ positive, negative, neutral }) => {
    const total = positive + negative + neutral;
    const getWidth = (val: number) => `${(val / total) * 100}%`;

    return (
        <div className="bg-gray-800 p-4 rounded flex-1 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">AI Analysis Summary</h3>
            <p>Sentiment: Positive ({positive}%)</p>
            <p>Negative ({negative}%) Neutral ({neutral}%)</p>
            <div className="flex gap-2 h-24 mt-2 bg-gray-700 rounded overflow-hidden">
                <div className="bg-green-500" style={{ width: getWidth(positive) }} />
                <div className="bg-red-500" style={{ width: getWidth(negative) }} />
                <div className="bg-blue-500" style={{ width: getWidth(neutral) }} />
            </div>
        </div>
    );
};

export default AnalysisSummary;
