import React from "react";

interface Response {
    time: string;
    to: string;
    subject: string;
    status: string;
}

interface OutgoingResponsesProps {
    responses: Response[];
}

const OutgoingResponses: React.FC<OutgoingResponsesProps> = ({ responses }) => {
    return (
        <div className="bg-gray-800 p-4 rounded flex-1 flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Outgoing Responses</h3>
            <ul className="flex flex-col gap-2">
                {responses.map((r, i) => (
                    <li key={i} className="flex justify-between p-3 bg-gray-700 rounded items-center">
                        <div className="flex flex-col">
                            <span className="text-sm">{r.to} | {r.subject}</span>
                            <span className="text-xs text-gray-300">{r.time}</span>
                        </div>
                        <button className="text-green-400 text-xl">✈️</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OutgoingResponses;
