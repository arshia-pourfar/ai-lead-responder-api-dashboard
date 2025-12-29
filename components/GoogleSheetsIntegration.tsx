import React from "react";

interface SheetEntry {
    date: string;
    sender: string;
    subject: string;
    response: string;
    status: string;
}

interface GoogleSheetsIntegrationProps {
    entries: SheetEntry[];
}

const GoogleSheetsIntegration: React.FC<GoogleSheetsIntegrationProps> = ({ entries }) => {
    return (
        <div className="bg-gray-800 p-4 rounded flex-1 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Google Sheets Integration</h3>
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="border-b border-gray-600">
                        <th>Date</th>
                        <th>Sender</th>
                        <th>Subject</th>
                        <th>Response</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((e, i) => (
                        <tr key={i} className="border-b border-gray-700">
                            <td>{e.date}</td>
                            <td>{e.sender}</td>
                            <td>{e.subject}</td>
                            <td>{e.response}</td>
                            <td>{e.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button className="mt-2 bg-blue-500 p-2 rounded hover:bg-blue-600">
                View Full Spreadsheet
            </button>
            <p className="text-gray-400 text-xs mt-1">Sheet Name: Email_Log 2024</p>
        </div>
    );
};

export default GoogleSheetsIntegration;
